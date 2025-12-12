// src/routes/download.route.js
import { Router } from "express";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { DOWNLOAD_DIR, MERGED_DIR } from "../config/dirs.js";
import { downloadYoutubeVideo, downloadYoutubeAudio } from "../downloaders/youtube.js";
import { downloadTikTokVideo, downloadTikTokAudio } from "../downloaders/tiktok.js";

const router = Router();

// --------- helpers communs ---------

function createPaths(mode, format) {
    const id = uuidv4();
    const defaultFormat = mode === "audio" ? "mp3" : "mp4";
    const finalFormat = format || defaultFormat;

    const baseName = id;

    return {
        finalFormat,
        paths: {
            videoPath: path.join(DOWNLOAD_DIR, `${baseName}_video.mp4`),
            audioPath: path.join(DOWNLOAD_DIR, `${baseName}_audio.m4a`),
            outputPath: path.join(MERGED_DIR, `${baseName}.${finalFormat}`)
        }
    };
}

function normalizeUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    if (!/^https?:\/\//i.test(rawUrl)) {
        return "https://" + rawUrl;
    }
    return rawUrl;
}

// Supprime list/index/start_radio pour ne garder qu'une vidéo
function sanitizeYoutubeUrl(rawUrl) {
    try {
        const u = new URL(rawUrl);
        const host = u.hostname.toLowerCase();
        if (host.includes("youtube.com") || host.includes("youtu.be")) {
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

// --------- YOUTUBE ---------

router.post("/download/youtube", async (req, res) => {
    let { url, mode, format } = req.body;

    if (!url || !mode) {
        return res.status(400).json({
            error: "Paramètres manquants",
            details: "Les champs 'url' et 'mode' sont obligatoires"
        });
    }

    if (!["audio", "video"].includes(mode)) {
        return res.status(400).json({
            error: "Mode invalide",
            details: "Le champ 'mode' doit être 'audio' ou 'video'"
        });
    }

    // normalisation + nettoyage playlist
    url = sanitizeYoutubeUrl(normalizeUrl(url));

    const { finalFormat, paths } = createPaths(mode, format);

    try {
        if (mode === "video") {
            await downloadYoutubeVideo({ url, paths });
        } else {
            await downloadYoutubeAudio({ url, format: finalFormat, paths });
        }

        return res.json({
            file: paths.outputPath,
            downloadUrl: "/file?path=" + encodeURIComponent(paths.outputPath),
            site: "youtube",
            mode,
            format: finalFormat
        });
    } catch (err) {
        console.error("Erreur /download/youtube :", err);
        return res.status(500).json({
            error: "Erreur lors du traitement YouTube",
            details: String(err)
        });
    }
});

// --------- TIKTOK ---------

router.post("/download/tiktok", async (req, res) => {
    let { url, mode, format } = req.body;

    if (!url || !mode) {
        return res.status(400).json({
            error: "Paramètres manquants",
            details: "Les champs 'url' et 'mode' sont obligatoires"
        });
    }

    if (!["audio", "video"].includes(mode)) {
        return res.status(400).json({
            error: "Mode invalide",
            details: "Le champ 'mode' doit être 'audio' ou 'video'"
        });
    }

    url = normalizeUrl(url);

    const { finalFormat, paths } = createPaths(mode, format);

    try {
        if (mode === "video") {
            await downloadTikTokVideo({ url, paths });
        } else {
            await downloadTikTokAudio({ url, format: finalFormat, paths });
        }

        return res.json({
            file: paths.outputPath,
            downloadUrl: "/file?path=" + encodeURIComponent(paths.outputPath),
            site: "tiktok",
            mode,
            format: finalFormat
        });
    } catch (err) {
        console.error("Erreur /download/tiktok :", err);
        return res.status(500).json({
            error: "Erreur lors du traitement TikTok",
            details: String(err)
        });
    }
});

export default router;
