import { Router } from "express";
import { progressHandler } from "../core/progress-sse.js";

const router = Router();

router.get("/progress", progressHandler);

export default router;

