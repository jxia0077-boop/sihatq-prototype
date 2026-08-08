"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  "What does my NHMS comparison mean?",
];

const HIDDEN_PATHS = [
  "/",
  "/login",
  "/sign-up",
  "/start-alt",
  "/ai-assistant",
];

function shouldHideWidget(pathname: string) {
  return HIDDEN_PATHS.includes(pathname) || pathname.startsWith("/admin");
}

export function AiChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
        "Based on your profile, I can explain your SihatQ risk insight using public Malaysian health statistics. This is not a diagnosis.",
    },
    {
      id: "welcome-2",
      role: "assistant",
      content:
        "For medical concerns, please consult a qualified doctor or nearby clinic.",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);

  const hidden = shouldHideWidget(pathname);

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading, liveThinking]);

  if (hidden) return null;

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
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="fixed bottom-24 right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 transition hover:scale-105 active:scale-95 md:bottom-8"
        aria-label={open ? "Close AI assistant" : "Open AI assistant"}
      >
        <span className="material-symbols-outlined text-[28px]">
          {open ? "close" : "smart_toy"}
        </span>
      </button>

      {open ? (
        <div className="fixed bottom-40 right-4 z-[60] flex h-[min(70vh,560px)] w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface shadow-2xl md:bottom-24">
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-on-primary">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">smart_toy</span>
              <div>
                <p className="font-headline text-sm font-semibold">
                  SihatQ AI Assistant
                </p>
                <p className="text-[11px] opacity-80">Preventive info only</p>
              </div>
            </div>
            <Link
              href="/ai-assistant"
              className="rounded-full bg-white/15 px-2 py-1 text-[11px] font-semibold"
            >
              Full page
            </Link>
          </div>

          <div className="border-b border-error/10 bg-error-container/30 px-3 py-2 text-[11px] text-on-error-container">
            Safety disclaimer: general preventive information only — not medical
            advice.
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto px-3 py-3"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-white"
                    : "mr-8 rounded-2xl rounded-bl-sm border border-outline-variant/30 bg-white px-3 py-2 text-sm text-on-surface shadow-sm"
                }
              >
                {message.role === "assistant" && message.thinking?.length ? (
                  <ThinkingTrace steps={message.thinking} />
                ) : null}
                <p className="whitespace-pre-wrap">
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
              <div className="mr-8 rounded-2xl rounded-bl-sm border border-outline-variant/30 bg-white px-3 py-2 shadow-sm">
                <ThinkingTrace steps={liveThinking} active />
              </div>
            ) : null}

            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-on-surface-variant">
                Suggested for you
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void sendMessage(item)}
                    className="rounded-full border border-outline-variant/30 bg-secondary-container/40 px-3 py-1 text-[11px] text-on-secondary-container"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={onSubmit}
            className="flex items-center gap-2 border-t border-outline-variant/20 bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your health question..."
              className="flex-1 rounded-xl border border-outline-variant bg-surface px-3 py-2 text-sm outline-none ring-primary focus:ring-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
