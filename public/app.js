// public/app.js

const urlInput = document.getElementById("url");
const stepSpan = document.getElementById("step");
const barInner = document.getElementById("bar");
const resultPre = document.getElementById("result");
const actionBtn = document.getElementById("downloadBtnAction");
const downloadLink = document.getElementById("downloadBtn");
const downloadLabel = document.getElementById("downloadLabel");

// ==============================
// SSE pour la progression
// ==============================

const evtSource = new EventSource("/progress");

evtSource.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        stepSpan.textContent = data.step || "Inconnu";
        const pct = data.percent || 0;
        barInner.style.width = pct + "%";
    } catch (e) {
        console.error("Erreur parse SSE:", e);
    }
};

// ==============================
// Helpers
// ==============================

function getSelectedMode() {
    const radios = document.querySelectorAll('input[name="mode"]');
    for (const r of radios) {
        if (r.checked) return r.value;
    }
    return "video";
}

function normalizeUrlClient(raw) {
    if (!raw) return raw;
    if (!/^https?:\/\//i.test(raw)) {
        return "https://" + raw;
    }
    return raw;
}

function detectSite(rawUrl) {
    try {
        const normalized = normalizeUrlClient(rawUrl);
        const u = new URL(normalized);
        const host = u.hostname.toLowerCase();

        if (host.includes("youtube.com") || host.includes("youtu.be")) {
            return "youtube";
        }
        if (host.includes("tiktok.com")) {
            return "tiktok";
        }

        // fallback: tu peux choisir de refuser ou de router vers YouTube
        return "youtube";
    } catch {
        return "youtube";
    }
}

function getEndpointForSite(site) {
    switch (site) {
        case "youtube":
            return "/download/youtube";
        case "tiktok":
            return "/download/tiktok";
        default:
            return "/download/youtube";
    }
}

// ==============================
// Click sur "Télécharger"
// ==============================

actionBtn.addEventListener("click", async () => {
    let url = urlInput.value.trim();
    const mode = getSelectedMode();

    if (!url) {
        alert("Merci de saisir une URL.");
        return;
    }

    const site = detectSite(url);
    const endpoint = getEndpointForSite(site);

    url = normalizeUrlClient(url);

    const format = mode === "audio" ? "mp3" : "mp4";

    actionBtn.disabled = true;
    resultPre.textContent = "";
    downloadLink.style.display = "none";
    stepSpan.textContent = "Préparation...";
    barInner.style.width = "0%";

    try {
        const resp = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                url,
                mode,
                format
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "Erreur HTTP " + resp.status);
        }

        const data = await resp.json();

        resultPre.textContent = JSON.stringify(data, null, 2);

        if (data.downloadUrl) {
            // Met à jour le lien visible
            downloadLink.href = data.downloadUrl;
            downloadLink.style.display = "inline-block";
            downloadLabel.textContent =
                mode === "audio" ? "Télécharger l'audio" : "Télécharger la vidéo";

            // Lance automatiquement le téléchargement
            // (simulateur de clic sur le lien avec l'attribut download)
            setTimeout(() => {
                downloadLink.click();
            }, 100);
        } else {
            downloadLink.style.display = "none";
        }
    } catch (e) {
        console.error(e);
        resultPre.textContent = "Erreur : " + e.message;
    } finally {
        actionBtn.disabled = false;
    }
});
