import { geminiModel } from "../configs/ai.js";

/* =========================================================
   CHAT WITH GEMINI
   POST : /api/chatbot/chat
========================================================= */


export const chatWithGemini = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Missing message field" });
    }

  const prompt = `
You are an intelligent AI assistant for an AI Placement Preparation Platform.

This platform helps students become job-ready through multiple phases:

1. Resume Builder – Creates ATS-friendly professional resumes and improves resume quality.
2. Skill Gap Analysis – Analyzes user skills and identifies missing industry-required competencies.
3. Skill-Based Preparation – Generates personalized interview questions based on user skills.
4. AI Mock Interview – Simulates real interview experience and provides feedback on communication, grammar, confidence, and performance.
5. Security Monitoring – Tracks face presence, head direction, and attention during mock interviews to ensure fair practice.
6. Career Guidance – Provides career advice, skill improvement tips, and placement preparation guidance.

Your role:
- Help users with resume writing, interview preparation, skill development, and career advice.
- Answer questions related to how the platform works.
- Guide users on using platform features.
- Provide practical and professional suggestions.
- Keep answers short, clear, and helpful.
- Use simple and friendly language.
- If the user asks unrelated questions, politely redirect to career or placement guidance.

User message: ${message}
`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();

    res.status(200).json({ 
      response: responseText,
      message: message 
    });
  } catch (error) {
    console.error("Chatbot error:", error);
    res.status(500).json({ message: error.message });
  }
};

/* =========================================================
   GET CHAT SUGGESTIONS
   GET : /api/chatbot/suggestions
========================================================= */

export const getChatSuggestions = async (req, res) => {
  try {
    const suggestions = [
       "How can I create an ATS-friendly resume?",
  "How should I prepare for technical and HR interviews?",
  "How can I identify and improve my skill gaps?",
  "How can I improve my communication and interview confidence?"
    ];

    res.status(200).json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
