import fs from "fs";
import path from "path";
import url from "url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export const DOWNLOAD_DIR = path.join(__dirname, "..", "..", "temp", "downloads");
export const MERGED_DIR = path.join(__dirname, "..", "..", "temp", "merged");

[DOWNLOAD_DIR, MERGED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

