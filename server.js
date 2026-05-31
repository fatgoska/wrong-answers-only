require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const Anthropic = require("@anthropic-ai/sdk");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const client = new Anthropic({ apiKey: process.env.CLAUDE_API_KEY });

const SYSTEM_PROMPT = `You are the host of "Wrong Answers Only" — a comedy quiz game with one sacred, unbreakable rule:
WRONG_ANSWERS_ONLY. Every single answer you provide MUST be factually incorrect. This is not a bug, it's the entire point.

Core rules you must NEVER violate:
1. ALL four multiple choice answers are wrong. Not one. Not two. ALL FOUR. WRONG.
2. Wrong answers must be plausible — confident misinformation, not obvious nonsense. Think: a Wikipedia article written by someone who was half asleep.
3. Explanations must be witty, deadpan, and specifically explain why the chosen wrong answer is wrong.
4. Never include a correct answer. If you feel the urge, resist. The joke only works if everything is wrong.
5. Vary difficulty — some answers should be hilariously obvious lies, some should be dangerously plausible.

You MUST respond with ONLY valid JSON. No markdown fences. No preamble. No explanation. Raw JSON only.`;

const USER_PROMPT_TEMPLATE = (topic, style) => {
  const styleInstructions = {
    normal: "Write in a confident, authoritative tone — like a textbook that got things subtly wrong.",
    roast: "Write like a corporate consultant who billable-hours their way through trivia. Use business jargon. Make it painful.",
    pirate: "Arr, write all questions and explanations in full pirate dialect. Nautical metaphors required.",
    shakespeare: "Write in Shakespearean English. Thou shalt use archaic language throughout, even in the JSON strings.",
    unhinged: "Write like someone who has had way too much coffee and absolutely believes everything they say. Maximum confidence, zero accuracy."
  };

  return `Generate a trivia question about "${topic}" with exactly four wrong answers.
Style instruction: ${styleInstructions[style] || styleInstructions.normal}

Return ONLY this exact JSON structure — no markdown, no backticks, just raw JSON:
{
  "question": "A specific, well-formed trivia question about ${topic}",
  "answers": [
    "Confidently wrong answer A",
    "Confidently wrong answer B",
    "Confidently wrong answer C",
    "Confidently wrong answer D"
  ],
  "explanations": {
    "A": "Witty, specific explanation of why A is wrong (1-2 sentences)",
    "B": "Witty, specific explanation of why B is wrong (1-2 sentences)",
    "C": "Witty, specific explanation of why C is wrong (1-2 sentences)",
    "D": "Witty, specific explanation of why D is wrong (1-2 sentences)"
  },
  "fun_fact": "A genuine, actually-correct fun fact about ${topic} to end on — the one true thing in this whole game"
}

WRONG_ANSWERS_ONLY. All four answers: factually incorrect. Make them confidently, specifically, hilariously wrong.`;
};

async function generateQuestion(topic, style = "normal") {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1200,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: USER_PROMPT_TEMPLATE(topic, style) + ` (Session ID: ${Math.random()})` }
    ]
  });

  if (!response.content?.[0]) throw new Error("No response from API");

  const raw = response.content[0].text;
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from response
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("Could not parse JSON");
  }

  if (
    !parsed.question ||
    !Array.isArray(parsed.answers) ||
    parsed.answers.length !== 4 ||
    !parsed.explanations ||
    !["A", "B", "C", "D"].every(k => parsed.explanations[k])
  ) throw new Error("Invalid response structure");

  return parsed;
}

app.post("/api/question", async (req, res) => {
  const { topic, style } = req.body;
  if (!topic || !topic.trim()) {
    return res.status(400).json({ error: "topic_required" });
  }

  const sanitizedTopic = topic.trim().slice(0, 100);
  const sanitizedStyle = ["normal", "roast", "pirate", "shakespeare", "unhinged"].includes(style)
    ? style : "normal";

  try {
    const question = await generateQuestion(sanitizedTopic, sanitizedStyle);
    return res.json(question);
  } catch (err) {
    console.error("Attempt 1 failed:", err.message);
    try {
      const question = await generateQuestion(sanitizedTopic, sanitizedStyle);
      return res.json(question);
    } catch (retryErr) {
      console.error("Attempt 2 failed:", retryErr.message);
      return res.status(500).json({ error: "api_failure" });
    }
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎭 Wrong Answers Only → http://localhost:${PORT}`);
  console.log(`🔑 API Key: ${process.env.CLAUDE_API_KEY ? "✅ loaded" : "❌ MISSING — check .env"}`);
});