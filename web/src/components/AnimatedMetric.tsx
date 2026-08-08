"use client";

import { useEffect, useState, type CSSProperties } from "react";

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function AnimatedNumber({
  value,
  suffix = "%",
  durationMs = 800,
  delayMs = 0,
  className,
}: {
  value: number;
  suffix?: string;
  durationMs?: number;
  delayMs?: number;
  className?: string;
}) {
  const target = clamp(value);
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    let start: number | null = null;

    const delay = window.setTimeout(() => {
      if (reduced) {
        setDisplayed(target);
        return;
      }

      const tick = (timestamp: number) => {
        start ??= timestamp;
        const progress = Math.min(1, (timestamp - start) / durationMs);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayed(Math.round(target * eased));
        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
        }
      };

      frame = window.requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(delay);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [delayMs, durationMs, target]);

  return (
    <span className={className}>
      {displayed}
      {suffix}
    </span>
  );
}

export function AnimatedMeter({
  value,
  tone = "primary",
  delayMs = 0,
  heightClass = "h-3",
}: {
  value: number;
  tone?: "primary" | "secondary" | "aqua";
  delayMs?: number;
  heightClass?: string;
}) {
  const fillClass =
    tone === "secondary"
      ? "bg-secondary"
      : tone === "aqua"
        ? "bg-[var(--brand-aqua)]"
        : "bg-primary";

  return (
    <div
      className={`${heightClass} overflow-hidden rounded-full bg-surface-container`}
      aria-hidden="true"
    >
      <div
        className={`sihatq-meter-fill h-full rounded-full ${fillClass}`}
        style={
          {
            "--sihatq-meter-target": `${clamp(value)}%`,
            "--sihatq-meter-delay": `${delayMs}ms`,
          } as CSSProperties
        }
      />
    </div>
  );
}
