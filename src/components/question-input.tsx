"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

const MAX_LEN = 50;
const COOLDOWN_MS = 3_000;

type Props = {
  onSubmit: (question: string) => void;
  disabled: boolean;
};

export function QuestionInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled || cooldown) return;

      onSubmit(trimmed);
      setValue("");
      setCooldown(true);
      timerRef.current = setTimeout(() => setCooldown(false), COOLDOWN_MS);
    },
    [value, disabled, cooldown, onSubmit]
  );

  const blocked = disabled || cooldown;

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, MAX_LEN))}
        maxLength={MAX_LEN}
        placeholder="输入你的问题…（只能用是/否回答的问题）"
        disabled={blocked}
        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm
                   text-zinc-100 placeholder-zinc-500 outline-none transition-colors
                   focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30
                   disabled:opacity-40"
      />
      <button
        type="submit"
        disabled={blocked || !value.trim()}
        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white
                   transition-all hover:bg-amber-500 active:scale-95
                   disabled:pointer-events-none disabled:opacity-40"
      >
        {cooldown ? "冷却中…" : "提问"}
      </button>
    </form>
  );
}
