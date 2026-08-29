// src/core/admin-sessions.js
// Sessions admin en mémoire (opaque token -> expiration). Réinitialisées au redémarrage du serveur.

import crypto from "crypto";
import { ADMIN_SESSION_TTL_MS } from "../config/auth.js";

const sessions = new Map(); // token -> expiresAt

function cleanupExpired() {
    const now = Date.now();
    for (const [token, expiresAt] of sessions) {
        if (expiresAt <= now) sessions.delete(token);
    }
}

export function createAdminSession() {
    cleanupExpired();
    const token = crypto.randomBytes(32).toString("hex");
    sessions.set(token, Date.now() + ADMIN_SESSION_TTL_MS);
    return token;
}

export function isAdminSessionValid(token) {
    if (!token) return false;

    const expiresAt = sessions.get(token);
    if (!expiresAt) return false;

    if (expiresAt <= Date.now()) {
        sessions.delete(token);
        return false;
    }

    return true;
}

export function destroyAdminSession(token) {
    if (token) sessions.delete(token);
}
