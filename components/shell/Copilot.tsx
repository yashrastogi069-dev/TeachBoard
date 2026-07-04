"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChatCircleDots, GraduationCap, X } from "@phosphor-icons/react";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

/*
  Global tutor entry point, reachable from every page. Until the Gemini key
  is connected (Phase 1), the panel shows its offline state honestly instead
  of a fake chat. The Phase 1 tutor API plugs into this same shell.
*/

export default function Copilot() {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

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
              className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-line bg-bg-raised"
              role="dialog"
              aria-label="Professor chat panel"
            >
              <header className="flex items-center gap-3 border-b border-line px-5 py-4">
                <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                  <GraduationCap size={18} weight="duotone" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-ink">The Professor</p>
                  <p className="text-[11px] text-warning">
                    offline · activates in Phase 1
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

              <div className="flex-1 overflow-y-auto px-5 py-6">
                <div className="rounded-2xl border border-line bg-bg/40 p-4 leading-relaxed">
                  <p className="text-xs text-ink">
                    This is where your Socratic tutor will live, one click away
                    from every page. Once your Gemini API key is connected it
                    can:
                  </p>
                  <ul className="flex list-disc flex-col gap-1.5 pl-4 pt-3 text-xs text-ink-muted">
                    <li>answer questions about the lesson you are viewing</li>
                    <li>challenge you with follow-up scenarios</li>
                    <li>explain a concept a different way when you are stuck</li>
                    <li>walk through why you lost rubric points on a test</li>
                  </ul>
                </div>
              </div>

              <footer className="border-t border-line p-4">
                <div className="flex items-center gap-2 rounded-xl border border-line bg-bg/40 px-3 py-2.5">
                  <input
                    type="text"
                    disabled
                    placeholder="Connect the Gemini key to start chatting"
                    className="w-full bg-transparent text-xs text-ink placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
                  />
                </div>
              </footer>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
