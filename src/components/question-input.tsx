"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

const MAX_LEN = 50;
const COOLDOWN_MS = 3_000;
const ERR_DISPLAY_MS = 3_000;

type Props = {
  onSubmit: (question: string) => void;
  disabled: boolean;
  isDecrypted: boolean;
  error: string | null;
};

function classifyError(msg: string): string | null {
  if (/频繁|429/.test(msg)) return "[ERR_429: TOO_MANY_REQUESTS]";
  if (/格式|校验|超过|400/.test(msg)) return "[ERR_400: BAD_REQUEST]";
  return null;
}

export function QuestionInput({ onSubmit, disabled, isDecrypted, error }: Props) {
  const [value, setValue] = useState("");
  const [cooldown, setCooldown] = useState(false);
  const [errPrefix, setErrPrefix] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const errTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef(-1);
  const draftRef = useRef("");

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(errTimerRef.current);
  }, []);

  // Error prefix auto-recovery
  const prevErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      const code = classifyError(error);
      if (code) {
        setErrPrefix(code);
        clearTimeout(errTimerRef.current);
        errTimerRef.current = setTimeout(() => setErrPrefix(null), ERR_DISPLAY_MS);
      }
    }
    prevErrorRef.current = error;
  }, [error]);

  useEffect(() => {
    if (!disabled && !cooldown && !isDecrypted && !errPrefix) inputRef.current?.focus();
  }, [disabled, cooldown, isDecrypted, errPrefix]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (!trimmed || disabled || cooldown || isDecrypted || errPrefix) return;

      commandHistory.current.push(trimmed);
      historyIndex.current = -1;
      draftRef.current = "";

      onSubmit(trimmed);
      setValue("");
      setCooldown(true);
      timerRef.current = setTimeout(() => setCooldown(false), COOLDOWN_MS);
    },
    [value, disabled, cooldown, isDecrypted, errPrefix, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const hist = commandHistory.current;
      if (hist.length === 0) return;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (historyIndex.current === -1) draftRef.current = value;
        const next = historyIndex.current === -1 ? hist.length - 1 : Math.max(0, historyIndex.current - 1);
        historyIndex.current = next;
        setValue(hist[next]);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex.current === -1) return;
        const next = historyIndex.current + 1;
        if (next >= hist.length) {
          historyIndex.current = -1;
          setValue(draftRef.current);
        } else {
          historyIndex.current = next;
          setValue(hist[next]);
        }
      }
    },
    [value]
  );

  if (isDecrypted) {
    return (
      <div className="shrink-0 flex items-center gap-2 text-xs">
        <span className="text-red-500">[SESSION_TERMINATED] : ACCESS_DENIED</span>
      </div>
    );
  }

  const blocked = disabled || cooldown || !!errPrefix;
  const prefix = errPrefix
    ? errPrefix
    : blocked
      ? "[PROCESSING...]"
      : "root@turtle-engine:~#";
  const prefixColor = errPrefix
    ? "text-red-500 animate-pulse"
    : blocked
      ? "text-amber-500 animate-pulse"
      : "text-green-600";

  return (
    <form onSubmit={handleSubmit} className="shrink-0 flex items-center gap-2 text-xs">
      <span className={`shrink-0 ${prefixColor}`}>
        {prefix}
      </span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { setValue(e.target.value.slice(0, MAX_LEN)); historyIndex.current = -1; }}
        onKeyDown={handleKeyDown}
        maxLength={MAX_LEN}
        placeholder={blocked ? "" : "输入你的问题…"}
        disabled={blocked}
        className="flex-1 bg-transparent text-green-400 placeholder-zinc-700
                   caret-green-500 outline-none disabled:opacity-40"
      />
    </form>
  );
}
