"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const SUGGESTIONS = [
  "Why is my diabetes risk higher?",
  "What screening should I consider?",
  "How can I reduce sugary drinks?",
  "What does my NHMS comparison mean?",
];

const HIDDEN_PATHS = ["/", "/login", "/sign-up", "/start-alt", "/ai-assistant"];

export function AiChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

  const hidden = HIDDEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith("/api"),
  );

  useEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, open, loading]);

  if (hidden) return null;

  async function sendMessage(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    setInput("");
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "user", content: message },
    ]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get reply");
      }
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Sorry, I could not answer right now.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <>
      {/* Floating bot button */}
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
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {loading ? (
              <p className="text-xs text-on-surface-variant">Thinking...</p>
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
