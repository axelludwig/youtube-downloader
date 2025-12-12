// src/services/download.service.js
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { DOWNLOAD_DIR, MERGED_DIR } from "../config/dirs.js";
import { downloadVideoYtDlp, downloadAudioYtDlp } from "../downloaders/yt-dlp.js";

export async function downloadMedia({ url, mode, format }) {
    // 1) normalisation protocole
    const normalized = normalizeUrl(url);
    // 2) nettoyage spécifique YouTube (supprimer ?list=... etc.)
    const sanitizedUrl = sanitizeYoutubeUrl(normalized);

    const id = uuidv4();

    const defaultFormat = mode === "audio" ? "mp3" : "mp4";
    const finalFormat = format || defaultFormat;

    const baseName = id;

    const paths = {
        videoPath: path.join(DOWNLOAD_DIR, `${baseName}_video.mp4`),
        audioPath: path.join(DOWNLOAD_DIR, `${baseName}_audio.m4a`),
        outputPath: path.join(MERGED_DIR, `${baseName}.${finalFormat}`)
    };

    const host = getHostFromUrl(sanitizedUrl);
    const site = detectSite(host);

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
            return buildResult(paths.outputPath, "yt-dlp", mode, finalFormat);
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

function buildResult(outputPath, engine, mode, format) {
    return {
        filePath: outputPath,
        downloadUrl: "/file?path=" + encodeURIComponent(outputPath),
        engine,
        mode,
        format
    };
}
