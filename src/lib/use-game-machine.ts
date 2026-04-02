"use client";

import { useCallback, useReducer } from "react";
import {
  GameState,
  type AIResponse,
  type HistoryEntry,
} from "@/types/game";

// ─── State Shape ────────────────────────────────────────────
type MachineState = {
  phase: GameState;
  history: HistoryEntry[];
  error: string | null;
};

// ─── Actions ────────────────────────────────────────────────
type Action =
  | { type: "ASK" }
  | { type: "RECEIVE"; answer: Pick<AIResponse, "status" | "message">; question: string }
  | { type: "ERROR"; message: string };

function reducer(state: MachineState, action: Action): MachineState {
  switch (action.type) {
    case "ASK":
      if (state.phase === GameState.SOLVED) return state;
      return { ...state, phase: GameState.THINKING, error: null };

    case "RECEIVE": {
      const entry: HistoryEntry = {
        question: action.question,
        answer: action.answer,
      };
      const nextPhase =
        action.answer.status === "SOLVED"
          ? GameState.SOLVED
          : GameState.ANSWERED;
      return {
        ...state,
        phase: nextPhase,
        history: [...state.history, entry],
      };
    }

    case "ERROR":
      return {
        ...state,
        phase: state.history.length > 0 ? GameState.ANSWERED : GameState.IDLE,
        error: action.message,
      };

    default:
      return state;
  }
}

const INITIAL_STATE: MachineState = {
  phase: GameState.IDLE,
  history: [],
  error: null,
};

// ─── Hook ───────────────────────────────────────────────────
export function useGameMachine(puzzleId: string) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const ask = useCallback(
    async (question: string) => {
      dispatch({ type: "ASK" });

      try {
        const res = await fetch("/api/judge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleId,
            question,
            history: state.history,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const serverMsg = (body as { error?: string }).error;
          const fallback: Record<number, string> = {
            400: "问题格式有误，请检查后重试",
            429: "发送太频繁，请稍后再试",
          };
          throw new Error(serverMsg ?? fallback[res.status] ?? `服务异常 (${res.status})`);
        }

        const answer = (await res.json()) as Pick<AIResponse, "status" | "message">;
        dispatch({ type: "RECEIVE", answer, question });
      } catch (err) {
        dispatch({
          type: "ERROR",
          message: err instanceof Error ? err.message : "网络错误",
        });
      }
    },
    [puzzleId, state.history]
  );

  return { state, ask } as const;
}
