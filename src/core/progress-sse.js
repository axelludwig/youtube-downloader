let clients = [];
let currentProgress = {
    step: "idle",
    percent: 0
};

// Contexte pour le batch - permet de garder videoIndex/videoStatus même quand les downloaders changent le step
let batchContext = null;

export function setBatchContext(context) {
    batchContext = context;
}

export function progressHandler(req, res) {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });

    res.write("data: " + JSON.stringify(currentProgress) + "\n\n");
    clients.push(res);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
    });
}

export function broadcastProgress(stepOrData, percent) {
    // Mode legacy: broadcastProgress(step, percent) avec 2 paramètres
    if (typeof stepOrData === "string") {
        currentProgress.step = stepOrData;
        if (typeof percent === "number") {
            currentProgress.percent = percent;
        }
    }
    // Mode nouveau: broadcastProgress({step, percent, videoIndex, videoStatus, error})
    else if (typeof stepOrData === "object" && stepOrData !== null) {
        Object.assign(currentProgress, stepOrData);
    }

    // Si on est dans un batch, ajouter le contexte
    if (batchContext) {
        currentProgress.videoIndex = batchContext.videoIndex;
        currentProgress.videoStatus = batchContext.videoStatus;
    }

    const payload = "data: " + JSON.stringify(currentProgress) + "\n\n";
    for (const client of clients) {
        try {
            client.write(payload);
        } catch (e) {
            // Client disconnected, ignore
        }
    }
}



