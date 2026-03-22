import { z } from "zod";

// ─── Domain Models ──────────────────────────────────────────
export type Puzzle = {
  id: string;
  surfaceStory: string;
  truthBase: string;
};

export enum GameState {
  IDLE = "IDLE",
  THINKING = "THINKING",
  ANSWERED = "ANSWERED",
  SOLVED = "SOLVED",
}

// ─── AI Judge Output Contract (Structured Output) ──────────
export const AIResponseSchema = z.object({
  status: z.enum(["YES", "NO", "IRRELEVANT", "SOLVED"]),
  message: z.string().describe("给玩家的自然语言简短回复"),
  reasoning: z
    .string()
    .describe("AI内部的推理过程，不展示给前端，仅用于逻辑追踪"),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// ─── API Request / Response Contracts ──────────────────────
export const JudgeRequestSchema = z.object({
  puzzleId: z.string(),
  question: z.string().min(1, "问题不能为空"),
  history: z.array(
    z.object({
      question: z.string(),
      answer: z.object({
        status: z.enum(["YES", "NO", "IRRELEVANT", "SOLVED"]),
        message: z.string(),
      }),
    })
  ),
});

export type JudgeRequest = z.infer<typeof JudgeRequestSchema>;

export type HistoryEntry = {
  question: string;
  answer: {
    status: AIResponse["status"];
    message: string;
  };
};
