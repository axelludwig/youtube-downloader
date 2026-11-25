// src/core/temp-cleanup.js
// Nettoyage périodique des dossiers temporaires (temp/downloads, temp/merged).
// Supprime les fichiers dont la dernière modification dépasse la durée de rétention.
// L'âge est basé sur mtime : un fichier en cours d'écriture (yt-dlp / ffmpeg) est
// modifié en continu et n'est donc jamais considéré comme expiré.
import fs from "fs/promises";
import path from "path";

import { DOWNLOAD_DIR, MERGED_DIR } from "../config/dirs.js";

const MINUTE = 60 * 1000;

function readMinutes(name, fallback) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
}

// Rétention par dossier (minutes), surchargeable via .env (lu à l'appel, après dotenv)
function getTargets() {
    return [
        { dir: DOWNLOAD_DIR, maxAgeMs: readMinutes("TEMP_DOWNLOADS_MAX_AGE_MINUTES", 60) * MINUTE },
        { dir: MERGED_DIR, maxAgeMs: readMinutes("TEMP_MERGED_MAX_AGE_MINUTES", 60) * MINUTE }
    ];
}

let running = false;
let timer = null;

async function cleanDir(dir, maxAgeMs, now, stats, isRoot = true) {
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
        if (err.code !== "ENOENT") console.warn(`[cleanup] Lecture impossible ${dir}: ${err.message}`);
        return;
    }

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        try {
            if (entry.isDirectory()) {
                await cleanDir(fullPath, maxAgeMs, now, stats, false);
                continue;
            }

            const { mtimeMs, size } = await fs.stat(fullPath);
            if (now - mtimeMs < maxAgeMs) continue;

            await fs.unlink(fullPath);
            stats.files++;
            stats.bytes += size;
        } catch (err) {
            // EBUSY/EPERM : fichier en cours d'envoi ou verrouillé (Windows) → on réessaiera au prochain passage
            if (err.code !== "ENOENT") stats.errors++;
        }
    }

    // Supprime les sous-dossiers devenus vides (jamais les dossiers racines)
    if (!isRoot) {
        try {
            await fs.rmdir(dir);
        } catch {
            // non vide ou verrouillé : ignoré
        }
    }
}

export async function cleanupTempDirs() {
    if (running) return null;
    running = true;

    const stats = { files: 0, bytes: 0, errors: 0 };
    const now = Date.now();

    try {
        for (const { dir, maxAgeMs } of getTargets()) {
            await cleanDir(dir, maxAgeMs, now, stats);
        }

        if (stats.files > 0 || stats.errors > 0) {
            const mb = (stats.bytes / (1024 * 1024)).toFixed(1);
            console.log(
                `[cleanup] ${stats.files} fichier(s) temporaire(s) supprimé(s) (${mb} Mo)` +
                (stats.errors ? `, ${stats.errors} échec(s)` : "")
            );
        }
        return stats;
    } finally {
        running = false;
    }
}

export function startTempCleanup() {
    if (timer) return;

    const run = () => cleanupTempDirs().catch(err => console.warn("[cleanup] Erreur:", err.message));

    run(); // passage immédiat au démarrage (restes d'un crash / redémarrage)
    timer = setInterval(run, readMinutes("TEMP_CLEANUP_INTERVAL_MINUTES", 15) * MINUTE);
    timer.unref(); // n'empêche pas le process de s'arrêter
}
