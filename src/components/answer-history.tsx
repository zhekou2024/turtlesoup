"use client";

import type { HistoryEntry } from "@/types/game";

type Props = {
  history: HistoryEntry[];
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  YES: { label: "是", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  NO: { label: "否", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  IRRELEVANT: { label: "无关", color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  SOLVED: { label: "破案！", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

export function AnswerHistory({ history }: Props) {
  if (history.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        对话记录 ({history.length})
      </h3>
      <div className="space-y-2">
        {history.map((entry, i) => {
          const style = STATUS_STYLE[entry.answer.status];
          return (
            <div
              key={i}
              className="rounded-lg border border-zinc-700/40 bg-zinc-800/40 p-3"
            >
              <p className="text-sm text-zinc-300">
                <span className="mr-1.5 text-zinc-500">Q{i + 1}.</span>
                {entry.question}
              </p>
              <div className="mt-1.5 flex items-start gap-2">
                <span
                  className={`inline-block shrink-0 rounded border px-1.5 py-0.5 text-xs font-medium ${style?.color}`}
                >
                  {style?.label}
                </span>
                <p className="text-sm text-zinc-400">{entry.answer.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
