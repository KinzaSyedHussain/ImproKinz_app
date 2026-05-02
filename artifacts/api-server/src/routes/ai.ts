import { Router } from "express";
import OpenAI from "openai";

const router = Router();

function validateText(body: unknown): { text: string } | null {
  if (!body || typeof body !== "object") return null;
  const t = (body as Record<string, unknown>)["text"];
  if (typeof t !== "string" || t.trim().length === 0 || t.length > 20000)
    return null;
  return { text: t.trim() };
}

function getGroq() {
  return new OpenAI({
    apiKey: process.env["GROQ_API_KEY"] ?? "",
    baseURL: "https://api.groq.com/openai/v1",
  });
}

const MODEL = "llama-3.1-8b-instant";

router.post("/ai/flashcards", async (req, res) => {
  const parsed = validateText(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { text } = parsed;
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are a study assistant. Generate flashcards from the provided text. Return ONLY a valid JSON object (no markdown, no code blocks) with a "flashcards" array. Each item must have "question" and "answer" string fields. Generate 5-10 flashcards.',
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(content) as { flashcards?: unknown[] };
    res.json({ flashcards: result.flashcards ?? [] });
  } catch (err) {
    req.log.error({ err }, "Flashcard generation failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

router.post("/ai/summary", async (req, res) => {
  const parsed = validateText(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { text } = parsed;
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are a study assistant. Summarize the provided text concisely, highlighting key points and main concepts. Return ONLY a valid JSON object (no markdown) with a "summary" string field.',
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(content) as { summary?: string };
    res.json({ summary: result.summary ?? "" });
  } catch (err) {
    req.log.error({ err }, "Summary generation failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

router.post("/ai/quiz", async (req, res) => {
  const parsed = validateText(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { text } = parsed;
  try {
    const groq = getGroq();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content:
            'You are a study assistant. Generate 5 multiple-choice quiz questions from the provided text. Return ONLY a valid JSON object (no markdown) with a "questions" array. Each question must have: "question" (string), "options" (array of objects with "label" (A/B/C/D) and "text"), and "answer" (the correct label, e.g. "A").',
        },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });
    const content = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(content) as { questions?: unknown[] };
    res.json({ questions: result.questions ?? [] });
  } catch (err) {
    req.log.error({ err }, "Quiz generation failed");
    res.status(500).json({ error: "AI generation failed" });
  }
});

export default router;
