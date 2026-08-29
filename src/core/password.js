// src/core/password.js
// Hachage et vérification du mot de passe administrateur (scrypt, sans dépendance externe)

import crypto from "crypto";

const KEY_LENGTH = 64;

export function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
    return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
    if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;

    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;

    const hashBuffer = Buffer.from(hash, "hex");
    const candidateBuffer = crypto.scryptSync(password, salt, KEY_LENGTH);

    if (hashBuffer.length !== candidateBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, candidateBuffer);
}
