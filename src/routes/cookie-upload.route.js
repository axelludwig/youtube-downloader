// src/routes/cookie-upload.route.js
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { Router } from "express";
import multer from "multer";

import { YOUTUBE_COOKIES_PATH, INSTAGRAM_COOKIES_PATH } from "../config/paths.js";
import { requireAdmin } from "../middleware/require-admin.js";
import { validateNetscapeCookieFile } from "../core/cookie-file.js";

const router = Router();

const MAX_COOKIE_FILE_SIZE = 512 * 1024; // 512 Ko, largement suffisant pour un cookies.txt

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_COOKIE_FILE_SIZE, files: 1 }
});

const TARGET_PATHS = {
    youtube: YOUTUBE_COOKIES_PATH,
    instagram: INSTAGRAM_COOKIES_PATH
};

function writeCookieFileAtomic(targetPath, content) {
    const dir = path.dirname(targetPath);
    fs.mkdirSync(dir, { recursive: true });

    const tmpPath = path.join(dir, `.${path.basename(targetPath)}.${crypto.randomBytes(6).toString("hex")}.tmp`);
    fs.writeFileSync(tmpPath, content, { mode: 0o600 });
    fs.renameSync(tmpPath, targetPath);

    try {
        fs.chmodSync(targetPath, 0o600);
    } catch {
        // chmod n'a pas d'effet sur Windows, c'est attendu
    }
}

function handleUpload(req, res, next) {
    upload.single("cookieFile")(req, res, (err) => {
        if (err) {
            const message =
                err.code === "LIMIT_FILE_SIZE"
                    ? "Fichier trop volumineux (limite 512 Ko)."
                    : "Fichier invalide.";
            return res.status(400).json({ error: message });
        }
        next();
    });
}

function extractContent(req) {
    if (req.file) {
        return req.file.buffer.toString("utf8");
    }

    const { cookieText } = req.body || {};
    if (typeof cookieText === "string" && cookieText.trim()) {
        if (Buffer.byteLength(cookieText, "utf8") > MAX_COOKIE_FILE_SIZE) {
            throw new Error("Texte trop volumineux (limite 512 Ko).");
        }
        return cookieText;
    }

    return null;
}

router.post("/api/admin/cookies/:site", requireAdmin, handleUpload, (req, res) => {
    const { site } = req.params;
    const targetPath = TARGET_PATHS[site];

    if (!targetPath) {
        return res.status(400).json({ error: "Site inconnu. Utilisez youtube ou instagram." });
    }

    let content;
    try {
        content = extractContent(req);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    if (!content) {
        return res.status(400).json({ error: "Aucun fichier ni texte de cookies reçu." });
    }

    try {
        validateNetscapeCookieFile(content, site);
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }

    try {
        writeCookieFileAtomic(targetPath, content);
    } catch (error) {
        console.error(`Impossible d'écrire le fichier de cookies ${site}:`, error.message);
        return res.status(500).json({ error: "Impossible d'enregistrer le fichier de cookies sur le serveur." });
    }

    console.log(`[admin] cookies ${site} mis à jour le ${new Date().toISOString()}`);
    res.json({ success: true, site });
});

export default router;
