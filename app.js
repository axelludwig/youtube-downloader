// app.js
import express from "express";
import path from "path";
import url from "url";
import dotenv from "dotenv";

import "./src/core/ffmpeg-init.js";

import progressRoute from "./src/routes/progress.route.js";
import downloadRoute from "./src/routes/download.route.js";
import fileRoute from "./src/routes/file.route.js";

dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use(progressRoute);
app.use(downloadRoute);
app.use(fileRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur prêt sur http://localhost:${PORT}`);
});
