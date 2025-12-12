import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const isWin = process.platform === "win32";
const ext = isWin ? ".exe" : "";

export const FFMPEG_PATH = path.join(__dirname, "..","..", "libs", "ffmpeg", "ffmpeg" + ext);
export const FFPROBE_PATH = path.join(__dirname, "..", "..", "libs", "ffmpeg", "ffprobe" + ext);
export const YTDLP_PATH = path.join(__dirname, "..", "..", "libs", "yt-dlp", "yt-dlp" + ext);

if (!isWin) {
    [FFMPEG_PATH, FFPROBE_PATH, YTDLP_PATH].forEach(f => {
        try {
            fs.chmodSync(f, 0o755);
        } catch (err) {
            // ignore
        }
    });
}

