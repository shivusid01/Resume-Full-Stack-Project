import Resume from "../models/Resume.js";
import { geminiModel, sanitizeJsonString } from "../configs/ai.js";
import SecurityCapture from "../models/SecurityCapture.js"; // You'll need to create this model


// CAPTURE SCREENSHOT (NEW)
// ==================
// ==================
// CAPTURE SCREENSHOT (NEW)
// ==================

export const captureScreenshot = async (req, res) => {
  try {
    const { resumeId, screenshot, timestamp, sessionId } = req.body;

    console.log("Received screenshot capture request:", { 
      resumeId: resumeId ? 'present' : 'missing',
      screenshot: screenshot ? `present (${screenshot.length} chars)` : 'missing',
      timestamp: timestamp || 'not provided',
      sessionId: sessionId || 'not provided'
    });

    if (!resumeId) {
      console.error("Missing resumeId in request");
      return res.status(400).json({ message: "Missing resumeId" });
    }

    if (!screenshot) {
      console.error("Missing screenshot in request");
      return res.status(400).json({ message: "Missing screenshot data" });
    }

    // Store screenshot in database
    const securityCapture = new SecurityCapture({
      resumeId,
      sessionId: sessionId || resumeId,
      screenshot: screenshot,
      timestamp: timestamp || new Date().toISOString(),
      userId: req.user?._id || null
    });

    const saved = await securityCapture.save();
    console.log("Screenshot saved successfully:", saved._id);

    // Optional: Keep only last 50 screenshots per session
    try {
      const count = await SecurityCapture.countDocuments({ sessionId: sessionId || resumeId });
      if (count > 50) {
        const toDelete = count - 50;
        const result = await SecurityCapture.deleteMany({
          sessionId: sessionId || resumeId
        }).limit(toDelete);
        console.log(`Deleted ${result.deletedCount} old screenshots to maintain limit of 50`);
      }
    } catch (cleanupErr) {
      console.warn("Cleanup failed (non-critical):", cleanupErr.message);
    }

    res.status(201).json({ 
      message: "Screenshot captured successfully",
      captureId: saved._id 
    });

  } catch (error) {
    console.error("Screenshot capture error:", error.message);
    console.error("Full error:", error);
    res.status(500).json({ 
      message: "Failed to capture screenshot",
      error: error.message 
    });
  }
};



// ==================
// GENERATE QUESTION WITH STYLE
// ==================
export const generateInterviewQuestion = async (req, res) => {
  try {
    const { resumeId, interviewStyle = "india" } = req.body;

    const resume = await Resume.findById(resumeId);

    if (!resume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    // Define interview style guidelines
    const styleGuides = {
      india: {
        name: "🇮🇳 Indian HR Style",
        description: "Friendly, behavioral focus, basic technical, relationship-building",
        tone: "warm and conversational",
        focus: "team fit, cultural values, willingness to learn, growth potential"
      },
      us: {
        name: "🇺🇸 US Interview Style",
        description: "Direct, structured, confidence-focused, STAR method",
        tone: "professional and direct",
        focus: "achievements, problem-solving skills, career ambitions, leadership"
      },
      europe: {
        name: "🇪🇺 European Corporate Style",
        description: "Formal, detailed explanations, work-life balance, process-oriented",
        tone: "formal and detailed",
        focus: "methodology, work processes, work-life balance, professional development"
      },
      startup: {
        name: "🚀 Startup Culture Style",
        description: "Fast-paced, practical, problem-solving, owner mentality",
        tone: "energetic and practical",
        focus: "quick thinking, adaptability, entrepreneurial mindset, ownership"
      },
      mnc: {
        name: "🏢 MNC Corporate Style",
        description: "Professional corporate tone, cross-functional collaboration, corporate values",
        tone: "professional and corporate",
        focus: "corporate culture fit, cross-functional collaboration, leadership pipeline"
      }
    };

    const style = styleGuides[interviewStyle] || styleGuides.india;

    const prompt = `
You are an expert HR interviewer conducting a ${style.name} interview.

INTERVIEW STYLE CHARACTERISTICS:
- Tone: ${style.tone}
- Focus Areas: ${style.focus}
- Description: ${style.description}

Candidate skills and experience:
${resume.skills?.join(", ")}

Professional summary: ${resume.professionalSummary || "Not provided"}

Generate ONE interview question tailored to ${style.name}.

The question should:
1. Reflect the typical style and tone of ${style.name}
2. Focus on the key areas valued in this culture
3. Be specific and practical
4. Assess both technical and soft skills relevant to this market

Return ONLY valid JSON (no markdown, no backticks):

{
  "question": "string - the interview question tailored to the style",
  "type": "technical or behavioral or situational",
  "interviewStyle": "${interviewStyle}",
  "styleName": "${style.name}",
  "expected_duration": 60,
  "why_this_style": "brief explanation of why this question is suited for this interview style"
}
`;

    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response.text();
    const sanitizedJson = sanitizeJsonString(rawText);

    let question;
    try {
      question = JSON.parse(sanitizedJson);
    } catch (parseError) {
      console.warn("Question JSON parse error:", parseError.message, "rawText:", rawText);
      question = {
        question: `Tell me about a project where you used ${resume.skills?.[0] || "your main skill"} to solve a real problem.`,
        type: "behavioral",
        interviewStyle,
        styleName: style.name,
        expected_duration: 60,
        why_this_style: "Fallback question generated because the AI response format needed fallback."
      };
    }

    question.style = style;

    res.json({ question });

  } catch (error) {
    console.error("Question error:", error);
    res.status(500).json({ message: "Failed to generate question" });
  }
};


// ==================
// EVALUATE ANSWER WITH STYLE-BASED FEEDBACK
// ==================
export const evaluateAnswer = async (req, res) => {
  try {
    const { question, answer, questionType, interviewStyle = "india" } = req.body;

    if (!question || !answer) {
      return res.status(400).json({ message: "Missing data" });
    }

    // Define interview style feedback criteria
    const styleFeedback = {
      india: "Focus on team collaboration, willingness to learn, and cultural fit. Indian interviews value modesty and team spirit.",
      us: "Use STAR method (Situation, Task, Action, Result). Americans value direct answers and clear achievements.",
      europe: "Provide detailed methodology and process explanation. Work-life balance and structured approach are important.",
      startup: "Show quick thinking and ownership mentality. Startups value adaptability and practical problem-solving.",
      mnc: "Demonstrate cross-functional collaboration and corporate values alignment. Corporate fit is crucial."
    };

    const styleGuides = {
      india: "🇮🇳 Indian HR",
      us: "🇺🇸 US Interview",
      europe: "🇪🇺 European Corporate",
      startup: "🚀 Startup",
      mnc: "🏢 MNC Corporate"
    };

    const prompt = `
You are a senior HR interviewer evaluating a candidate answer for ${styleGuides[interviewStyle] || styleGuides.india} interview.

INTERVIEW STYLE: ${interviewStyle}
STYLE FEEDBACK GUIDELINES: ${styleFeedback[interviewStyle] || styleFeedback.india}

QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Evaluate the answer based on:
1. Confidence level
2. Grammar and communication quality
3. Communication clarity
4. Technical accuracy (if applicable)
5. Structure and coherence
6. Professionalism

Also provide STYLE-SPECIFIC feedback:
- How well does this answer suit the ${styleGuides[interviewStyle] || styleGuides.india} interview style?
- What improvements would make this answer better for this specific interview culture?
- Rate how well the communication style matches the expected tone

Return ONLY valid JSON (no markdown, no backticks):

{
  "score": 0-10,
  "confidence_level": "Low/Medium/High",
  "grammar_mistakes": ["mistake1", "mistake2"],
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "improvements": ["improvement1", "improvement2"],
  "hr_feedback": "overall HR opinion",
  "style_rating": 0-10,
  "style_feedback": "How well this answer suits the ${styleGuides[interviewStyle] || styleGuides.india} interview style",
  "style_specific_tips": ["tip1", "tip2", "tip3"],
  "communication_match": "How well the communication tone matches the expected style (Low/Medium/High)"
}
`;

    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response.text();
    const sanitizedJson = sanitizeJsonString(rawText);

    let evaluation;
    try {
      evaluation = JSON.parse(sanitizedJson);
    } catch (parseError) {
      evaluation = {
        score: 6,
        confidence_level: "Medium",
        grammar_mistakes: [],
        strengths: ["You attempted a clear answer", "You showed willingness to engage"],
        weaknesses: ["Add more structure", "Support points with evidence"],
        improvements: ["Use the STAR method", "Keep answers concise and specific"],
        hr_feedback: "Your answer was understandable, but it would be stronger with more structure and concrete examples.",
        style_rating: 6,
        style_feedback: "The answer is acceptable but could better match the expected interview tone.",
        style_specific_tips: ["Be more direct", "Mention measurable outcomes"],
        communication_match: "Medium"
      };
    }

    evaluation.interviewStyle = interviewStyle;
    evaluation.styleGuide = styleGuides[interviewStyle] || styleGuides.india;

    res.json({ evaluation });

  } catch (error) {
    console.error("Evaluation error:", error);
    res.status(500).json({ message: "Evaluation failed" });
  }
};




// ==================
// GET SESSION SCREENSHOTS (NEW - Optional)
// ==================
export const getSessionScreenshots = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 20, page = 1 } = req.query;

    const screenshots = await SecurityCapture.find({ sessionId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select('-screenshot'); // Exclude actual image data for list view

    const total = await SecurityCapture.countDocuments({ sessionId });

    res.json({
      screenshots,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Get screenshots error:", error);
    res.status(500).json({ message: "Failed to retrieve screenshots" });
  }
};


// ==================
// DELETE SESSION SCREENSHOTS (NEW - Optional, for cleanup)
// ==================
export const deleteSessionScreenshots = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const result = await SecurityCapture.deleteMany({ sessionId });

    res.json({ 
      message: `Deleted ${result.deletedCount} screenshots for session ${sessionId}` 
    });

  } catch (error) {
    console.error("Delete screenshots error:", error);
    res.status(500).json({ message: "Failed to delete screenshots" });
  }
};