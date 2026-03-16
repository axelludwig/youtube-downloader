// src/downloaders/instagram.js
import fs from "fs";
import { YTDLP_PATH, INSTAGRAM_COOKIES_PATH, FFMPEG_DIR } from "../config/paths.js";
import { execProgress } from "../core/exec-progress.js";
import { broadcastProgress } from "../core/progress-sse.js";

function buildInstagramArgsBase() {
    const args = [];
    if (INSTAGRAM_COOKIES_PATH) {
        args.push("--cookies", INSTAGRAM_COOKIES_PATH);
    }
    return args;
}

// --------- VIDEO (Instagram) ---------
export async function downloadInstagramVideo({ url, paths }) {
    const { outputPath } = paths;

    broadcastProgress("Téléchargement vidéo Instagram", 0);

    const baseArgs = buildInstagramArgsBase();
    const args = [
        ...baseArgs,
        "-o", outputPath,
        url
    ];

    console.log("yt-dlp Instagram VIDEO args:", args);

    await execProgress(
        YTDLP_PATH,
        args,
        "Téléchargement vidéo Instagram"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier vidéo Instagram introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé Instagram", 100);
}

// --------- AUDIO (Instagram) ---------
export async function downloadInstagramAudio({ url, format, paths }) {
    const { outputPath } = paths;
    const audioFormat = format || "mp3";

    broadcastProgress("Téléchargement audio Instagram", 0);

    const baseArgs = buildInstagramArgsBase();
    const args = [
        ...baseArgs,
        "-x",
        "--audio-format", audioFormat,
        "--ffmpeg-location", FFMPEG_DIR,
        "-o", outputPath,
        url
    ];

    console.log("yt-dlp Instagram AUDIO args:", args);

    await execProgress(
        YTDLP_PATH,
        args,
        "Téléchargement audio Instagram"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier audio Instagram introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé Instagram", 100);
}
