import { Router } from "express";
import OpenAI from "openai";

const router = Router();

function validateText(body: unknown): { text: string } | null {
  if (!body || typeof body !== "object") return null;
  const t = (body as Record<string, unknown>)["text"];
  if (typeof t !== "string" || t.trim().length === 0 || t.length > 20000) return null;
  return { text: t.trim() };
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });
}

router.post("/ai/flashcards", async (req, res) => {
  const parsed = validateText(req.body);
  if (!parsed) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { text } = parsed;
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a study assistant. Generate flashcards from the provided text. Return a JSON object with a 'flashcards' array, each item having 'question' and 'answer' fields. Generate 5-10 flashcards. Return only valid JSON, no markdown.",
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
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a study assistant. Summarize the provided text concisely, highlighting the key points and main concepts. Return a JSON object with a 'summary' field containing the summary text. Return only valid JSON, no markdown.",
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
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a study assistant. Generate multiple-choice quiz questions from the provided text. Return a JSON object with a 'questions' array. Each question must have: 'question' (string), 'options' (array of objects with 'label' (A/B/C/D) and 'text'), and 'answer' (the label of the correct option, e.g. 'A'). Generate 5 questions. Return only valid JSON, no markdown.`,
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
