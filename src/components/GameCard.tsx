import Link from "next/link";
import { Skull, Flame, Zap } from "lucide-react";
import type { Story, Difficulty } from "@/lib/stories";

const difficultyConfig: Record<
  Difficulty,
  { label: string; color: string; icon: typeof Skull }
> = {
  easy: { label: "入门", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: Zap },
  medium: { label: "进阶", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: Flame },
  hard: { label: "地狱", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: Skull },
};

export function GameCard({ story }: { story: Story }) {
  const diff = difficultyConfig[story.difficulty];
  const Icon = diff.icon;

  return (
    <Link
      href={`/game/${story.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl
                 border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur
                 transition-all duration-300
                 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5
                 hover:-translate-y-0.5"
    >
      {/* Difficulty badge */}
      <span
        className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border
                     px-2.5 py-0.5 text-xs font-medium ${diff.color}`}
      >
        <Icon className="h-3 w-3" />
        {diff.label}
      </span>

      {/* Title */}
      <h2 className="pr-16 text-lg font-semibold tracking-tight text-zinc-100
                      transition-colors group-hover:text-amber-400">
        {story.title}
      </h2>

      {/* Surface preview */}
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-400">
        {story.surface}
      </p>

      {/* Footer hint */}
      <span className="mt-4 inline-flex items-center gap-1 text-xs text-zinc-600
                        transition-colors group-hover:text-zinc-400">
        点击开始推理 →
      </span>
    </Link>
  );
}
