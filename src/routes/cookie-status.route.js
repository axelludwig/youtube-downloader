import fs from "fs";
import { Router } from "express";

import { INSTAGRAM_COOKIES_PATH, YOUTUBE_COOKIES_PATH } from "../config/paths.js";

const router = Router();
const EXPIRING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

const AUTH_COOKIE_NAMES = {
    youtube: new Set(["SID", "HSID", "SSID", "APISID", "SAPISID", "LOGIN_INFO"]),
    instagram: new Set(["sessionid", "csrftoken", "ds_user_id", "mid"])
};

function isAuthenticationCookie(site, name) {
    if (AUTH_COOKIE_NAMES[site].has(name)) return true;
    return site === "youtube" && name.startsWith("__Secure-") && name.includes("PSID");
}

function parseCookieExpirationDates(content, site) {
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

function getCookieStatus(site, cookiePath) {
    if (!cookiePath) {
        return { site, status: "not_configured" };
    }

    try {
        const content = fs.readFileSync(cookiePath, "utf8");
        const expirationDates = parseCookieExpirationDates(content, site);

        if (expirationDates.length === 0) {
            return {
                site,
                status: "unknown",
                message: "La date d'expiration ne peut pas être déterminée pour ce fichier de cookies."
            };
        }

        const now = Date.now();
        const expiredDates = expirationDates.filter(date => date <= now);
        if (expiredDates.length > 0) {
            return {
                site,
                status: "expired",
                message: "Les cookies d'authentification ont expiré. Réexportez-les avant le prochain téléchargement."
            };
        }

        const expiresAt = Math.min(...expirationDates);
        const daysRemaining = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));
        if (expiresAt - now <= EXPIRING_SOON_MS) {
            return {
                site,
                status: "expiring_soon",
                expiresAt: new Date(expiresAt).toISOString(),
                daysRemaining,
                message: `Les cookies expirent dans ${daysRemaining} jour${daysRemaining > 1 ? "s" : ""}.`
            };
        }

        return {
            site,
            status: "valid",
            expiresAt: new Date(expiresAt).toISOString(),
            daysRemaining
        };
    } catch (error) {
        if (error.code === "ENOENT") {
            return {
                site,
                status: "missing",
                message: "Le fichier de cookies configuré est introuvable."
            };
        }

        console.error(`Impossible de lire les cookies ${site}:`, error.message);
        return {
            site,
            status: "unreadable",
            message: "Le fichier de cookies ne peut pas être lu par le serveur."
        };
    }
}

router.get("/api/cookies/status", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
        cookies: [
            getCookieStatus("youtube", YOUTUBE_COOKIES_PATH),
            getCookieStatus("instagram", INSTAGRAM_COOKIES_PATH)
        ]
    });
});

export default router;
