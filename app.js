// app.js
import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import url from "url";
import dotenv from "dotenv";

import "./src/core/ffmpeg-init.js";

import progressRoute from "./src/routes/progress.route.js";
import downloadRoute from "./src/routes/download.route.js";
import fileRoute from "./src/routes/file.route.js";
import cookieStatusRoute from "./src/routes/cookie-status.route.js";
import adminAuthRoute from "./src/routes/admin-auth.route.js";
import cookieUploadRoute from "./src/routes/cookie-upload.route.js";
import ytdlpUpdateRoute from "./src/routes/ytdlp-update.route.js";
import { SESSION_SECRET, isAdminConfigured } from "./src/config/auth.js";

dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(cookieParser(SESSION_SECRET || undefined));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(progressRoute);
app.use(downloadRoute);
app.use(fileRoute);
app.use(cookieStatusRoute);
app.use(adminAuthRoute);
app.use(cookieUploadRoute);
app.use(ytdlpUpdateRoute);

if (!isAdminConfigured) {
    console.warn(
        "ADMIN_PASSWORD_HASH / SESSION_SECRET non définis : la page d'administration des cookies (/admin.html) est désactivée."
    );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur prêt sur http://localhost:${PORT}`);
});
