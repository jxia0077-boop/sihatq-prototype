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
  const [shown, setShown] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }

    setShown("");
    if (!text) {
      onDone?.();
      return;
    }

    let index = 0;
    // Reveal a few characters per tick for snappy ChatGPT-like pace
    const chunk = Math.max(1, Math.ceil(text.length / 120));
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + chunk);
      setShown(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        onDone?.();
      }
    }, speedMs);

    return () => window.clearInterval(timer);
    // Intentionally omit onDone to avoid restarting mid-animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speedMs, enabled]);

  return (
    <span className={className}>
      {shown}
      {enabled && shown.length < text.length ? (
        <span className="inline-block w-[0.4ch] animate-pulse">▍</span>
      ) : null}
    </span>
  );
}
