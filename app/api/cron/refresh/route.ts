import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { research } from "@/lib/apis/research";
import { reportEvent } from "@/lib/notify";
import { checkCronAuth } from "@/lib/cron";

export const maxDuration = 300;

/*
  Nightly enrichment: pulls fresh industry news for every active track into
  resource_cache (kind=news) so the dashboard Expert Insights feed stays
  current. The date goes into the research query so the research layer's
  7-day article cache never serves yesterday's news back to this job.
*/
export async function POST(request: Request) {
  const denied = checkCronAuth(request);
  if (denied) return denied;

  const admin = supabaseAdmin();
  const results: Record<string, number> = {};

  try {
    const { data: tracks, error } = await admin
      .from("skill_tracks")
      .select("slug, title")
      .eq("active", true)
      .order("sort_order");
    if (error) throw new Error(error.message);

    const today = new Date().toISOString().slice(0, 10);
    for (const track of tracks ?? []) {
      try {
        const found = await research(
          `${track.title} industry news updates this week ${today}`,
          3
        );
        const topicKey = `news:${track.slug}`;
        // Replace this track's previous batch so the feed never shows stale items.
        await admin.from("resource_cache").delete().eq("topic_key", topicKey);
        const rows = found.slice(0, 3).map((r) => {
          let source = "web";
          try {
            source = new URL(r.url).hostname.replace(/^www\./, "");
          } catch {
            // keep the fallback label when the provider returned a bad URL
          }
          return {
            topic_key: topicKey,
            source,
            kind: "news",
            payload: {
              title: r.title,
              source,
              url: r.url,
              trackSlug: track.slug,
            },
          };
        });
        if (rows.length > 0) {
          const { error: insertErr } = await admin.from("resource_cache").insert(rows);
          if (insertErr) throw new Error(insertErr.message);
        }
        results[track.slug] = rows.length;
      } catch (err) {
        results[track.slug] = 0;
        await reportEvent(
          "error",
          "cron/refresh",
          `News refresh failed for ${track.slug}: ${
            err instanceof Error ? err.message : err
          }`
        );
      }
    }

    await reportEvent(
      "info",
      "cron/refresh",
      `News refresh done: ${Object.entries(results)
        .map(([slug, n]) => `${slug}=${n}`)
        .join(", ")}`
    );
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "refresh failed";
    await reportEvent("error", "cron/refresh", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
