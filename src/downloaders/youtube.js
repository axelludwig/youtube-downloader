// src/downloaders/youtube.js
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

import { YTDLP_PATH } from "../config/paths.js";
import { execProgress } from "../core/exec-progress.js";
import { broadcastProgress } from "../core/progress-sse.js";

// --------- VIDEO (YouTube) ---------
export async function downloadYoutubeVideo({ url, paths }) {
    const { videoPath, audioPath, outputPath } = paths;

    // 1) Vidéo
    broadcastProgress("Téléchargement vidéo YouTube", 0);
    await execProgress(
        YTDLP_PATH,
        ["-f", "bestvideo", "-o", videoPath, url],
        "Téléchargement vidéo YouTube"
    );

    if (!fs.existsSync(videoPath)) {
        throw new Error(`Fichier vidéo introuvable après yt-dlp (YouTube): ${videoPath}`);
    }

    // 2) Audio
    broadcastProgress("Téléchargement audio YouTube", 0);
    await execProgress(
        YTDLP_PATH,
        ["-f", "bestaudio", "-o", audioPath, url],
        "Téléchargement audio YouTube"
    );

    if (!fs.existsSync(audioPath)) {
        throw new Error(`Fichier audio introuvable après yt-dlp (YouTube): ${audioPath}`);
    }

    // 3) Fusion
    broadcastProgress("Fusion vidéo/audio YouTube", 0);

    await new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                "-c:v copy",
                "-c:a copy"
            ])
            .output(outputPath)
            .on("progress", p => {
                const pct = Math.min(100, Math.floor(p.percent || 0));
                broadcastProgress("Fusion vidéo/audio YouTube", pct);
            })
            .on("end", () => {
                broadcastProgress("Terminé YouTube", 100);
                resolve();
            })
            .on("error", err => {
                console.error("Erreur FFmpeg YouTube :", err);
                broadcastProgress("Erreur YouTube", 0);
                reject(err);
            })
            .run();
    });

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier final introuvable après FFmpeg (YouTube): ${outputPath}`);
    }
}

// --------- AUDIO (YouTube) ---------
export async function downloadYoutubeAudio({ url, format, paths }) {
    const { outputPath } = paths;
    const audioFormat = format || "mp3";

    broadcastProgress("Téléchargement audio YouTube", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-x",
            "--audio-format", audioFormat,
            "-o", outputPath,
            url
        ],
        "Téléchargement audio YouTube"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier audio introuvable après yt-dlp (YouTube): ${outputPath}`);
    }

    broadcastProgress("Terminé YouTube", 100);
}
