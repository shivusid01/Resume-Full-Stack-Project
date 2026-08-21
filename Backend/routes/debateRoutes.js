import express from "express";
import protect from "../middlewares/authMiddleware.js";
import {
  startDebate,
  respondDebate,
  getDebateFeedback,
  getDebateTopics
} from "../controllers/debateController.js";

const debateRoutes = express.Router();

debateRoutes.post('/start', protect, startDebate);
debateRoutes.post('/respond', protect, respondDebate);
debateRoutes.post('/feedback', protect, getDebateFeedback);
debateRoutes.get('/topics', protect, getDebateTopics);

export default debateRoutes;
