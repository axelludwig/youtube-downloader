// src/downloaders/tiktok.js
import fs from "fs";
import path from "path";
import { YTDLP_PATH, FFMPEG_PATH } from "../config/paths.js";
import { execProgress } from "../core/exec-progress.js";
import { broadcastProgress } from "../core/progress-sse.js";

// --------- VIDEO (TikTok) ---------
export async function downloadTikTokVideo({ url, paths }) {
    const { outputPath } = paths;
    const sourceTemplate = `${outputPath}.source.%(ext)s`;
    let sourcePath;

    broadcastProgress("Téléchargement vidéo TikTok (source)", 0);

    await execProgress(
        YTDLP_PATH,
        [
            "-f", "bv*+ba/b",
            "--merge-output-format", "mp4",
            "--ffmpeg-location", FFMPEG_PATH,
            "-o", sourceTemplate,
            url
        ],
        "Téléchargement vidéo TikTok (source)"
    );

    const dir = path.dirname(outputPath);
    const sourcePrefix = `${path.basename(outputPath)}.source.`;
    const sourceFile = fs.readdirSync(dir).find(name => name.startsWith(sourcePrefix));

    if (!sourceFile) {
        throw new Error(`Fichier source TikTok introuvable après yt-dlp: ${sourceTemplate}`);
    }

    sourcePath = path.join(dir, sourceFile);

    broadcastProgress("Conversion TikTok en MP4 compatible", 0);

    await execProgress(
        FFMPEG_PATH,
        [
            "-y",
            "-i", sourcePath,
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            outputPath
        ],
        "Conversion TikTok en MP4 compatible"
    );

    if (sourcePath && fs.existsSync(sourcePath)) {
        fs.unlinkSync(sourcePath);
    }

    if (!fs.existsSync(outputPath)) {
        throw new Error(`Fichier vidéo TikTok introuvable après conversion: ${outputPath}`);
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
            "--ffmpeg-location", FFMPEG_PATH,
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
