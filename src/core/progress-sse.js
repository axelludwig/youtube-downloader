let clients = [];
let currentProgress = {
    step: "idle",
    percent: 0
};

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

export function broadcastProgress(step, percent) {
    if (typeof step === "string") {
        currentProgress.step = step;
    }
    if (typeof percent === "number") {
        currentProgress.percent = percent;
    }

    const payload = "data: " + JSON.stringify(currentProgress) + "\n\n";
    for (const client of clients) {
        client.write(payload);
    }
}

