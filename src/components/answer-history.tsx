"use client";

import { useEffect, useRef } from "react";
import type { HistoryEntry } from "@/types/game";

type Props = {
  history: HistoryEntry[];
};

const STATUS_COLOR: Record<string, string> = {
  IN_PROGRESS: "text-green-500",
  SOLVED: "text-amber-400",
};

export function AnswerHistory({ history }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history.length]);

  if (history.length === 0) return null;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto border border-zinc-800 bg-black/50 p-3 text-xs leading-relaxed">
      {history.map((entry, i) => {
        const color = STATUS_COLOR[entry.answer.status] ?? "text-zinc-500";
        return (
          <div key={i} className="mb-2">
            <p className="text-zinc-500">
              <span className="text-zinc-600">[{String(i + 1).padStart(3, "0")}]</span>{" "}
              <span className="text-zinc-400">[USER_QUERY] &gt;</span>{" "}
              {entry.question}
            </p>
            <p className={color}>
              <span className="text-zinc-600">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>{" "}
              <span className="text-zinc-400">[SYS_JUDGE] :</span>{" "}
              {entry.answer.message}
            </p>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
