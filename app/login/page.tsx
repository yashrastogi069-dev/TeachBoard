"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { GraduationCap } from "@phosphor-icons/react";
import { supabaseBrowser } from "@/lib/supabase/client";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

export default function LoginPage() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const supabase = supabaseBrowser();
    try {
      if (mode === "signin") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (err) throw err;
        router.replace("/");
        router.refresh();
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (data.session) {
          router.replace("/");
          router.refresh();
        } else {
          setNotice(
            "Account created. Check your email for the confirmation link, then sign in."
          );
          setMode("signin");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: EASE }}
        className="w-full max-w-sm rounded-2xl border border-line bg-bg-raised/70 p-6"
        style={{ boxShadow: "0 0 60px -24px var(--accent-glow)" }}
      >
        <div className="flex items-center gap-3 pb-6">
          <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <GraduationCap size={22} weight="duotone" />
          </span>
          <div className="leading-tight">
            <h1 className="font-display text-base font-semibold text-ink">Praxis</h1>
            <p className="text-[11px] text-ink-faint">Your practical professor</p>
          </div>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-muted">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-line bg-bg/60 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
              placeholder="you@example.com"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-muted">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-line bg-bg/60 px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint"
              placeholder="At least 8 characters"
            />
          </label>

          {error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
          )}
          {notice && (
            <p className="rounded-lg bg-success/10 px-3 py-2 text-xs text-success">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-medium text-accent-bright transition-transform duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy
              ? "Working..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
          }}
          className="pt-4 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          {mode === "signin"
            ? "First time here? Create your account"
            : "Already have an account? Sign in"}
        </button>
      </motion.div>
    </main>
  );
}
