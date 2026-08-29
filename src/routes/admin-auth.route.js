// src/routes/admin-auth.route.js
import { Router } from "express";

import { ADMIN_PASSWORD_HASH, ADMIN_SESSION_TTL_MS, isAdminConfigured } from "../config/auth.js";
import { verifyPassword } from "../core/password.js";
import { createAdminSession, destroyAdminSession, isAdminSessionValid } from "../core/admin-sessions.js";
import { isRateLimited, recordFailedAttempt, clearAttempts } from "../core/login-rate-limit.js";
import { SESSION_COOKIE_NAME } from "../middleware/require-admin.js";

const router = Router();

const SESSION_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    signed: true,
    maxAge: ADMIN_SESSION_TTL_MS
};

router.post("/api/admin/login", (req, res) => {
    if (!isAdminConfigured) {
        return res.status(503).json({ error: "Administration non configurée sur ce serveur." });
    }

    const ip = req.ip;
    if (isRateLimited(ip)) {
        return res.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes." });
    }

    const { password } = req.body || {};
    if (typeof password !== "string" || !password) {
        return res.status(400).json({ error: "Mot de passe requis." });
    }

    if (!verifyPassword(password, ADMIN_PASSWORD_HASH)) {
        recordFailedAttempt(ip);
        return res.status(401).json({ error: "Mot de passe incorrect." });
    }

    clearAttempts(ip);
    const token = createAdminSession();
    res.cookie(SESSION_COOKIE_NAME, token, SESSION_COOKIE_OPTIONS);
    res.json({ authenticated: true });
});

router.post("/api/admin/logout", (req, res) => {
    const token = req.signedCookies?.[SESSION_COOKIE_NAME];
    destroyAdminSession(token);
    res.clearCookie(SESSION_COOKIE_NAME);
    res.json({ authenticated: false });
});

router.get("/api/admin/session", (req, res) => {
    res.set("Cache-Control", "no-store");
    const token = req.signedCookies?.[SESSION_COOKIE_NAME];
    res.json({ authenticated: isAdminConfigured && isAdminSessionValid(token) });
});

export default router;
