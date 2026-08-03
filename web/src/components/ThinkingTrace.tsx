"use client";

import { useEffect, useState } from "react";
import type { ThinkingStep } from "@/lib/ai/chat-client";
import { TypewriterText } from "@/components/TypewriterText";

export type { ThinkingStep };

export function ThinkingTrace({
  steps,
  active = false,
  defaultOpen,
}: {
  steps: ThinkingStep[];
  active?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? active);
  const lastIndex = steps.length - 1;

  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  if (steps.length === 0 && !active) return null;

  return (
    <div className="mb-2 rounded-xl border border-outline-variant/30 bg-surface-container/50 text-sm">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-on-surface-variant"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2 font-medium">
          <span
            className={`material-symbols-outlined text-[18px] ${
              active ? "animate-pulse text-primary" : ""
            }`}
          >
            {active ? "psychology" : "expand_all"}
          </span>
          {active ? "Thinking..." : "Thought process"}
          {!active && steps.length > 0 ? (
            <span className="text-xs opacity-70">({steps.length} steps)</span>
          ) : null}
        </span>
        <span className="material-symbols-outlined text-[18px]">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>

      {open ? (
        <ol className="space-y-2 border-t border-outline-variant/20 px-3 py-2">
          {steps.map((step, index) => {
            const isLatest = index === lastIndex;
            const shouldType = active && isLatest;
            return (
              <li key={`${step.id}-${index}`} className="text-xs leading-relaxed">
                <p className="font-semibold text-on-surface">
                  <TypewriterText
                    text={`${index + 1}. ${step.label}`}
                    enabled={shouldType}
                    speedMs={8}
                  />
                </p>
                {step.detail ? (
                  <p className="mt-0.5 whitespace-pre-wrap text-on-surface-variant">
                    <TypewriterText
                      text={step.detail}
                      enabled={shouldType}
                      speedMs={6}
                    />
                  </p>
                ) : null}
              </li>
            );
          })}
          {active && steps.length === 0 ? (
            <li className="text-xs text-on-surface-variant">
              <TypewriterText text="Getting ready…" enabled speedMs={12} />
            </li>
          ) : null}
        </ol>
      ) : null}
    </div>
  );
}
