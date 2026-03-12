// public/app.js

// ==============================
// Gestion du thème (localStorage)
// ==============================

const themeToggle = document.getElementById("themeToggle");
const html = document.documentElement;

// Initialiser le thème au chargement
function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    html.setAttribute("data-theme", savedTheme);
    updateThemeToggleIcon(savedTheme);
}

// Mettre à jour l'icône du bouton
function updateThemeToggleIcon(theme) {
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
}

// Basculer le thème
themeToggle.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeToggleIcon(newTheme);
});

// Initialiser le thème au chargement de la page
initTheme();

const urlsInput = document.getElementById("urlsInput");
const stepSpan = document.getElementById("step");
const barInner = document.getElementById("bar");
const resultPre = document.getElementById("result");
const resultSection = document.getElementById("resultSection");
const actionBtn = document.getElementById("downloadBtnAction");
const pasteBtn = document.getElementById("pasteBtn");
const videosListSection = document.getElementById("videosListSection");
const videosTableBody = document.getElementById("videosTableBody");
const audioOnlyCheckbox = document.getElementById("audioOnlyCheckbox");

// État du batch en cours
let currentBatchState = null;

// ==============================
// SSE pour la progression
// ==============================

const evtSource = new EventSource("/progress");

evtSource.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        // Mise à jour du tableau si batch en cours
        if (currentBatchState && data.videoIndex !== undefined) {
            const videoRow = document.querySelector(`tr[data-video-index="${data.videoIndex}"]`);
            if (videoRow) {
                const statusCell = videoRow.querySelector(".video-status");
                const progressCell = videoRow.querySelector(".video-progress");

                if (data.videoStatus === "downloading" || data.videoStatus === "processing") {
                    statusCell.textContent = "⏳ En cours...";
                    progressCell.textContent = Math.round(data.percent || 0) + "%";
                    statusCell.className = "video-status status-processing";
                } else if (data.videoStatus === "completed") {
                    statusCell.textContent = "✓ Terminée";
                    progressCell.textContent = "100%";
                    statusCell.className = "video-status status-success";
                } else if (data.videoStatus === "error") {
                    statusCell.textContent = "✗ " + (data.error || "Erreur");
                    progressCell.textContent = "—";
                    statusCell.className = "video-status status-error";
                }
            }
        }

        // Mise à jour de la progression globale
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

function normalizeUrlClient(raw) {
    if (!raw) return raw;
    if (!/^https?:\/\//i.test(raw)) {
        return "https://" + raw;
    }
    return raw;
}

function parseUrlsFromTextarea() {
    const text = urlsInput.value.trim();
    if (!text) return [];

    return text.split("\n")
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => normalizeUrlClient(line));
}

function detectSite(rawUrl) {
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.toLowerCase();

        if (host.includes("youtube.com") || host.includes("youtu.be")) {
            return "youtube";
        }
        if (host.includes("tiktok.com")) {
            return "tiktok";
        }
        if (host.includes("instagram.com")) {
            return "instagram";
        }

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
        case "instagram":
            return "/download/instagram";
        default:
            return "/download/youtube";
    }
}

// ==============================
// Affichage du tableau de progression
// ==============================

function displayVideosTable(urls) {
    videosTableBody.innerHTML = "";
    urls.forEach((url, index) => {
        const row = document.createElement("tr");
        row.setAttribute("data-video-index", index);

        const shortUrl = url.length > 50 ? url.substring(0, 50) + "..." : url;

        row.innerHTML = `
            <td>${index + 1}</td>
            <td title="${url}">${shortUrl}</td>
            <td class="video-status status-pending">⏳ En attente</td>
            <td class="video-progress">—</td>
        `;
        videosTableBody.appendChild(row);
    });
    videosListSection.style.display = "block";
}

// ==============================
// Téléchargement du fichier
// ==============================

function triggerDownload(downloadUrl, filename) {
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename || "media";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==============================
// Click sur "Télécharger tout"
// ==============================

actionBtn.addEventListener("click", async () => {
    const urls = parseUrlsFromTextarea();

    if (urls.length === 0) {
        alert("Merci de saisir au moins une URL.");
        return;
    }

    actionBtn.disabled = true;
    resultPre.textContent = "";
    stepSpan.textContent = "Préparation...";
    barInner.style.width = "0%";

    displayVideosTable(urls);

    const mode = audioOnlyCheckbox.checked ? "audio" : "video";

    currentBatchState = {
        totalVideos: urls.length,
        completedVideos: 0,
        failedVideos: 0,
        downloadedFiles: []
    };

    // Lancer le téléchargement batch
    try {
        const resp = await fetch("/download/batch", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                urls: urls,
                mode: mode
            })
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || "Erreur HTTP " + resp.status);
        }

        const data = await resp.json();

        // Télécharger automatiquement les fichiers réussis, en séquence
        if (data.files && data.files.length > 0) {
            for (let i = 0; i < data.files.length; i++) {
                const file = data.files[i];
                const extension = mode === "audio" ? "mp3" : "mp4";
                triggerDownload(file.downloadUrl, `${mode}_${i + 1}.${extension}`);

                // Ajouter un délai entre chaque téléchargement (500ms)
                if (i < data.files.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

        // Afficher un résumé
        let summary = `\nRésumé du téléchargement en masse:\n`;
        summary += `- Mode: ${mode === "audio" ? "Audio seulement (MP3)" : "Vidéo et audio (MP4)"}\n`;
        summary += `- Total: ${data.totalVideos} vidéos\n`;
        summary += `- Réussites: ${data.successful} vidéos\n`;
        summary += `- Erreurs: ${data.failed} vidéos\n`;

        if (data.errors && data.errors.length > 0) {
            summary += `\nErreurs:\n`;
            data.errors.forEach((err, idx) => {
                summary += `  ${idx + 1}. URL ${err.urlIndex + 1}: ${err.error}\n`;
            });
        }

        if (data.files && data.files.length > 0) {
            summary += `\n${data.successful} fichier(s) téléchargé(s) automatiquement`;
        }

        resultPre.textContent = summary;
        resultSection.style.display = "block";
        stepSpan.textContent = "✓ Téléchargement terminé";
        barInner.style.width = "100%";

    } catch (e) {
        console.error(e);
        resultPre.textContent = "Erreur : " + e.message;
        resultSection.style.display = "block";
        stepSpan.textContent = "✗ Erreur";
    } finally {
        actionBtn.disabled = false;
        currentBatchState = null;
    }
});

// ==============================
// Bouton pour coller le contenu du presse-papiers
// ==============================

pasteBtn.addEventListener("click", async () => {
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText) {
            // Si le textarea n'est pas vide, ajouter un saut de ligne
            if (urlsInput.value.trim()) {
                urlsInput.value += "\n" + clipboardText;
            } else {
                urlsInput.value = clipboardText;
            }
            // Focus sur le textarea
            urlsInput.focus();
        }
    } catch (err) {
        console.error("Erreur lors du collage:", err);
        alert("Impossible d'accéder au presse-papiers. Assurez-vous que votre navigateur supporte cette fonctionnalité.");
    }
});
