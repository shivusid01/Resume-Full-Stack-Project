import Resume from "../models/Resume.js";
import { geminiModel, sanitizeJsonString } from "../configs/ai.js";

const buildFallbackQuestions = (skills) => {
  const skillText = Array.isArray(skills) && skills.length ? skills.join(", ") : "your skills";
  const levels = ["easy", "medium", "hard"];

  return levels.reduce((acc, level) => {
    acc[level] = Array.from({ length: 5 }, (_, index) => ({
      question: `${level.toUpperCase()} question ${index + 1} about ${skillText}`,
      answer: `Sample answer for ${level} level covering ${skillText}`,
    }));
    return acc;
  }, { easy: [], medium: [], hard: [] });
};

export { buildFallbackQuestions };

export const generateSkillQuestions = async (req, res) => {
  try {
    const { resumeId } = req.body;

    if (!resumeId) {
      return res.status(400).json({ message: "resumeId is required" });
    }

    const resume = await Resume.findById(resumeId);

    if (!resume || !Array.isArray(resume.skills) || resume.skills.length === 0) {
      return res.status(400).json({ message: "No skills found in resume" });
    }

    const prompt = `
You are an interview question generator.

Skills:
${resume.skills.join(", ")}

Generate 5 questions per level.

STRICT RULES:
- Return ONLY valid JSON
- No explanation
- No markdown
- No backticks
- No extra text

Return exactly this JSON format:

{
  "easy": [{"question":"", "answer":""}],
  "medium": [{"question":"", "answer":""}],
  "hard": [{"question":"", "answer":""}]
}
`;

    let questions;

    try {
      const result = await geminiModel.generateContent(prompt);
      const rawText = result.response.text();
      const sanitizedJson = sanitizeJsonString(rawText);

      questions = JSON.parse(sanitizedJson);
      if (!questions.easy || !questions.medium || !questions.hard) {
        throw new Error("Invalid AI response format");
      }

      questions.easy = Array.isArray(questions.easy) ? questions.easy : [];
      questions.medium = Array.isArray(questions.medium) ? questions.medium : [];
      questions.hard = Array.isArray(questions.hard) ? questions.hard : [];
    } catch (err) {
      console.warn("AI response was invalid, using fallback questions", err.message);
      questions = buildFallbackQuestions(resume.skills);
    }

    return res.status(200).json({ questions });
  } catch (error) {
    console.error("Skill Question Error:", error);
    return res.status(500).json({
      message: "Failed to generate skill questions",
    });
  }
};
