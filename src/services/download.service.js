import { downloadVideoYtDlp, downloadAudioYtDlp } from "../downloaders/yt-dlp.js";
import { createMediaPaths } from "../core/media-names.js";

export async function downloadMedia({ url, mode, format }) {
    // 1) normalisation protocole
    const normalized = normalizeUrl(url);
    // 2) nettoyage spécifique YouTube (supprimer ?list=... etc.)
    const sanitizedUrl = sanitizeYoutubeUrl(normalized);

    const host = getHostFromUrl(sanitizedUrl);
    const site = detectSite(host);
    const { finalFormat, filename, paths } = await createMediaPaths({
        url: sanitizedUrl,
        site,
        mode,
        format
    });

    switch (site) {
        case "tiktok":
        case "youtube":
        case "default":
        default:
            await downloadWithYtDlp({
                url: sanitizedUrl,
                mode,
                format: finalFormat,
                paths
            });
            return buildResult(paths.outputPath, "yt-dlp", mode, finalFormat, filename);
    }
}

// Ajoute https:// si l'utilisateur met juste "youtu.be/xxxx"
function normalizeUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    if (!/^https?:\/\//i.test(rawUrl)) {
        return "https://" + rawUrl;
    }
    return rawUrl;
}

// Supprime list/index/start_radio sur les URL YouTube/youtu.be
function sanitizeYoutubeUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.toLowerCase();
        if (
            host.includes("youtube.com") ||
            host.includes("youtu.be")
        ) {
            // on ne veut qu'une seule vidéo, pas la playlist/mix
            u.searchParams.delete("list");
            u.searchParams.delete("index");
            u.searchParams.delete("start_radio");
            return u.toString();
        }
        return rawUrl;
    } catch {
        return rawUrl;
    }
}

function getHostFromUrl(url) {
    try {
        const u = new URL(url);
        return u.hostname.toLowerCase();
    } catch {
        return null;
    }
}

function detectSite(host) {
    if (!host) return "default";
    if (host.includes("tiktok.com")) return "tiktok";
    if (host.includes("youtube.com") || host.includes("youtu.be")) return "youtube";
    return "default";
}

async function downloadWithYtDlp({ url, mode, format, paths }) {
    if (mode === "video") {
        await downloadVideoYtDlp({ url, paths });
    } else if (mode === "audio") {
        await downloadAudioYtDlp({ url, format, paths });
    } else {
        throw new Error("Mode inconnu: " + mode);
    }
}

function buildResult(outputPath, engine, mode, format, filename) {
    return {
        filePath: outputPath,
        downloadUrl: "/file?path=" + encodeURIComponent(outputPath),
        filename,
        engine,
        mode,
        format
    };
}
