export type ToolKey =
  | "flashcards"
  | "summarizer"
  | "quiz"
  | "notes"
  | "chatbot"
  | "calculator"
  | "pomodoro"
  | "progress"
  | "todo"
  | "board";

export const TOOL_COSTS: Record<ToolKey, { label: string; cost: number; unit: string }> = {
  flashcards: { label: "AI Flashcards", cost: 15, unit: "generation" },
  summarizer: { label: "AI Summarizer", cost: 10, unit: "summary" },
  quiz: { label: "AI Quiz", cost: 20, unit: "quiz" },
  notes: { label: "AI Notes", cost: 12, unit: "note generation" },
  chatbot: { label: "Study Chat", cost: 5, unit: "message" },
  calculator: { label: "Calculator", cost: 1, unit: "calculation" },
  pomodoro: { label: "Focus Session", cost: 5, unit: "session" },
  progress: { label: "Study Goal", cost: 2, unit: "goal" },
  todo: { label: "Todo Task", cost: 1, unit: "task" },
  board: { label: "Board Task", cost: 1, unit: "task" },
};