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

            const msg =
                `${cmd} exited with code ${code}\n` +
                `STDOUT:\n${stdoutBuffer}\n` +
                `STDERR:\n${stderrBuffer}\n`;

            broadcastProgress("Erreur", 0);
            reject(new Error(msg));
        });

        child.on("error", err => {
            broadcastProgress("Erreur", 0);
            reject(err);
        });
    });
}
