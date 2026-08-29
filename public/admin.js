// public/admin.js

// ==============================
// Thème (identique à app.js)
// ==============================

const themeToggle = document.getElementById("themeToggle");
const html = document.documentElement;

function initTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    html.setAttribute("data-theme", savedTheme);
    themeToggle.textContent = savedTheme === "dark" ? "☀️" : "🌙";
}

themeToggle.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme") || "dark";
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    themeToggle.textContent = newTheme === "dark" ? "☀️" : "🌙";
});

initTheme();

// ==============================
// Éléments
// ==============================

const loginCard = document.getElementById("loginCard");
const disabledCard = document.getElementById("disabledCard");
const adminPanel = document.getElementById("adminPanel");
const loginForm = document.getElementById("loginForm");
const passwordInput = document.getElementById("passwordInput");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");
const uploadMessage = document.getElementById("uploadMessage");

const STATUS_LABELS = {
    valid: "valide",
    expiring_soon: "expire bientôt",
    expired: "expiré",
    missing: "aucun fichier",
    unreadable: "illisible par le serveur",
    unknown: "date d'expiration inconnue",
    not_configured: "non configuré"
};

// ==============================
// Navigation entre les états
// ==============================

function showLoginCard() {
    loginCard.hidden = false;
    disabledCard.hidden = true;
    adminPanel.hidden = true;
}

function showDisabledCard() {
    loginCard.hidden = true;
    disabledCard.hidden = false;
    adminPanel.hidden = true;
}

function showAdminPanel() {
    loginCard.hidden = true;
    disabledCard.hidden = true;
    adminPanel.hidden = false;
    loadCookieStatus();
}

// ==============================
// Statut des cookies
// ==============================

async function loadCookieStatus() {
    try {
        const res = await fetch("/api/cookies/status", { cache: "no-store" });
        const data = await res.json();

        for (const cookie of data.cookies || []) {
            const el = document.getElementById(`${cookie.site}Status`);
            if (!el) continue;

            const label = STATUS_LABELS[cookie.status] || cookie.status;
            el.textContent = `Statut : ${label}${cookie.message ? " — " + cookie.message : ""}`;
        }
    } catch (error) {
        console.warn("Impossible de charger le statut des cookies:", error);
    }
}

// ==============================
// Session
// ==============================

async function checkSession() {
    try {
        const res = await fetch("/api/admin/session", { cache: "no-store" });

        if (res.status === 503) {
            showDisabledCard();
            return;
        }

        const data = await res.json();
        if (data.authenticated) {
            showAdminPanel();
        } else {
            showLoginCard();
        }
    } catch {
        showLoginCard();
    }
}

// ==============================
// Connexion / déconnexion
// ==============================

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError.hidden = true;

    try {
        const res = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: passwordInput.value })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
            loginError.textContent = data.error || "Échec de la connexion.";
            loginError.hidden = false;
            return;
        }

        passwordInput.value = "";
        showAdminPanel();
    } catch (error) {
        loginError.textContent = "Erreur réseau.";
        loginError.hidden = false;
    }
});

logoutBtn.addEventListener("click", async () => {
    try {
        await fetch("/api/admin/logout", { method: "POST" });
    } finally {
        showLoginCard();
    }
});

// ==============================
// Upload des cookies (fichier ou texte collé)
// ==============================

// Envoie le payload (FormData ou JSON) au serveur et affiche le résultat.
// Retourne true si l'envoi a réussi, pour laisser l'appelant réinitialiser son formulaire.
async function submitCookiePayload(site, requestOptions) {
    uploadMessage.hidden = true;

    try {
        const res = await fetch(`/api/admin/cookies/${site}`, requestOptions);

        if (res.status === 401) {
            showLoginCard();
            return false;
        }

        const data = await res.json().catch(() => ({}));
        uploadMessage.hidden = false;

        if (!res.ok) {
            uploadMessage.textContent = data.error || "Échec de l'envoi.";
            uploadMessage.className = "admin-message admin-message-error";
            return false;
        }

        uploadMessage.textContent = `Cookies ${site} mis à jour avec succès.`;
        uploadMessage.className = "admin-message admin-message-success";
        loadCookieStatus();
        return true;
    } catch (error) {
        uploadMessage.hidden = false;
        uploadMessage.textContent = "Erreur réseau lors de l'envoi.";
        uploadMessage.className = "admin-message admin-message-error";
        return false;
    }
}

document.querySelectorAll(".cookie-upload-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const site = form.dataset.site;
        const fileInput = form.querySelector("input[type=file]");
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("cookieFile", file);

        const submitBtn = form.querySelector("button[type=submit]");
        submitBtn.disabled = true;

        const success = await submitCookiePayload(site, { method: "POST", body: formData });
        if (success) form.reset();

        submitBtn.disabled = false;
    });
});

document.querySelectorAll(".cookie-paste-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const site = form.dataset.site;
        const textarea = form.querySelector("textarea");
        const cookieText = textarea.value;
        if (!cookieText.trim()) return;

        const submitBtn = form.querySelector("button[type=submit]");
        submitBtn.disabled = true;

        const success = await submitCookiePayload(site, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ cookieText })
        });
        if (success) textarea.value = "";

        submitBtn.disabled = false;
    });
});

checkSession();
