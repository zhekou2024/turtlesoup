"use client";

import { useGameMachine } from "@/lib/use-game-machine";
import { PuzzleSelector } from "@/components/puzzle-selector";
import { GameBoard } from "@/components/game-board";

export default function Home() {
  const { state, selectPuzzle, ask, reset } = useGameMachine();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col px-4 py-12">
      {/* Title */}
      <header className="mb-10 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
          🐢 海龟汤
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          情境猜谜 · 用是非题探索真相
        </p>
      </header>

      {/* Main Area */}
      <div className="flex-1">
        {!state.puzzle ? (
          <PuzzleSelector onSelect={selectPuzzle} />
        ) : (
          <GameBoard
            state={state}
            onAsk={ask}
            onReset={reset}
            puzzle={state.puzzle}
          />
        )}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-zinc-600">
        AI 裁判由 GPT-4o-mini + Structured Outputs 驱动
      </footer>
    </main>
  );
}
