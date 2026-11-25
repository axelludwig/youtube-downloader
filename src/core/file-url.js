// src/core/file-url.js
// URL de téléchargement d'un fichier produit dans MERGED_DIR.
// Seul le nom de fichier est exposé au client (jamais le chemin absolu du serveur) ;
// la route /file le résout et le vérifie côté serveur.
import path from "path";

export function buildFileUrl(outputPath) {
    return "/file?name=" + encodeURIComponent(path.basename(outputPath));
}
