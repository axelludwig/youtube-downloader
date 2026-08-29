// src/config/auth.js
// Configuration de l'authentification pour la page d'administration des cookies

export const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || null;
export const SESSION_SECRET = process.env.SESSION_SECRET || null;

export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12h

// L'administration reste désactivée tant que ces deux secrets ne sont pas définis en .env
export const isAdminConfigured = Boolean(ADMIN_PASSWORD_HASH && SESSION_SECRET);
