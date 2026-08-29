// src/routes/ytdlp-update.route.js
import { execFile } from "child_process";
import { promisify } from "util";
import { Router } from "express";

import { YTDLP_PATH } from "../config/paths.js";
import { requireAdmin } from "../middleware/require-admin.js";

const execFileAsync = promisify(execFile);
const router = Router();

async function getYtdlpVersion() {
    const { stdout } = await execFileAsync(YTDLP_PATH, ["--version"], { timeout: 15000 });
    return stdout.trim();
}

router.get("/api/admin/ytdlp/version", requireAdmin, async (req, res) => {
    try {
        const version = await getYtdlpVersion();
        res.json({ version });
    } catch (error) {
        console.error("Impossible de lire la version de yt-dlp:", error.message);
        res.status(500).json({ error: "Impossible de lire la version de yt-dlp." });
    }
});

router.post("/api/admin/ytdlp/update", requireAdmin, async (req, res) => {
    let before;
    try {
        before = await getYtdlpVersion();
    } catch (error) {
        console.error("Impossible de lire la version actuelle de yt-dlp:", error.message);
        return res.status(500).json({ error: "Impossible de lire la version actuelle de yt-dlp." });
    }

    let output;
    try {
        const result = await execFileAsync(YTDLP_PATH, ["-U"], {
            timeout: 120000,
            maxBuffer: 10 * 1024 * 1024
        });
        output = (result.stdout + result.stderr).trim();
    } catch (error) {
        output = ((error.stdout || "") + (error.stderr || "")).trim() || error.message;
        console.error(`Échec de la mise à jour de yt-dlp:`, output);
        return res.status(500).json({ error: "La mise à jour de yt-dlp a échoué.", output, before });
    }

    let after;
    try {
        after = await getYtdlpVersion();
    } catch (error) {
        console.error("Mise à jour lancée mais impossible de relire la version:", error.message);
        return res.status(500).json({
            error: "Mise à jour lancée mais impossible de relire la version.",
            output,
            before
        });
    }

    console.log(`[admin] yt-dlp mis à jour le ${new Date().toISOString()} (${before} -> ${after})`);
    res.json({ before, after, updated: before !== after, output });
});

export default router;
