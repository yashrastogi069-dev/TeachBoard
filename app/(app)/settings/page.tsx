import { PlugsConnected } from "@phosphor-icons/react/dist/ssr";
import { supabaseServer } from "@/lib/supabase/server";
import Panel from "@/components/ui/Panel";
import SignOutButton from "@/components/settings/SignOutButton";

export default async function SettingsPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sources = [
    { name: "Supabase", detail: "database + auth", ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "Gemini API", detail: "tutor + grading (primary AI)", ok: Boolean(process.env.GEMINI_API_KEY) },
    { name: "OpenRouter", detail: "AI fallback 1", ok: Boolean(process.env.OPENROUTER_API_KEY) },
    { name: "NVIDIA NIM", detail: "AI fallback 2", ok: Boolean(process.env.NVIDIA_API_KEY) },
    { name: "Tavily", detail: "research (primary)", ok: Boolean(process.env.TAVILY_API_KEY) },
    { name: "Serper", detail: "research fallback", ok: Boolean(process.env.SERPER_API_KEY) },
    { name: "ntfy push", detail: `topic: ${process.env.NTFY_TOPIC ?? "not set"}`, ok: Boolean(process.env.NTFY_TOPIC) },
    { name: "Cron secret", detail: "protects /api/cron/* for n8n", ok: Boolean(process.env.CRON_SECRET) },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <header className="leading-tight">
        <h1 className="font-display text-xl font-semibold text-ink">Settings</h1>
        <p className="pt-1 text-sm text-ink-muted">Account and connections.</p>
      </header>

      <Panel title="Account" subtitle="Praxis is a single-user app; this is you.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink">{user?.email ?? "Not signed in"}</p>
          <SignOutButton />
        </div>
      </Panel>

      <Panel
        title="Connections"
        subtitle="Keys are read from .env.local; restart the dev server after changing them."
      >
        <ul className="flex flex-col gap-2">
          {sources.map((s) => (
            <li
              key={s.name}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-bg/40 px-3 py-2"
            >
              <PlugsConnected
                size={14}
                className={s.ok ? "shrink-0 text-success" : "shrink-0 text-ink-faint"}
              />
              <span className="shrink-0 text-xs text-ink">{s.name}</span>
              <span className="min-w-0 truncate text-[10px] text-ink-faint">{s.detail}</span>
              <span
                className={
                  s.ok
                    ? "ml-auto shrink-0 rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-medium text-success"
                    : "ml-auto shrink-0 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning"
                }
              >
                {s.ok ? "configured" : "missing"}
              </span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="Background jobs (n8n)"
        subtitle="Import the workflows in the n8n/ folder of this repo into your local n8n."
      >
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-xs text-ink-muted">
          <li>Daily keep-alive ping stops the Supabase free project from pausing.</li>
          <li>Nightly refresh pulls fresh industry news into the insights feed.</li>
          <li>Morning deadline check pushes reminders to your phone via ntfy.</li>
        </ul>
      </Panel>
    </div>
  );
}
