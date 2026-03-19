// src/downloaders/x.js
import fs from "fs";
import { YTDLP_PATH, FFMPEG_PATH } from "../config/paths.js";
import { execProgress } from "../core/exec-progress.js";
import { broadcastProgress } from "../core/progress-sse.js";

// --------- VIDEO (X/Twitter) ---------
export async function downloadXVideo({ url, paths }) {
    const { outputPath } = paths;

    broadcastProgress("Téléchargement vidéo X", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-f", "best",
            "-o", outputPath,
            url
        ],
        "Téléchargement vidéo X"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier vidéo X introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé X", 100);
}

// --------- AUDIO (X/Twitter) ---------
export async function downloadXAudio({ url, format, paths }) {
    const { outputPath } = paths;
    const audioFormat = format || "mp3";

    broadcastProgress("Téléchargement audio X", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-x",
            "--audio-format", audioFormat,
            "--ffmpeg-location", FFMPEG_PATH,
            "-o", outputPath,
            url
        ],
        "Téléchargement audio X"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier audio X introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé X", 100);
}
