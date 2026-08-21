import express from "express";
import protect from "../middlewares/authMiddleware.js";
import { chatWithGemini, getChatSuggestions } from "../controllers/chatbotController.js";

const chatbotRoutes = express.Router();

chatbotRoutes.post('/chat', protect, chatWithGemini);
chatbotRoutes.get('/suggestions', protect, getChatSuggestions);

export default chatbotRoutes;
