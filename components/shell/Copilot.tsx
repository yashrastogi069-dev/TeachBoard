"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ChatCircleDots,
  GraduationCap,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import Markdown from "@/components/artifacts/Markdown";
import { useTutor } from "@/components/shell/TutorContext";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

interface Message {
  role: "user" | "assistant";
  content: string;
}

/*
  The floating Professor: streaming Socratic chat, reachable on every page,
  aware of the lesson currently on screen via TutorContext. Errors are shown
  inline with their exact message (failure-visibility rule).
*/
export default function Copilot() {
  const reduce = useReducedMotion();
  const { lesson, open, setOpen, seedMessage, consumeSeed } = useTutor();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && seedMessage) {
      const seed = consumeSeed();
      if (seed) setInput(seed);
    }
  }, [open, seedMessage, consumeSeed]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "" },
    ]);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionRef.current,
          lessonId: lesson?.lessonId ?? null,
          message: text,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed with status ${res.status}`);
      }
      sessionRef.current = res.headers.get("X-Session-Id") ?? sessionRef.current;

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          const last = next[next.length - 1];
          next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : "The Professor is unreachable.";
      setError(detail);
      setMessages((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the Professor chat"
        className="fixed bottom-6 right-6 z-40 grid size-13 place-items-center rounded-full border border-accent/40 bg-bg-overlay text-accent-bright transition-transform duration-150 hover:scale-105 active:scale-[0.97]"
        style={{ boxShadow: "0 0 28px -6px var(--accent-glow)" }}
      >
        <ChatCircleDots size={24} weight="duotone" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/50"
            />
            <motion.aside
              initial={reduce ? { opacity: 0 } : { x: "100%" }}
              animate={reduce ? { opacity: 1 } : { x: 0 }}
              exit={reduce ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: 0.25, ease: EASE }}
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-bg-raised"
              role="dialog"
              aria-label="Professor chat panel"
            >
              <header className="flex items-center gap-3 border-b border-line px-5 py-4">
                <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                  <GraduationCap size={18} weight="duotone" />
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-semibold text-ink">The Professor</p>
                  <p className="truncate text-[11px] text-ink-faint">
                    {lesson
                      ? `discussing: ${lesson.lessonTitle}`
                      : "ask about anything you are learning"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close the Professor chat"
                  className="ml-auto grid size-8 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-bg-overlay hover:text-ink active:scale-[0.97]"
                >
                  <X size={16} />
                </button>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
                {messages.length === 0 && (
                  <div className="rounded-2xl border border-line bg-bg/40 p-4 text-xs leading-relaxed text-ink-muted">
                    Ask me anything about what you are learning. I will usually
                    answer with a question first, because reasoning it out
                    yourself is what makes it stick. Say &quot;just explain it&quot;
                    any time you want the direct version.
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={
                        m.role === "user"
                          ? "ml-8 rounded-2xl rounded-br-md bg-accent-soft px-4 py-2.5"
                          : "mr-4 rounded-2xl rounded-bl-md border border-line bg-bg/40 px-4 py-2.5"
                      }
                    >
                      {m.role === "user" ? (
                        <p className="text-xs leading-relaxed text-ink">{m.content}</p>
                      ) : m.content ? (
                        <Markdown text={m.content} />
                      ) : (
                        <span className="flex gap-1 py-1">
                          <span className="size-1.5 animate-pulse rounded-full bg-accent" />
                          <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:150ms]" />
                          <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:300ms]" />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {error && (
                  <p className="mt-3 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
                    {error}
                  </p>
                )}
              </div>

              <footer className="border-t border-line p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                  className="flex items-end gap-2 rounded-xl border border-line bg-bg/40 px-3 py-2"
                >
                  <textarea
                    rows={input.length > 80 ? 3 : 1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={busy ? "The Professor is thinking..." : "Ask the Professor"}
                    className="max-h-28 w-full resize-none bg-transparent text-xs leading-relaxed text-ink placeholder:text-ink-faint focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={busy || !input.trim()}
                    aria-label="Send message"
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-bright transition-transform duration-150 active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <PaperPlaneTilt size={14} weight="duotone" />
                  </button>
                </form>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
