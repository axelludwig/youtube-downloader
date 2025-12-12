import ffmpeg from "fluent-ffmpeg";
import { FFMPEG_PATH, FFPROBE_PATH } from "../config/paths.js";

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

