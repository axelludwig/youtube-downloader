// src/core/cookie-file.js
// Parsing et validation des fichiers de cookies au format Netscape (cookies.txt)

const AUTH_COOKIE_NAMES = {
    youtube: new Set(["SID", "HSID", "SSID", "APISID", "SAPISID", "LOGIN_INFO"]),
    instagram: new Set(["sessionid", "csrftoken", "ds_user_id", "mid"])
};

export function isAuthenticationCookie(site, name) {
    if (AUTH_COOKIE_NAMES[site].has(name)) return true;
    return site === "youtube" && name.startsWith("__Secure-") && name.includes("PSID");
}

export function parseCookieExpirationDates(content, site) {
    const dates = [];

    for (const line of content.split(/\r?\n/)) {
        const normalizedLine = line.startsWith("#HttpOnly_") ? line.slice(1) : line;
        if (!normalizedLine || normalizedLine.startsWith("#")) continue;

        const columns = normalizedLine.split("\t");
        if (columns.length < 7 || !isAuthenticationCookie(site, columns[5])) continue;

        const expiresAtSeconds = Number(columns[4]);
        if (Number.isFinite(expiresAtSeconds) && expiresAtSeconds > 0) {
            dates.push(expiresAtSeconds * 1000);
        }
    }

    return dates;
}

// Valide qu'un fichier téléversé ressemble à un export Netscape cookies.txt
// et contient au moins un cookie de session reconnu pour le site visé.
// Lève une Error avec un message destiné à l'utilisateur si la validation échoue.
export function validateNetscapeCookieFile(content, site) {
    if (!AUTH_COOKIE_NAMES[site]) {
        throw new Error("Site inconnu.");
    }

    if (!content || !content.trim()) {
        throw new Error("Le fichier de cookies est vide.");
    }

    const lines = content.split(/\r?\n/);
    let cookieLineCount = 0;
    let hasAuthCookie = false;

    for (const line of lines) {
        const normalizedLine = line.startsWith("#HttpOnly_") ? line.slice(1) : line;
        if (!normalizedLine.trim() || normalizedLine.startsWith("#")) continue;

        const columns = normalizedLine.split("\t");
        if (columns.length < 7) {
            throw new Error("Le fichier ne respecte pas le format Netscape (cookies.txt) attendu.");
        }

        cookieLineCount += 1;
        if (isAuthenticationCookie(site, columns[5])) {
            hasAuthCookie = true;
        }
    }

    if (cookieLineCount === 0) {
        throw new Error("Aucun cookie trouvé dans le fichier.");
    }

    if (!hasAuthCookie) {
        throw new Error(
            `Aucun cookie de session ${site} reconnu dans ce fichier. Vérifiez que vous étiez bien connecté avant l'export.`
        );
    }
}
