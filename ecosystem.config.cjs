module.exports = {
    apps: [
        {
            name: "yt-downloader",
            script: "./index.js",

            instances: 1,              // ou "max" si tu veux un cluster
            autorestart: true,
            watch: false,
            max_memory_restart: "512M",

            env: {
                NODE_ENV: "production",
            }
        }
    ]
};
