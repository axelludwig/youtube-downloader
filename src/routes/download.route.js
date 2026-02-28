// src/routes/download.route.js
import { Router } from "express";
import path from "path";
import { v4 as uuidv4 } from "uuid";

import { DOWNLOAD_DIR, MERGED_DIR } from "../config/dirs.js";
import { downloadYoutubeVideo, downloadYoutubeAudio } from "../downloaders/youtube.js";
import { downloadTikTokVideo, downloadTikTokAudio } from "../downloaders/tiktok.js";
import { downloadInstagramVideo, downloadInstagramAudio } from "../downloaders/instagram.js";
import { broadcastProgress, setBatchContext } from "../core/progress-sse.js";


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

        broadcastProgress("✓ Téléchargement YouTube terminé", 100);

        return res.json({
            file: paths.outputPath,
            downloadUrl: "/file?path=" + encodeURIComponent(paths.outputPath),
            site: "youtube",
            mode,
            format: finalFormat
        });
    } catch (err) {
        console.error("Erreur /download/youtube :", err);
        broadcastProgress("✗ Erreur YouTube", 0);
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

        broadcastProgress("✓ Téléchargement TikTok terminé", 100);

        return res.json({
            file: paths.outputPath,
            downloadUrl: "/file?path=" + encodeURIComponent(paths.outputPath),
            site: "tiktok",
            mode,
            format: finalFormat
        });
    } catch (err) {
        console.error("Erreur /download/tiktok :", err);
        broadcastProgress("✗ Erreur TikTok", 0);
        return res.status(500).json({
            error: "Erreur lors du traitement TikTok",
            details: String(err)
        });
    }
});

// --------- INSTAGRAM ---------

router.post("/download/instagram", async (req, res) => {
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
            await downloadInstagramVideo({ url, paths });
        } else {
            await downloadInstagramAudio({ url, format: finalFormat, paths });
        }

        broadcastProgress("✓ Téléchargement Instagram terminé", 100);

        return res.json({
            file: paths.outputPath,
            downloadUrl: "/file?path=" + encodeURIComponent(paths.outputPath),
            site: "instagram",
            mode,
            format: finalFormat
        });
    } catch (err) {
        console.error("Erreur /download/instagram :", err);

        const msg = String(err);

        broadcastProgress("✗ Erreur Instagram", 0);

        // Cas 1 : contenu restreint par Instagram (ton exemple)
        if (msg.includes("This content may be inappropriate")) {
            return res.status(403).json({
                error: "Contenu restreint sur Instagram : cookie plus valide",
                details:
                    "Instagram indique que ce contenu peut être inapproprié ou n'est pas disponible pour tous les publics. " +
                    "Même connecté avec tes cookies, il n'est pas autorisé d'y accéder via cet outil."
            });
        }

        // Cas 2 : problème de session / cookies Instagram
        if (msg.includes("No csrf token set by Instagram API")) {
            return res.status(401).json({
                error: "Session Instagram invalide",
                details:
                    "Instagram n'accepte plus les cookies fournis (csrf/session). " +
                    "Réexporte tes cookies Instagram et remplace le fichier instagram.txt."
            });
        }

        // Fallback générique
        return res.status(500).json({
            error: "Erreur lors du traitement Instagram",
            details: msg
        });
    }
});

// --------- BATCH DOWNLOAD ---------

router.post("/download/batch", async (req, res) => {
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
        return res.status(400).json({
            error: "Paramètres invalides",
            details: "Envoyez un tableau non-vide 'urls'"
        });
    }

    const results = {
        totalVideos: urls.length,
        successful: 0,
        failed: 0,
        files: [],
        errors: []
    };

    for (let i = 0; i < urls.length; i++) {
        const url = normalizeUrl(urls[i]);
        const site = detectSite(url);

        broadcastProgress({
            step: `Vidéo ${i + 1}/${urls.length} : détection et téléchargement...`,
            percent: Math.round((i / urls.length) * 100),
            videoIndex: i,
            videoStatus: "downloading"
        });

        // Définir le contexte du batch pour que les downloaders gardent videoIndex/videoStatus
        setBatchContext({ videoIndex: i, videoStatus: "downloading" });

        try {
            let finalUrl = url;
            let paths;
            const mode = "video"; // Toujours en vidéo pour batch

            // YouTube: nettoyer les paramètres de playlist
            if (site === "youtube") {
                finalUrl = sanitizeYoutubeUrl(url);
            }

            const { paths: newPaths } = createPaths(mode, "mp4");
            paths = newPaths;

            // Télécharger selon le site
            if (site === "youtube") {
                await downloadYoutubeVideo({ url: finalUrl, paths });
            } else if (site === "tiktok") {
                await downloadTikTokVideo({ url: finalUrl, paths });
            } else if (site === "instagram") {
                await downloadInstagramVideo({ url: finalUrl, paths });
            } else {
                throw new Error("Site non reconnue");
            }

            results.successful++;
            results.files.push({
                index: i,
                url: url,
                site: site,
                file: paths.outputPath,
                downloadUrl: "/file?path=" + encodeURIComponent(paths.outputPath)
            });

            broadcastProgress({
                step: `Vidéo ${i + 1}/${urls.length} : ✓ Terminée`,
                percent: Math.round(((i + 1) / urls.length) * 100),
                videoIndex: i,
                videoStatus: "completed"
            });

        } catch (err) {
            results.failed++;
            const errorMsg = String(err);
            results.errors.push({
                urlIndex: i,
                url: url,
                error: errorMsg
            });

            broadcastProgress({
                step: `Vidéo ${i + 1}/${urls.length} : ✗ Erreur`,
                percent: Math.round(((i + 1) / urls.length) * 100),
                videoIndex: i,
                videoStatus: "error",
                error: errorMsg
            });

            console.error(`Erreur batch vidéo ${i + 1}:`, err);
        }
    }

    // Nettoyer le contexte du batch
    setBatchContext(null);

    // Envoyer le message final de completion
    broadcastProgress({
        step: "✓ Téléchargement batch terminé",
        percent: 100,
        videoStatus: "batch_completed"
    });

    return res.json(results);
});


export default router;
