import fs from "fs";
import path from "path";
import { execFile } from "child_process";

import { DOWNLOAD_DIR, MERGED_DIR } from "../config/dirs.js";
import { YTDLP_PATH, INSTAGRAM_COOKIES_PATH, YOUTUBE_COOKIES_PATH } from "../config/paths.js";

// Formats acceptés (ils finissent dans le nom du fichier de sortie et dans --audio-format)
const ALLOWED_FORMATS = {
    audio: ["mp3", "m4a", "aac", "flac", "opus", "vorbis", "alac", "wav"],
    video: ["mp4", "mkv", "webm"]
};

export function isAllowedFormat(mode, format) {
    if (format === undefined || format === null || format === "") return true;
    return (
        typeof format === "string" &&
        Object.hasOwn(ALLOWED_FORMATS, mode) &&
        ALLOWED_FORMATS[mode].includes(format)
    );
}

export async function createMediaPaths({ url, site, mode, format }) {
    if (!isAllowedFormat(mode, format)) {
        throw new Error("Format non pris en charge");
    }
    const defaultFormat = mode === "audio" ? "mp3" : "mp4";
    const finalFormat = format || defaultFormat;
    const baseName = await buildBaseName({ url, site });

    return {
        finalFormat,
        filename: `${baseName}.${finalFormat}`,
        paths: {
            videoPath: path.join(DOWNLOAD_DIR, `${baseName}_video.mp4`),
            audioPath: path.join(DOWNLOAD_DIR, `${baseName}_audio.m4a`),
            outputPath: path.join(MERGED_DIR, `${baseName}.${finalFormat}`)
        }
    };
}

async function buildBaseName({ url, site }) {
    const metadata = await getVideoMetadata({ url, site });
    const title = metadata?.title || metadata?.fulltitle || metadata?.description;
    const uploader = metadata?.uploader || metadata?.channel || metadata?.creator;
    const id = metadata?.id;

    const parts = [];
    if (uploader && ["tiktok", "instagram", "x"].includes(site)) {
        parts.push(uploader);
    }
    if (title) {
        parts.push(title);
    }
    if (id) {
        parts.push(id);
    }

    return makeUniqueBaseName(sanitizeFileName(parts.join(" - ") || `${site || "video"}-${Date.now()}`));
}

async function getVideoMetadata({ url, site }) {
    const args = ["--dump-json", "--no-playlist", "--no-warnings"];

    if (site === "youtube") {
        args.push("--extractor-args", "youtube:player_client=web,default", "--no-update");
        if (YOUTUBE_COOKIES_PATH) {
            args.push("--cookies", YOUTUBE_COOKIES_PATH);
        }
    }

    if (site === "instagram" && INSTAGRAM_COOKIES_PATH) {
        args.push("--cookies", INSTAGRAM_COOKIES_PATH);
    }

    args.push(url);

    try {
        const { stdout } = await execFileAsync(YTDLP_PATH, args);
        const firstJsonLine = stdout.split(/\r?\n/).find(line => line.trim().startsWith("{"));
        return firstJsonLine ? JSON.parse(firstJsonLine) : null;
    } catch (err) {
        console.warn("Impossible de recuperer les metadonnees yt-dlp:", err.message);
        return null;
    }
}

function execFileAsync(cmd, args) {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                error.message += `\nSTDERR:\n${stderr}`;
                reject(error);
                return;
            }
            resolve({ stdout, stderr });
        });
    });
}

function sanitizeFileName(value) {
    return String(value)
        .replace(/[<>:"/\\|?*%\u0000-\u001F]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/[. ]+$/g, "")
        .slice(0, 140) || "video";
}

function makeUniqueBaseName(baseName) {
    let candidate = baseName;
    let suffix = 1;

    while (fileExistsForBaseName(candidate) && suffix < 1000) {
        suffix++;
        candidate = `${baseName} (${suffix})`;
    }

    return candidate;
}

function fileExistsForBaseName(baseName) {
    const files = [
        path.join(DOWNLOAD_DIR, `${baseName}_video.mp4`),
        path.join(DOWNLOAD_DIR, `${baseName}_audio.m4a`),
        path.join(MERGED_DIR, `${baseName}.mp4`),
        path.join(MERGED_DIR, `${baseName}.mp3`),
        path.join(MERGED_DIR, `${baseName}.m4a`),
        path.join(MERGED_DIR, `${baseName}.webm`)
    ];

    return files.some(file => {
        try {
            return fs.existsSync(file);
        } catch {
            return false;
        }
    });
}
