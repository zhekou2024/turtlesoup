"use client";

import { GameState, type Puzzle } from "@/types/game";
import { QuestionInput } from "./question-input";
import { AnswerHistory } from "./answer-history";
import type { useGameMachine } from "@/lib/use-game-machine";

type GameReturn = ReturnType<typeof useGameMachine>;

type Props = {
  state: GameReturn["state"];
  onAsk: (question: string) => void;
  onReset: () => void;
  puzzle: Puzzle;
};

export function GameBoard({ state, onAsk, onReset, puzzle }: Props) {
  const isSolved = state.phase === GameState.SOLVED;
  const isThinking = state.phase === GameState.THINKING;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium uppercase tracking-wider text-amber-500/70">
            汤面
          </span>
          <p className="mt-1 text-sm leading-relaxed text-zinc-200">
            {puzzle.surfaceStory}
          </p>
        </div>
        <button
          onClick={onReset}
          className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs
                     text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200"
        >
          换题
        </button>
      </div>

      {/* Solved Banner */}
      {isSolved && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-400">
            恭喜破案！真相已揭晓 🎉
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            {puzzle.truthBase}
          </p>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5">
          <p className="text-sm text-red-400">{state.error}</p>
        </div>
      )}

      {/* Thinking Indicator */}
      {isThinking && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          裁判思考中…
        </div>
      )}

      {/* History */}
      <AnswerHistory history={state.history} />

      {/* Input */}
      {!isSolved && (
        <QuestionInput onSubmit={onAsk} disabled={isThinking} />
      )}
    </div>
  );
}
