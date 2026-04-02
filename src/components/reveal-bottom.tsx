"use client";

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";

const TICK_MS = 50;

interface RevealBottomProps {
  bottomText: string;
  isDecrypted: boolean;
  setIsDecrypted: Dispatch<SetStateAction<boolean>>;
}

export function RevealBottom({ bottomText, isDecrypted, setIsDecrypted }: RevealBottomProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [done, setDone] = useState(false);
  const endRef = useRef<HTMLSpanElement>(null);
  const charIndex = useRef(0);

  useEffect(() => {
    if (!isDecrypted) return;

    charIndex.current = 0;
    setDisplayedText("");
    setDone(false);

    const timer = setInterval(() => {
      charIndex.current++;
      if (charIndex.current >= bottomText.length) {
        setDisplayedText(bottomText);
        setDone(true);
        clearInterval(timer);
      } else {
        setDisplayedText(bottomText.slice(0, charIndex.current));
      }
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [isDecrypted, bottomText]);

  useEffect(() => {
    if (isDecrypted) {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }
  }, [displayedText, isDecrypted]);

  if (!isDecrypted) {
    return (
      <button
        onClick={() => setIsDecrypted(true)}
        className="w-full border border-dashed border-red-800 px-4 py-2.5 text-xs
                   text-red-500 transition-colors hover:border-red-500 hover:bg-red-500/5
                   hover:text-red-400"
      >
        {"[ DECRYPT_TRUTH ]"}
      </button>
    );
  }

  return (
    <div className="text-xs">
      <p className="text-red-500">{">"} DECRYPTING CLASSIFIED DATA...</p>
      <p className="mt-1 text-red-500">{">"} ACCESS GRANTED.</p>
      <div className="mt-3 border-t border-zinc-800 pt-3">
        <p className="leading-relaxed text-zinc-300 whitespace-pre-wrap">
          {displayedText}
          {!done && <span className="animate-pulse text-green-500">█</span>}
          <span ref={endRef} />
        </p>
      </div>
      {done && (
        <Link
          href="/"
          className="mt-4 inline-block border border-red-800 px-4 py-1.5 text-red-500
                     transition-colors hover:border-red-500 hover:text-red-400"
        >
          {"[ SYSTEM_EXIT ]"}
        </Link>
      )}
    </div>
  );
}
