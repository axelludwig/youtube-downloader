// src/downloaders/redgifs.js
import fs from "fs";
import { YTDLP_PATH, FFMPEG_PATH } from "../config/paths.js";
import { execProgress } from "../core/exec-progress.js";
import { broadcastProgress } from "../core/progress-sse.js";

// --------- VIDEO (RedGifs) ---------
export async function downloadRedgifsVideo({ url, paths }) {
    const { outputPath } = paths;

    broadcastProgress("Téléchargement vidéo RedGifs", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-f", "best",
            "-o", outputPath,
            url
        ],
        "Téléchargement vidéo RedGifs"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier vidéo RedGifs introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé RedGifs", 100);
}

// --------- AUDIO (RedGifs) ---------
export async function downloadRedgifsAudio({ url, format, paths }) {
    const { outputPath } = paths;
    const audioFormat = format || "mp3";

    broadcastProgress("Téléchargement audio RedGifs", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-x",
            "--audio-format", audioFormat,
            "--ffmpeg-location", FFMPEG_PATH,
            "-o", outputPath,
            url
        ],
        "Téléchargement audio RedGifs"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier audio RedGifs introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé RedGifs", 100);
}
