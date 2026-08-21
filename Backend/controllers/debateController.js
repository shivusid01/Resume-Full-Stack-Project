import { geminiModel, sanitizeJsonString } from "../configs/ai.js";

/* =========================================================
   START DEBATE - INITIALIZE WITH 3 PANELISTS
   POST : /api/debate/start
========================================================= */


export const startDebate = async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || topic.trim().length === 0) {
      return res.status(400).json({ message: "Topic is required" });
    }

    const prompt = `
You are a panel of 3 debate members discussing the following topic.


TOPIC: ${topic}

PANEL MEMBERS:
1. 🟢 SUPPORTER - Strongly agrees with the user's potential stance
2. 🔴 OPPONENT - Strongly disagrees and challenges the user
3. 🟡 NEUTRAL JUDGE - Acts as moderator with balanced perspective

Your task: Open the debate by having each panelist make an opening statement.

Format your response as:

🟢 SUPPORTER: [Opening statement supporting this topic, 2-3 sentences]

🔴 OPPONENT: [Opening statement challenging this topic, 2-3 sentences]

🟡 NEUTRAL JUDGE: [Moderator introduction and key questions to explore, 2-3 sentences]

Make it engaging and thought-provoking. Challenge the user to think deeply.
`;

    const result = await geminiModel.generateContent(prompt);
    const debate = result.response.text();

    res.status(200).json({ 
      debate,
      topic,
      round: 1
    });
  } catch (error) {
    console.error("Debate start error:", error);
    res.status(500).json({ message: "Failed to start debate" });
  }
};

/* =========================================================
   RESPOND TO USER ARGUMENT - 3 PANELISTS RESPOND
   POST : /api/debate/respond
========================================================= */

export const respondDebate = async (req, res) => {
  try {
    const { userArgument, topic, round = 1 } = req.body;

    if (!userArgument || userArgument.trim().length === 0) {
      return res.status(400).json({ message: "Argument is required" });
    }

    if (!topic) {
      return res.status(400).json({ message: "Topic is required" });
    }

    const prompt = `
You are a panel of 3 debate members responding to a student's argument.

DEBATE TOPIC: ${topic}

STUDENT'S ARGUMENT: "${userArgument}"

ROUND: ${round}

PANEL MEMBERS:
1. 🟢 SUPPORTER - Supports the student's stance
2. 🔴 OPPONENT - Disagrees and challenges the student
3. 🟡 NEUTRAL JUDGE - Evaluates the argument objectively

Your task: Each panelist responds to the student's argument.

For each panelist:
- Acknowledge their argument
- Provide counter or supporting perspective
- Ask a challenging follow-up question
- Keep responses concise (2-3 sentences each)

Format your response as:

🟢 SUPPORTER: [Positive feedback on argument] [Challenge question that pushes deeper]

🔴 OPPONENT: [Counter-argument with specific points] [Question that exposes potential flaws]

🟡 NEUTRAL JUDGE: [Objective analysis of argument quality] [Suggestion for stronger reasoning]

Be respectful but intellectually challenging. Force the student to think critically.
`;

    const result = await geminiModel.generateContent(prompt);
    const responses = result.response.text();

    res.status(200).json({ 
      responses,
      topic,
      round: round + 1
    });
  } catch (error) {
    console.error("Debate respond error:", error);
    res.status(500).json({ message: "Failed to generate response" });
  }
};

/* =========================================================
   GET DEBATE FEEDBACK - EVALUATE OVERALL PERFORMANCE
   POST : /api/debate/feedback
========================================================= */

export const getDebateFeedback = async (req, res) => {
  try {
    const { topic, messages } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ message: "No debate messages provided" });
    }

    // Format messages for analysis
    const debateHistory = messages
      .map(msg => `${msg.sender === "user" ? "USER: " : "PANEL: "}${msg.text}`)
      .join("\n\n");

    const prompt = `
You are a debate coach evaluating a student's debate performance.

TOPIC: ${topic}

DEBATE TRANSCRIPT:
${debateHistory}

Evaluate the student's performance based on:
1. Argument Quality - Were arguments logical and well-supported?
2. Critical Thinking - Did they challenge assumptions?
3. Responsiveness - Did they address counter-arguments?
4. Communication - Was the message clear and concise?
5. Growth - Did they improve throughout the debate?

Return ONLY valid JSON (no markdown):

{
  "overall_score": 0-10,
  "argument_quality": 0-10,
  "critical_thinking": 0-10,
  "responsiveness": 0-10,
  "communication": 0-10,
  "strengths": ["strength1", "strength2", "strength3"],
  "areas_for_improvement": ["area1", "area2", "area3"],
  "key_insights": "What did the student demonstrate about their thinking?",
  "coach_feedback": "Overall encouraging feedback with specific advice",
  "debate_summary": "Brief summary of the debate and key moments"
}
`;

    const result = await geminiModel.generateContent(prompt);
    const rawText = result.response.text();
    const sanitizedJson = sanitizeJsonString(rawText);
    const feedback = JSON.parse(sanitizedJson);

    res.status(200).json({ feedback });
  } catch (error) {
    console.error("Debate feedback error:", error);
    res.status(500).json({ message: "Failed to generate feedback" });
  }
};

/* =========================================================
   GET DEBATE TOPICS - SUGGESTED TOPICS FOR USER
   GET : /api/debate/topics
========================================================= */

export const getDebateTopics = async (req, res) => {
  try {
    const topics = [
      "Remote work is better than office work",
      "AI will create more jobs than it destroys",
      "Higher education is becoming obsolete",
      "Social media has a net positive impact on society",
      "Cryptocurrency will replace traditional banking",
      "Climate change requires individual action, not just policy",
      "Universal basic income is the future of economics",
      "Tech companies should be regulated like utilities",
      "Freelancing offers more stability than traditional employment",
      "Mental health is more important than material wealth"
    ];

    res.status(200).json({ topics });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch topics" });
  }
};
