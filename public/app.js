const evt = new EventSource("/progress");

evt.onmessage = (e) => {
    const data = JSON.parse(e.data);
    document.getElementById("step").textContent = data.step;
    document.getElementById("bar").style.width = data.percent + "%";
};

/**
 * Normalise différents formats d’URL YouTube (ou un simple ID)
 * vers un lien du type https://www.youtube.com/watch?v=VIDEO_ID
 */
function normalizeYouTubeUrl(input) {
    const trimmed = input.trim();
    if (!trimmed) return null;

    const idRegex = /^[a-zA-Z0-9_-]{11}$/;
    let videoId = null;
    let url;

    // Si ce n’est pas une URL complète mais que c’est un ID
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        if (idRegex.test(trimmed)) {
            return `https://www.youtube.com/watch?v=${trimmed}`;
        }
        // On tente quand même de le parser comme URL après avoir préfixé par https://
        try {
            url = new URL(`https://${trimmed}`);
        } catch {
            return null;
        }
    } else {
        try {
            url = new URL(trimmed);
        } catch {
            return null;
        }
    }

    const host = url.hostname.toLowerCase();

    // youtu.be/<id>
    if (host === "youtu.be") {
        const parts = url.pathname.split("/");
        videoId = parts[1] || null;
    }
    // youtube.com, m.youtube.com, music.youtube.com, www.youtube.com, etc.
    else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
        const pathname = url.pathname;

        // /watch?v=<id>
        if (pathname === "/watch" || pathname === "/watch/") {
            videoId = url.searchParams.get("v");
        }
        // /shorts/<id>
        else if (pathname.startsWith("/shorts/")) {
            const parts = pathname.split("/");
            videoId = parts[2] || null;
        }
        // /embed/<id>
        else if (pathname.startsWith("/embed/")) {
            const parts = pathname.split("/");
            videoId = parts[2] || null;
        }
    } else {
        // Pas un domaine YouTube
        return null;
    }

    if (!videoId || !idRegex.test(videoId)) {
        return null;
    }

    // On conserve éventuellement un paramètre de temps t ou start
    const t = url.searchParams.get("t") || url.searchParams.get("start");
    let normalized = `https://www.youtube.com/watch?v=${videoId}`;
    if (t) {
        normalized += `&t=${encodeURIComponent(t)}`;
    }

    return normalized;
}

async function download() {
    const input = document.getElementById("url");
    const resultEl = document.getElementById("result");
    const rawUrl = input.value;

    resultEl.textContent = "";

    const normalizedUrl = normalizeYouTubeUrl(rawUrl);

    if (!normalizedUrl) {
        resultEl.textContent = "URL YouTube invalide ou non reconnue.";
        return;
    }

    fetch("/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl })
    })
    .then(r => r.json())
    .then(data => {
        resultEl.textContent = JSON.stringify(data, null, 2);

        const btn = document.getElementById("downloadBtn");
        if (data.downloadUrl) {
            btn.href = data.downloadUrl;
            btn.style.display = "inline-block";
        } else {
            btn.style.display = "none";
        }
    })
    .catch(err => {
        resultEl.textContent = "Erreur lors du téléchargement : " + err.toString();
    });
}

document
    .getElementById("downloadBtnAction")
    .addEventListener("click", download);

// Optionnel : lancement au "Enter" dans le champ texte
document
    .getElementById("url")
    .addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            download();
        }
    });
