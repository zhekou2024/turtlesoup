"use client";

import type { Puzzle } from "@/types/game";
import { PUZZLES } from "@/data/puzzles";

type Props = {
  onSelect: (puzzle: Puzzle) => void;
};

export function PuzzleSelector({ onSelect }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-300">选择谜题</h2>
      <div className="grid gap-3">
        {PUZZLES.map((puzzle) => (
          <button
            key={puzzle.id}
            onClick={() => onSelect(puzzle)}
            className="group relative rounded-xl border border-zinc-700/50 bg-zinc-800/60 p-4 text-left
                       backdrop-blur transition-all hover:border-amber-500/40 hover:bg-zinc-800
                       hover:shadow-[0_0_24px_-6px_rgba(245,158,11,0.15)]"
          >
            <p className="text-sm leading-relaxed text-zinc-300 group-hover:text-zinc-100">
              {puzzle.surfaceStory}
            </p>
            <span className="mt-2 inline-block text-xs text-zinc-500 group-hover:text-amber-500/70">
              点击开始 →
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
