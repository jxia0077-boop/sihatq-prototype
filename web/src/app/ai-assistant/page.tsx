"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";
import { PlanCard } from "@/components/PlanCard";
import {
  ThinkingTrace,
  type ThinkingStep,
} from "@/components/ThinkingTrace";
import { TypewriterText } from "@/components/TypewriterText";
import {
  streamAiChat,
  type AgentPlan,
} from "@/lib/ai/chat-client";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  thinking?: ThinkingStep[];
  animate?: boolean;
  plan?: AgentPlan;
  planQuestion?: string;
  planResolved?: boolean;
};

const SUGGESTIONS = [
  "Why is my diabetes risk higher?",
  "What screening should I consider?",
  "How can I reduce sugary drinks?",
  "What does my state comparison mean?",
];

export default function AiAssistantPage() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [liveThinking, setLiveThinking] = useState<ThinkingStep[]>([]);
  const thinkingRef = useRef<ThinkingStep[]>([]);
  const sessionIdRef = useRef(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `sess-${Date.now()}`,
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Based on your profile, your risk insight is related to metabolic or lifestyle health signals. This is not a diagnosis, but it can help you decide what preventive action to take next.",
    },
    {
      id: "welcome-2",
      role: "assistant",
      content:
        "For medical concerns, please consult a qualified doctor or nearby clinic.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, liveThinking]);

  async function runChat(
    message: string,
    options?: {
      planDecision?: "approve" | "decline";
      approvedPlan?: AgentPlan;
      replaceId?: string;
    },
  ) {
    setLoading(true);
    setLiveThinking([]);
    thinkingRef.current = [];

    const history = messages
      .filter(
        (m) =>
          (m.role === "user" || m.role === "assistant") &&
          !m.id.startsWith("welcome") &&
          m.id !== options?.replaceId &&
          m.content.trim().length > 0,
      )
      .slice(-20)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, 1500),
      }));

    try {
      const data = await streamAiChat(
        message,
        (steps) => {
          thinkingRef.current = steps;
          setLiveThinking(steps);
        },
        {
          planDecision: options?.planDecision,
          approvedPlan: options?.approvedPlan,
          history,
          sessionId: sessionIdRef.current,
        },
      );

      if (data.kind === "plan") {
        const planMsg: ChatMessage = {
          id: options?.replaceId || `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          thinking: data.thinking,
          plan: data.plan,
          planQuestion: message,
          animate: !options?.replaceId,
        };
        setMessages((current) => {
          if (options?.replaceId) {
            return current.map((item) =>
              item.id === options.replaceId
                ? { ...planMsg, animate: false, planResolved: false }
                : item,
            );
          }
          return [...current, planMsg];
        });
        return;
      }

      const doneMsg: ChatMessage = {
        id: options?.replaceId || `a-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        thinking: data.thinking,
        animate: true,
        planResolved: true,
      };
      setMessages((current) => {
        if (options?.replaceId) {
          return current.map((item) =>
            item.id === options.replaceId
              ? { ...doneMsg, plan: undefined, planQuestion: undefined }
              : item,
          );
        }
        return [...current, doneMsg];
      });
    } catch (error) {
      const errMsg = {
        id: `e-${Date.now()}`,
        role: "assistant" as const,
        content:
          error instanceof Error
            ? error.message
            : "Sorry, I could not answer right now.",
        thinking:
          thinkingRef.current.length > 0 ? thinkingRef.current : undefined,
      };
      setMessages((current) => {
        if (options?.replaceId) {
          return current.map((item) =>
            item.id === options.replaceId
              ? { ...errMsg, planResolved: true, plan: undefined }
              : item,
          );
        }
        return [...current, errMsg];
      });
    } finally {
      setLoading(false);
      setLiveThinking([]);
      thinkingRef.current = [];
    }
  }

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setInput("");
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", content: message },
    ]);
    await runChat(message);
  }

  async function onApprovePlan(msg: ChatMessage) {
    if (!msg.plan || !msg.planQuestion || loading) return;
    setMessages((current) =>
      current.map((item) =>
        item.id === msg.id ? { ...item, planResolved: true } : item,
      ),
    );
    await runChat(msg.planQuestion, {
      planDecision: "approve",
      approvedPlan: msg.plan,
      replaceId: msg.id,
    });
  }

  async function onDeclinePlan(msg: ChatMessage) {
    if (!msg.planQuestion || loading) return;
    setMessages((current) =>
      current.map((item) =>
        item.id === msg.id ? { ...item, planResolved: true } : item,
      ),
    );
    await runChat(msg.planQuestion, {
      planDecision: "decline",
      replaceId: msg.id,
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <AppHeader backHref="/risk-insight" title="SihatQ AI Assistant" />

      <main
        ref={listRef}
        className="mx-auto w-full max-w-4xl flex-1 space-y-6 overflow-y-auto px-5 py-6 pb-48"
      >
        <div className="mb-2 flex items-start gap-3 rounded-xl border border-error/10 bg-error-container/30 p-4">
          <span className="material-symbols-outlined text-error">warning</span>
          <p className="text-sm text-on-error-container">
            <span className="font-bold">Safety disclaimer:</span> This assistant
            provides general preventive health information only and does not
            replace professional medical advice.
          </p>
        </div>

        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-primary p-4 text-white shadow-md"
                : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-outline-variant/30 bg-white p-4 shadow-sm"
            }
          >
            {message.role === "assistant" ? (
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-container">
                  <span className="material-symbols-outlined text-[18px] text-on-primary-container">
                    smart_toy
                  </span>
                </div>
                <span className="text-xs font-semibold text-on-surface-variant">
                  SihatQ AI
                </span>
              </div>
            ) : null}
            {message.role === "assistant" && message.thinking?.length ? (
              <ThinkingTrace steps={message.thinking} />
            ) : null}
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {message.role === "assistant" && message.animate ? (
                <TypewriterText
                  text={message.content}
                  enabled
                  speedMs={8}
                  onDone={() => {
                    setMessages((current) =>
                      current.map((item) =>
                        item.id === message.id
                          ? { ...item, animate: false }
                          : item,
                      ),
                    );
                  }}
                />
              ) : (
                message.content
              )}
            </p>
            {message.role === "assistant" &&
            message.plan &&
            !message.planResolved ? (
              <PlanCard
                plan={message.plan}
                busy={loading}
                onApprove={() => void onApprovePlan(message)}
                onDecline={() => void onDeclinePlan(message)}
              />
            ) : null}
          </div>
        ))}

        {loading ? (
          <div className="mr-auto max-w-[85%] rounded-2xl border border-outline-variant/30 bg-white p-4 shadow-sm">
            <ThinkingTrace steps={liveThinking} active />
          </div>
        ) : null}

        <div className="space-y-3 pt-4">
          <p className="text-sm font-medium text-on-surface-variant">
            Suggested for you:
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => void sendMessage(item)}
                className="rounded-full border border-outline-variant/20 bg-secondary-container/40 px-4 py-2 text-sm text-on-secondary-container transition hover:bg-secondary-container"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-surface-container-low p-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-secondary">
              info
            </span>
            <p className="text-xs italic text-on-surface-variant">
              Insights are based on user profile inputs and public Malaysian
              health statistics such as NHMS and MOH open data.
            </p>
          </div>
        </div>
        <Disclaimer />
      </main>

      <footer className="fixed bottom-16 left-0 z-40 w-full bg-white pt-3 shadow-[0_-4px_20px_0_rgba(0,106,97,0.05)] md:bottom-0">
        <form
          onSubmit={onSubmit}
          className="mx-auto flex max-w-4xl items-center gap-3 px-5 pb-3"
        >
          <div className="flex flex-1 items-center rounded-xl border border-outline-variant bg-surface-container-lowest px-4 py-2 focus-within:border-primary">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your health question..."
              className="flex-1 border-none bg-transparent text-[15px] outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20 disabled:opacity-60"
          >
            <span className="material-symbols-outlined">send</span>
          </button>
        </form>
        <div className="mx-auto flex max-w-4xl gap-3 px-5 pb-4">
          <Link
            href="/dashboard"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-secondary-container py-3 text-sm font-semibold text-on-secondary-container"
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            Back to Dashboard
          </Link>
          <Link
            href="/recommendations"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-container py-3 text-sm font-semibold text-on-primary-container"
          >
            Go to Actions
            <span className="material-symbols-outlined text-[18px]">
              arrow_forward
            </span>
          </Link>
        </div>
      </footer>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
