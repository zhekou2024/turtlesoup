"use client";

import { useState } from "react";
import { GameState } from "@/types/game";
import { QuestionInput } from "./question-input";
import { AnswerHistory } from "./answer-history";
import { RevealBottom } from "./reveal-bottom";
import { useGameMachine } from "@/lib/use-game-machine";

export interface GameBoardProps {
  puzzleId: string;
  bottomText: string;
}

export function GameBoard({ puzzleId, bottomText }: GameBoardProps) {
  const { state, ask } = useGameMachine(puzzleId);
  const [isDecrypted, setIsDecrypted] = useState(false);

  const isSolved = state.phase === GameState.SOLVED;
  const isThinking = state.phase === GameState.THINKING;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Boot line */}
      <p className="shrink-0 text-xs text-zinc-600">
        --- SESSION STARTED | PUZZLE_ID: {puzzleId} ---
      </p>

      {/* Solved */}
      {isSolved && (
        <div className="shrink-0 border border-amber-800 p-3 text-xs">
          <p className="text-amber-500">{">"} STATUS: CASE_SOLVED</p>
          <p className="text-amber-400">{">"} 恭喜破案。真相已解锁。</p>
        </div>
      )}

      {/* Error */}
      {state.error && (
        <p className="shrink-0 text-xs text-red-500">
          [ERROR] {state.error}
        </p>
      )}

      {/* Thinking */}
      {isThinking && (
        <p className="shrink-0 animate-pulse text-xs text-zinc-500">
          [SYS] JUDGE_ENGINE processing...
        </p>
      )}

      {/* Log stream — flex-1 scrollable zone */}
      <AnswerHistory history={state.history} />

      {/* CLI input */}
      {!isSolved && (
        <QuestionInput
          onSubmit={ask}
          disabled={isThinking}
          isDecrypted={isDecrypted}
          error={state.error}
        />
      )}

      {/* Decrypt zone */}
      <div className="shrink-0 border-t border-zinc-800 pt-3">
        <RevealBottom
          bottomText={bottomText}
          isDecrypted={isDecrypted}
          setIsDecrypted={setIsDecrypted}
        />
      </div>
    </div>
  );
}
