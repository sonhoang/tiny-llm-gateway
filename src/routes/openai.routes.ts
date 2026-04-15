import { Router } from "express";
import { handleChat } from "../controllers/chat.controller";

const router = Router();
router.post("/chat/completions", handleChat);

export default router;
