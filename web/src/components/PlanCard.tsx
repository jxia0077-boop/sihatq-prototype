"use client";

import type { AgentPlan } from "@/lib/ai/chat-client";

export function PlanCard({
  plan,
  busy,
  onApprove,
  onDecline,
}: {
  plan: AgentPlan;
  busy?: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="mt-2 rounded-xl border border-primary/30 bg-primary-container/20 p-3 text-sm text-on-surface">
      <p className="font-headline text-xs font-semibold uppercase tracking-wide text-primary">
        Proposed plan
      </p>
      <p className="mt-1 text-[13px] font-medium">{plan.goal}</p>

      <ol className="mt-2 space-y-1.5 border-t border-outline-variant/30 pt-2">
        {plan.steps.map((step, index) => (
          <li key={step.id} className="text-xs leading-relaxed">
            <span className="font-semibold">
              {index + 1}. {step.tool || step.action || "step"}
            </span>
            <span className="text-on-surface-variant"> — {step.reason}</span>
          </li>
        ))}
      </ol>

      {plan.risks.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-[11px] text-on-surface-variant">
          {plan.risks.map((risk) => (
            <li key={risk}>• {risk}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onApprove}
          className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-on-primary disabled:opacity-60"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDecline}
          className="flex-1 rounded-lg border border-outline-variant/50 bg-white px-3 py-2 text-xs font-semibold text-on-surface disabled:opacity-60"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
