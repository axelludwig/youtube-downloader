// src/config/paths.js
import path from "path";
import url from "url";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config(); // charge .env ici

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const isWin = process.platform === "win32";
const ext = isWin ? ".exe" : "";

// On remonte à la racine du projet: src/config -> src -> (..)
const PROJECT_ROOT = path.join(__dirname, "..", "..");

// Dossiers binaires dans "libs"
export const FFMPEG_DIR = path.join(PROJECT_ROOT, "libs", "ffmpeg");
export const YTDLP_DIR  = path.join(PROJECT_ROOT, "libs", "yt-dlp");

// Chemins binaires
export const FFMPEG_PATH  = path.join(FFMPEG_DIR, "ffmpeg" + ext);
export const FFPROBE_PATH = path.join(FFMPEG_DIR, "ffprobe" + ext);
export const YTDLP_PATH   = path.join(YTDLP_DIR,  "yt-dlp" + ext);

// Chemin des cookies Instagram (via .env)
export const INSTAGRAM_COOKIES_PATH =
    process.env.INSTAGRAM_COOKIES_PATH || null;

// Debug facultatif
console.log("INSTAGRAM_COOKIES_PATH =", INSTAGRAM_COOKIES_PATH);
console.log("YTDLP_PATH =", YTDLP_PATH);

// Rendre exécutable sous Linux/Mac si besoin
if (!isWin) {
    [FFMPEG_PATH, FFPROBE_PATH, YTDLP_PATH].forEach(f => {
        try {
            fs.chmodSync(f, 0o755);
        } catch {}
    });
}
