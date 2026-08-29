// scripts/hash-password.js
// Génère la valeur à placer dans ADMIN_PASSWORD_HASH (.env)
// Usage : node scripts/hash-password.js "mon-mot-de-passe"

import { hashPassword } from "../src/core/password.js";

const password = process.argv[2];

if (!password) {
    console.error("Usage: node scripts/hash-password.js <mot-de-passe>");
    process.exit(1);
}

console.log(hashPassword(password));
