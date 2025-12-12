// src/downloaders/tiktok.js
import fs from "fs";
import { YTDLP_PATH } from "../config/paths.js";
import { execProgress } from "../core/exec-progress.js";
import { broadcastProgress } from "../core/progress-sse.js";

// --------- VIDEO (TikTok) ---------
export async function downloadTikTokVideo({ url, paths }) {
    const { outputPath } = paths;

    broadcastProgress("Téléchargement vidéo TikTok", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-f", "best",
            "-o", outputPath,
            url
        ],
        "Téléchargement vidéo TikTok"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier vidéo TikTok introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé TikTok", 100);
}

// --------- AUDIO (TikTok) ---------
export async function downloadTikTokAudio({ url, format, paths }) {
    const { outputPath } = paths;
    const audioFormat = format || "mp3";

    broadcastProgress("Téléchargement audio TikTok", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-x",
            "--audio-format", audioFormat,
            "-o", outputPath,
            url
        ],
        "Téléchargement audio TikTok"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier audio TikTok introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé TikTok", 100);
}
