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
  status: z.enum(["IN_PROGRESS", "SOLVED"]),
  message: z.string().describe("给玩家看的自然语言回复（是/否/无关/破案祝贺）"),
  reasoning: z
    .string()
    .describe("AI内部的推理过程与清单核对，不展示给前端"),
});

export type AIResponse = z.infer<typeof AIResponseSchema>;

// ─── API Request / Response Contracts ──────────────────────
export const JudgeRequestSchema = z.object({
  puzzleId: z.string().min(1).max(64),
  question: z.string().min(1, "问题不能为空").max(50, "问题不能超过50个字符"),
  history: z
    .array(
      z.object({
        question: z.string().max(50),
        answer: z.object({
          status: z.enum(["IN_PROGRESS", "SOLVED"]),
          message: z.string().max(200),
        }),
      })
    )
    .max(20, "历史记录过长"),
});

export type JudgeRequest = z.infer<typeof JudgeRequestSchema>;

export type HistoryEntry = {
  question: string;
  answer: {
    status: AIResponse["status"];
    message: string;
  };
};
