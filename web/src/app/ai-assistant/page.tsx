"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Disclaimer } from "@/components/Disclaimer";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
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
  }, [messages, loading]);

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
        { id: `a-${Date.now()}`, role: "assistant", content: data.reply },
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
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {message.content}
            </p>
          </div>
        ))}

        {loading ? (
          <p className="text-sm text-on-surface-variant">Thinking...</p>
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
