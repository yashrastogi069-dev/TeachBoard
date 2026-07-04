import { supabaseAdmin } from "@/lib/supabase/admin";

export type Severity = "error" | "warning" | "info";

/*
  Central failure-visibility helper (AGENTS.md rule 9).
  Writes the exact message to system_events and pushes errors to Yash's
  phone via ntfy. Fire-and-forget: nothing here may ever throw into the
  calling flow.
*/
export async function reportEvent(
  severity: Severity,
  source: string,
  message: string
): Promise<void> {
  try {
    await supabaseAdmin()
      .from("system_events")
      .insert({ severity, source, message: message.slice(0, 2000) });
  } catch {
    // swallow: observability must never break the app
  }

  if (severity === "error") {
    try {
      const topic = process.env.NTFY_TOPIC;
      if (topic) {
        await fetch(`https://ntfy.sh/${topic}`, {
          method: "POST",
          headers: { Title: `Praxis error in ${source}`, Tags: "rotating_light" },
          body: message.slice(0, 500),
          signal: AbortSignal.timeout(5000),
        });
      }
    } catch {
      // swallow
    }
  }
}

/* Reminder/info push used by cron and n8n-driven routes. */
export async function pushNotification(title: string, body: string): Promise<boolean> {
  try {
    const topic = process.env.NTFY_TOPIC;
    if (!topic) return false;
    const res = await fetch(`https://ntfy.sh/${topic}`, {
      method: "POST",
      headers: { Title: title, Tags: "bell" },
      body: body.slice(0, 1000),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
