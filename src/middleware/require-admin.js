// src/middleware/require-admin.js
import { isAdminSessionValid } from "../core/admin-sessions.js";
import { isAdminConfigured } from "../config/auth.js";

export const SESSION_COOKIE_NAME = "admin_session";

export function requireAdmin(req, res, next) {
    if (!isAdminConfigured) {
        return res.status(503).json({ error: "Administration non configurée sur ce serveur." });
    }

    const token = req.signedCookies?.[SESSION_COOKIE_NAME];
    if (!isAdminSessionValid(token)) {
        return res.status(401).json({ error: "Authentification requise." });
    }

    next();
}
