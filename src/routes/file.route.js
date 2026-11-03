// src/routes/file.route.js
// Sert UNIQUEMENT les fichiers produits par l'application (temp/merged, temp/downloads).
//
//   GET /file?name=<nom de fichier>   -> résolu dans MERGED_DIR (format émis par le serveur)
//   GET /file?path=<chemin absolu>    -> ancien format, gardé pour les liens déjà émis,
//                                        limité à MERGED_DIR / DOWNLOAD_DIR
import fs from "fs";
import path from "path";
import { Router } from "express";

import { DOWNLOAD_DIR, MERGED_DIR } from "../config/dirs.js";

const router = Router();

// Dossiers autorisés, résolus une fois (au cas où temp/ serait lui-même un lien symbolique)
const MERGED_ROOT = fs.realpathSync(MERGED_DIR);
const ALLOWED_ROOTS = [MERGED_ROOT, fs.realpathSync(DOWNLOAD_DIR)];

const ERROR_MESSAGES = {
    400: "Requête invalide",
    403: "Accès refusé",
    404: "Fichier introuvable"
};

// true si target est strictement à l'intérieur de root (pas root lui-même, pas au-dessus)
function isInside(root, target) {
    const rel = path.relative(root, target);
    return rel !== "" && rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
}

function isInsideAllowedRoot(target) {
    return ALLOWED_ROOTS.some(root => isInside(root, target));
}

function isUsableString(value) {
    return typeof value === "string" && value.length > 0 && !value.includes("\0");
}

// Renvoie { status } en cas de refus, ou { status: 200, filePath } (chemin réel vérifié)
function resolveRequestedFile(query) {
    const { name, path: legacyPath } = query;
    let candidate;

    if (name !== undefined) {
        if (!isUsableString(name) || name !== path.basename(name) || name === "." || name === "..") {
            return { status: 400 };
        }
        candidate = path.join(MERGED_ROOT, name);
    } else if (legacyPath !== undefined) {
        if (!isUsableString(legacyPath)) {
            return { status: 400 };
        }
        candidate = path.resolve(legacyPath);
    } else {
        return { status: 400 };
    }

    let realPath;
    try {
        // Neutralise "../" et les liens symboliques
        realPath = fs.realpathSync(candidate);
    } catch {
        // Inexistant : 404 seulement si la demande vise une zone autorisée,
        // pour ne pas servir d'oracle d'existence sur le reste du disque.
        return { status: isInsideAllowedRoot(candidate) ? 404 : 403 };
    }

    if (!isInsideAllowedRoot(realPath)) {
        return { status: 403 };
    }

    try {
        if (!fs.statSync(realPath).isFile()) {
            return { status: 403 };
        }
    } catch {
        return { status: 404 };
    }

    return { status: 200, filePath: realPath };
}

router.get("/file", (req, res) => {
    const { status, filePath } = resolveRequestedFile(req.query);

    if (status !== 200) {
        return res.status(status).type("text/plain").send(ERROR_MESSAGES[status]);
    }

    res.set("X-Content-Type-Options", "nosniff");
    res.download(filePath, path.basename(filePath), err => {
        if (!err) return;
        console.error("Erreur /file :", err.message);
        if (!res.headersSent) {
            const code = err.statusCode === 404 ? 404 : 500;
            res.status(code).type("text/plain").send(ERROR_MESSAGES[code] || "Erreur serveur");
        }
    });
});

export default router;
