"use client";

import { useState, type FormEvent } from "react";

type Props = {
  onSubmit: (question: string) => void;
  disabled: boolean;
};

export function QuestionInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="输入你的问题…（只能用是/否回答的问题）"
        disabled={disabled}
        className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800/80 px-4 py-2.5 text-sm
                   text-zinc-100 placeholder-zinc-500 outline-none transition-colors
                   focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30
                   disabled:opacity-40"
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white
                   transition-all hover:bg-amber-500 active:scale-95
                   disabled:pointer-events-none disabled:opacity-40"
      >
        提问
      </button>
    </form>
  );
}
