import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportEvent } from "@/lib/notify";

/*
  Research failsafe chain, cache-first (AGENTS.md rule 5):
  resource_cache -> Tavily -> Serper -> Jina Reader (keyless).
  Used by the curriculum generator and the enrichment cron so lessons are
  grounded in current best practice, not stale model memory.
*/

export interface ResearchResult {
  title: string;
  url: string;
  snippet: string;
}

const CACHE_TTL_DAYS = 7;

function logUsage(provider: string, ok: boolean): void {
  supabaseAdmin()
    .from("api_usage")
    .insert({ provider, endpoint: "research", ok })
    .then(undefined, () => undefined);
}

async function fromCache(topicKey: string): Promise<ResearchResult[] | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_DAYS * 86400_000).toISOString();
  const { data } = await supabaseAdmin()
    .from("resource_cache")
    .select("payload")
    .eq("topic_key", topicKey)
    .eq("kind", "article")
    .gte("fetched_at", cutoff)
    .limit(1)
    .maybeSingle();
  const results = (data?.payload as { results?: ResearchResult[] } | null)?.results;
  return results && results.length > 0 ? results : null;
}

async function toCache(topicKey: string, source: string, results: ResearchResult[]) {
  await supabaseAdmin()
    .from("resource_cache")
    .insert({ topic_key: topicKey, source, kind: "article", payload: { results } });
}

async function tavily(query: string, max: number): Promise<ResearchResult[]> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("TAVILY_API_KEY is not set");
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, max_results: max, search_depth: "basic" }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.results ?? []).map(
    (r: { title?: string; url?: string; content?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: (r.content ?? "").slice(0, 400),
    })
  );
}

async function serper(query: string, max: number): Promise<ResearchResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is not set");
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-API-KEY": key },
    body: JSON.stringify({ q: query, num: max }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Serper ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.organic ?? []).slice(0, max).map(
    (r: { title?: string; link?: string; snippet?: string }) => ({
      title: r.title ?? "",
      url: r.link ?? "",
      snippet: (r.snippet ?? "").slice(0, 400),
    })
  );
}

/* Keyless last resort: Jina's search reader returns markdown with links. */
async function jina(query: string, max: number): Promise<ResearchResult[]> {
  const res = await fetch(`https://s.jina.ai/${encodeURIComponent(query)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`Jina ${res.status}`);
  const data = await res.json();
  const items = Array.isArray(data.data) ? data.data : [];
  return items.slice(0, max).map(
    (r: { title?: string; url?: string; description?: string; content?: string }) => ({
      title: r.title ?? "",
      url: r.url ?? "",
      snippet: (r.description ?? r.content ?? "").slice(0, 400),
    })
  );
}

export async function research(
  query: string,
  maxResults = 6
): Promise<ResearchResult[]> {
  const topicKey = `research:${query.toLowerCase().trim()}`;

  try {
    const cached = await fromCache(topicKey);
    if (cached) return cached.slice(0, maxResults);
  } catch {
    // cache miss path continues below
  }

  const chain: Array<[string, () => Promise<ResearchResult[]>]> = [
    ["tavily", () => tavily(query, maxResults)],
    ["serper", () => serper(query, maxResults)],
    ["jina", () => jina(query, maxResults)],
  ];

  for (const [name, run] of chain) {
    try {
      const results = await run();
      logUsage(name, true);
      if (results.length > 0) {
        try {
          await toCache(topicKey, name, results);
        } catch {
          // cache write failures never block results
        }
        return results;
      }
    } catch (err) {
      logUsage(name, false);
      await reportEvent(
        "warning",
        "research",
        `${name} failed for "${query.slice(0, 80)}": ${
          err instanceof Error ? err.message : err
        }`
      );
    }
  }

  await reportEvent(
    "error",
    "research",
    `All research providers failed for "${query.slice(0, 80)}"; continuing without sources`
  );
  return [];
}
