// src/core/exec-progress.js
import { execFile } from "child_process";
import { broadcastProgress } from "./progress-sse.js";

export function execProgress(cmd, args, step) {
    return new Promise((resolve, reject) => {
        let percent = 0;
        let stderrBuffer = "";
        let stdoutBuffer = "";

        const child = execFile(cmd, args);
        const regex = /(\d+\.\d)%/;

        const onData = data => {
            const text = data.toString();
            const match = text.match(regex);
            if (match) {
                percent = parseInt(match[1], 10);
                broadcastProgress(step, percent);
            }
        };

        if (child.stdout) {
            child.stdout.on("data", data => {
                stdoutBuffer += data.toString();
                onData(data);
            });
        }

        if (child.stderr) {
            child.stderr.on("data", data => {
                stderrBuffer += data.toString();
                onData(data);
            });
        }

        child.on("close", code => {
            if (code === 0) {
                broadcastProgress(step, 100);
                return resolve();
            }

            const fullOutput = stdoutBuffer + stderrBuffer;
            const msg =
                `${cmd} exited with code ${code}\n` +
                `STDOUT:\n${stdoutBuffer}\n` +
                `STDERR:\n${stderrBuffer}\n`;

            const error = new Error(msg);

            // Déterminer le type d'erreur
            if (fullOutput.includes("Sign in to confirm your age") || fullOutput.includes("--cookies")) {
                error.code = "AGE_RESTRICTED";
                error.userMessage = "Cette vidéo est réservée aux utilisateurs connectés. Veuillez fournir un fichier de cookies valides.";
            } else if (fullOutput.includes("This content may be inappropriate")) {
                error.code = "CONTENT_RESTRICTED";
                error.userMessage = "Ce contenu est restreint ou non disponible.";
            } else if (fullOutput.includes("No csrf token set")) {
                error.code = "SESSION_INVALID";
                error.userMessage = "Session invalide. Réexportez vos cookies.";
            } else if (fullOutput.includes("Video unavailable") || fullOutput.includes("Private")) {
                error.code = "VIDEO_UNAVAILABLE";
                error.userMessage = "Cette vidéo n'est pas disponible ou est privée.";
            } else if (fullOutput.includes("ERROR")) {
                error.code = "YTDLP_ERROR";
                error.userMessage = "Erreur yt-dlp : " + (fullOutput.match(/ERROR: (.+)/)?.[1] || "Erreur inconnue");
            }

            broadcastProgress("Erreur", 0);
            reject(error);
        });

        child.on("error", err => {
            broadcastProgress("Erreur", 0);
            reject(err);
        });
    });
}
