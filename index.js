import express from "express";
import { execFile } from "child_process";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import url from "url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

// ===============================================
//  OS DETECTION + BINARY PATHS
// ===============================================

const isWin = process.platform === "win32";
const ext = isWin ? ".exe" : "";

// Dossiers binaires
const FFMPEG_DIR = path.join(__dirname, "ffmpeg");
const YTDLP_DIR = path.join(__dirname, "yt-dlp");

// Chemins adaptés selon OS
const FFMPEG_PATH = path.join(FFMPEG_DIR, "ffmpeg" + ext);
const FFPROBE_PATH = path.join(FFMPEG_DIR, "ffprobe" + ext);
const YTDLP_PATH = path.join(YTDLP_DIR, "yt-dlp" + ext);

// Rendre exécutable sous Linux/Mac
if (!isWin) {
    [FFMPEG_PATH, FFPROBE_PATH, YTDLP_PATH].forEach(f => {
        try { fs.chmodSync(f, 0o755); } catch {}
    });
}

// ===============================================
//  INIT FFMPEG
// ===============================================
ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

const app = express();
app.use(express.json());

const DOWNLOAD_DIR = path.join(__dirname, "downloads");
const MERGED_DIR = path.join(__dirname, "merged");

if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);
if (!fs.existsSync(MERGED_DIR)) fs.mkdirSync(MERGED_DIR);

// ===============================================
//  PROGRESS SYSTEM (SSE)
// ===============================================

let clients = [];
let currentProgress = {
    step: "idle",
    percent: 0
};

app.get("/progress", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });

    res.write(`data: ${JSON.stringify(currentProgress)}\n\n`);
    clients.push(res);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
    });
});

function broadcastProgress(step, percent) {
    currentProgress = { step, percent };
    for (const client of clients) {
        client.write(`data: ${JSON.stringify(currentProgress)}\n\n`);
    }
}

// ===============================================
// HOME PAGE
// ===============================================

app.get("/", (req, res) => {
    res.send(`
    <!doctype html>
    <html>
        <head>
            <meta charset="utf-8">
            <title>YT Downloader</title>
            <style>
                body { font-family: sans-serif; padding: 20px; }
                .bar {
                    width: 100%; height: 20px; background: #ddd;
                    border-radius: 5px; margin-top: 10px;
                }
                .bar-inner {
                    height: 100%; width: 0%; background: #4caf50;
                    border-radius: 5px; transition: width 0.2s;
                }
            </style>
        </head>
        <body>
            <h1>YouTube Downloader</h1>
            <input id="url" type="text" size="60" placeholder="URL YouTube" />
            <button onclick="download()">Télécharger</button>

            <h3>Étape : <span id="step">Inactif</span></h3>

            <div class="bar">
                <div class="bar-inner" id="bar"></div>
            </div>

           <pre id="result"></pre>
            <a id="downloadBtn" href="#" style="display:none;" download>
                <button>Télécharger la vidéo</button>
            </a>

            <script>
                const evt = new EventSource("/progress");
                evt.onmessage = (e) => {
                    const data = JSON.parse(e.data);
                    document.getElementById("step").textContent = data.step;
                    document.getElementById("bar").style.width = data.percent + "%";
                };

                async function download() {
                    const url = document.getElementById('url').value;
                    document.getElementById('result').textContent = "";
                    fetch('/download', {
                        method: 'POST',
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ url })
                    })
                    .then(r => r.json())
                    .then(data => {
                        document.getElementById('result').textContent = JSON.stringify(data, null, 2);

                        if (data.downloadUrl) {
                            const btn = document.getElementById("downloadBtn");
                            btn.href = data.downloadUrl;
                            btn.style.display = "inline-block";
                        }
                    });
                }
            </script>
        </body>
    </html>
    `);
});

// ===============================================
//  SERVE FINAL MP4 FILE
// ===============================================

app.get("/file", (req, res) => {
    const file = req.query.path;

    if (!file) return res.status(400).send("Missing file path");

    res.download(file);
});

// ===============================================
//  DOWNLOAD LOGIC
// ===============================================

app.post("/download", async (req, res) => {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: "URL manquante" });

    const id = uuidv4();
    const videoPath = path.join(DOWNLOAD_DIR, `${id}_video.mp4`);
    const audioPath = path.join(DOWNLOAD_DIR, `${id}_audio.m4a`);
    const outputPath = path.join(MERGED_DIR, `${id}.mp4`);

    try {
        broadcastProgress("Téléchargement vidéo", 0);
        await execProgress(YTDLP_PATH, ["-f", "bestvideo", url, "-o", videoPath]);

        broadcastProgress("Téléchargement audio", 0);
        await execProgress(YTDLP_PATH, ["-f", "bestaudio", url, "-o", audioPath]);

        broadcastProgress("Fusion vidéo/audio", 0);

        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(videoPath)
                .input(audioPath)
                .outputOptions([
                    "-c:v copy",
                    "-c:a copy"
                ])
                .output(outputPath)
                .on("progress", p => {
                    const pct = Math.min(100, Math.floor(p.percent || 0));
                    broadcastProgress("Fusion vidéo/audio", pct);
                })
                .on("end", () => {
                    broadcastProgress("Terminé 🎉", 100);
                    resolve();
                })
                .on("error", (err) => {
                    console.error("❌ Erreur FFmpeg :", err);
                    reject(err);
                })
                .run();
        });

        return res.json({
            file: outputPath,
            downloadUrl: "/file?path=" + encodeURIComponent(outputPath)
        });

    } catch (err) {
        broadcastProgress("Erreur ❌", 0);
        return res.status(500).json({ error: "Erreur", details: err.toString() });
    }
});

// ===============================================
//  EXEC PROGRESS (yt-dlp output parsing)
// ===============================================

function execProgress(cmd, args) {
    return new Promise((resolve, reject) => {
        let percent = 0;
        const child = execFile(cmd, args);
        const regex = /(\d+\.\d)%/;

        child.stdout?.on("data", (data) => {
            const match = data.toString().match(regex);
            if (match) {
                percent = parseInt(match[1]);
                broadcastProgress(currentProgress.step, percent);
            }
        });

        child.stderr?.on("data", (data) => {
            const match = data.toString().match(regex);
            if (match) {
                percent = parseInt(match[1]);
                broadcastProgress(currentProgress.step, percent);
            }
        });

        child.on("close", () => {
            broadcastProgress(currentProgress.step, 100);
            resolve();
        });

        child.on("error", reject);
    });
}

// ===============================================
//  START SERVER (PORT VIA .env)
// ===============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Serveur prêt sur http://localhost:${PORT}`);
});
