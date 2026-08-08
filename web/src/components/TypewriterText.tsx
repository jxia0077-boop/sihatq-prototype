"use client";

import { useEffect, useState } from "react";

/** Fast character-by-character reveal (ChatGPT-style). */
export function TypewriterText({
  text,
  speedMs = 10,
  enabled = true,
  className,
  onDone,
}: {
  text: string;
  speedMs?: number;
  enabled?: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState("");
  const visibleText = enabled ? shown : text;

  useEffect(() => {
    if (!enabled) return;

    let timer: number | undefined;
    const resetTimer = window.setTimeout(() => {
      setShown("");
    }, 0);
    if (!text) {
      onDone?.();
      return () => window.clearTimeout(resetTimer);
    }

    let index = 0;
    // Reveal a few characters per tick for snappy ChatGPT-like pace
    const chunk = Math.max(1, Math.ceil(text.length / 120));
    const startTimer = window.setTimeout(() => {
      timer = window.setInterval(() => {
        index = Math.min(text.length, index + chunk);
        setShown(text.slice(0, index));
        if (index >= text.length) {
          if (timer) window.clearInterval(timer);
          onDone?.();
        }
      }, speedMs);
    }, 0);

    return () => {
      window.clearTimeout(resetTimer);
      window.clearTimeout(startTimer);
      if (timer) window.clearInterval(timer);
    };
    // Intentionally omit onDone to avoid restarting mid-animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speedMs, enabled]);

  return (
    <span className={className}>
      {visibleText}
      {enabled && visibleText.length < text.length ? (
        <span className="inline-block w-[0.4ch] animate-pulse">▍</span>
      ) : null}
    </span>
  );
}
