// src/core/login-rate-limit.js
// Limite naïve en mémoire des tentatives de connexion admin par IP, pour freiner le brute force
// sur le mot de passe unique.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

const attemptsByIp = new Map(); // ip -> { count, firstAttemptAt }

export function isRateLimited(ip) {
    const entry = attemptsByIp.get(ip);
    if (!entry) return false;

    if (Date.now() - entry.firstAttemptAt > WINDOW_MS) {
        attemptsByIp.delete(ip);
        return false;
    }

    return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(ip) {
    const entry = attemptsByIp.get(ip);
    if (!entry || Date.now() - entry.firstAttemptAt > WINDOW_MS) {
        attemptsByIp.set(ip, { count: 1, firstAttemptAt: Date.now() });
        return;
    }

    entry.count += 1;
}

export function clearAttempts(ip) {
    attemptsByIp.delete(ip);
}
