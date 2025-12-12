import { Router } from "express";

const router = Router();

router.get("/file", (req, res) => {
    const file = req.query.path;

    if (!file) {
        return res.status(400).send("Missing file path");
    }

    res.download(file);
});

export default router;

