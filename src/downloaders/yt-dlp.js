// src/downloaders/yt-dlp.js
import fs from "fs";
import ffmpeg from "fluent-ffmpeg";

import { YTDLP_PATH } from "../config/paths.js";
import { execProgress } from "../core/exec-progress.js";
import { broadcastProgress } from "../core/progress-sse.js";

export async function downloadVideoYtDlp({ url, paths }) {
    const { videoPath, audioPath, outputPath } = paths;

    // 1) Vidéo
    broadcastProgress("Téléchargement vidéo", 0);
    await execProgress(
        YTDLP_PATH,
        ["-f", "bestvideo", "-o", videoPath, url],
        "Téléchargement vidéo"
    );

    if (!fs.existsSync(videoPath)) {
        throw new Error(`Fichier vidéo introuvable après yt-dlp: ${videoPath}`);
    }

    // 2) Audio
    broadcastProgress("Téléchargement audio", 0);
    await execProgress(
        YTDLP_PATH,
        ["-f", "bestaudio", "-o", audioPath, url],
        "Téléchargement audio"
    );

    if (!fs.existsSync(audioPath)) {
        throw new Error(`Fichier audio introuvable après yt-dlp: ${audioPath}`);
    }

    // 3) Fusion
    broadcastProgress("Fusion vidéo/audio", 0);

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
                broadcastProgress("Fusion vidéo/audio", pct);
            })
            .on("end", () => {
                broadcastProgress("Terminé", 100);
                resolve();
            })
            .on("error", err => {
                console.error("Erreur FFmpeg :", err);
                broadcastProgress("Erreur", 0);
                reject(err);
            })
            .run();
    });
}

export async function downloadAudioYtDlp({ url, format, paths }) {
    const { outputPath } = paths;

    const audioFormat = format || "mp3";

    broadcastProgress("Téléchargement audio", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-x",
            "--audio-format", audioFormat,
            "-o", outputPath,
            url
        ],
        "Téléchargement audio"
    );

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier audio introuvable après yt-dlp: ${outputPath}`);
    }

    broadcastProgress("Terminé", 100);
}
