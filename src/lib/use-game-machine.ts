"use client";

import { useCallback, useReducer } from "react";
import {
  GameState,
  type AIResponse,
  type HistoryEntry,
  type Puzzle,
} from "@/types/game";

// ─── State Shape ────────────────────────────────────────────
type MachineState = {
  phase: GameState;
  puzzle: Puzzle | null;
  history: HistoryEntry[];
  error: string | null;
};

// ─── Actions ────────────────────────────────────────────────
type Action =
  | { type: "SELECT_PUZZLE"; puzzle: Puzzle }
  | { type: "ASK" }
  | { type: "RECEIVE"; answer: Pick<AIResponse, "status" | "message">; question: string }
  | { type: "ERROR"; message: string }
  | { type: "RESET" };

function reducer(state: MachineState, action: Action): MachineState {
  switch (action.type) {
    case "SELECT_PUZZLE":
      return {
        phase: GameState.IDLE,
        puzzle: action.puzzle,
        history: [],
        error: null,
      };

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

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}

const INITIAL_STATE: MachineState = {
  phase: GameState.IDLE,
  puzzle: null,
  history: [],
  error: null,
};

// ─── Hook ───────────────────────────────────────────────────
export function useGameMachine() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  const selectPuzzle = useCallback(
    (puzzle: Puzzle) => dispatch({ type: "SELECT_PUZZLE", puzzle }),
    []
  );

  const ask = useCallback(
    async (question: string) => {
      if (!state.puzzle) return;
      dispatch({ type: "ASK" });

      try {
        const res = await fetch("/api/judge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            puzzleId: state.puzzle.id,
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
    [state.puzzle, state.history]
  );

  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return { state, selectPuzzle, ask, reset } as const;
}
