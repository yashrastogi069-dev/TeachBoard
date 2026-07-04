import type { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportEvent } from "@/lib/notify";

/*
  Provider-agnostic AI layer with the free-tier failsafe chain:
  Gemini (primary, streaming) -> OpenRouter -> NVIDIA NIM.
  Every call is logged to api_usage; every provider failure is reported
  through system_events before the next provider is tried.
*/

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface TextResult {
  text: string;
  provider: string;
  tokensIn: number;
  tokensOut: number;
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL || "meta/llama-3.3-70b-instruct";

const TIMEOUT_MS = 90_000;

function logUsage(
  provider: string,
  endpoint: string,
  tokensIn: number,
  tokensOut: number,
  ok: boolean
): void {
  supabaseAdmin()
    .from("api_usage")
    .insert({
      provider,
      endpoint,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      est_cost_usd: 0,
      ok,
    })
    .then(undefined, () => undefined);
}

// ---------- Gemini (REST v1beta) ----------

function toGeminiBody(messages: ChatMessage[], json: boolean) {
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  return {
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: {
      temperature: json ? 0.4 : 0.8,
      ...(json ? { responseMimeType: "application/json" } : {}),
    },
  };
}

async function geminiText(messages: ChatMessage[], json: boolean): Promise<TextResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toGeminiBody(messages, json)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    }
  );
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`Gemini ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new Error("Gemini returned an empty response");
  const usage = data.usageMetadata ?? {};
  return {
    text,
    provider: "gemini",
    tokensIn: usage.promptTokenCount ?? 0,
    tokensOut: usage.candidatesTokenCount ?? 0,
  };
}

// ---------- OpenAI-compatible providers (OpenRouter, NVIDIA) ----------

interface OpenAICompatConfig {
  name: string;
  url: string;
  key: string | undefined;
  model: string;
}

function openAICompatProviders(): OpenAICompatConfig[] {
  return [
    {
      name: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      key: process.env.OPENROUTER_API_KEY,
      model: OPENROUTER_MODEL,
    },
    {
      name: "nvidia",
      url: "https://integrate.api.nvidia.com/v1/chat/completions",
      key: process.env.NVIDIA_API_KEY,
      model: NVIDIA_MODEL,
    },
  ];
}

async function openAICompatText(
  cfg: OpenAICompatConfig,
  messages: ChatMessage[],
  json: boolean
): Promise<TextResult> {
  if (!cfg.key) throw new Error(`${cfg.name} API key is not set`);
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.key}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      messages,
      temperature: json ? 0.4 : 0.8,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    throw new Error(`${cfg.name} ${res.status}: ${detail}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error(`${cfg.name} returned an empty response`);
  return {
    text,
    provider: cfg.name,
    tokensIn: data.usage?.prompt_tokens ?? 0,
    tokensOut: data.usage?.completion_tokens ?? 0,
  };
}

// ---------- chain: plain/JSON completion ----------

async function chainText(
  messages: ChatMessage[],
  endpoint: string,
  json: boolean
): Promise<TextResult> {
  const attempts: Array<() => Promise<TextResult>> = [
    () => geminiText(messages, json),
    ...openAICompatProviders().map(
      (cfg) => () => openAICompatText(cfg, messages, json)
    ),
  ];
  let lastError: Error = new Error("no AI provider configured");
  for (const attempt of attempts) {
    try {
      const result = await attempt();
      logUsage(result.provider, endpoint, result.tokensIn, result.tokensOut, true);
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      await reportEvent(
        "warning",
        endpoint,
        `AI provider failed, trying next in chain: ${lastError.message}`
      );
    }
  }
  await reportEvent("error", endpoint, `All AI providers failed: ${lastError.message}`);
  throw lastError;
}

export async function aiText(
  system: string,
  user: string,
  endpoint: string
): Promise<string> {
  const result = await chainText(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    endpoint,
    false
  );
  return result.text;
}

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start === -1) return body.trim();
  const lastBrace = Math.max(body.lastIndexOf("}"), body.lastIndexOf("]"));
  return body.slice(start, lastBrace + 1).trim();
}

/*
  JSON completion validated against a zod schema. On a parse/validation
  failure the same provider chain gets ONE repair round with the error
  message included, then we give up with a reported error.
*/
export async function aiJson<T>(
  schema: z.ZodType<T>,
  system: string,
  user: string,
  endpoint: string
): Promise<T> {
  let raw = "";
  for (let round = 0; round < 2; round++) {
    const prompt =
      round === 0
        ? user
        : `${user}\n\nYour previous reply could not be used. It failed with: ${raw.slice(
            0,
            400
          )}\nReturn ONLY valid JSON matching the required shape. No prose, no markdown fences.`;
    const result = await chainText(
      [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      endpoint,
      true
    );
    try {
      const parsed = JSON.parse(extractJson(result.text));
      const validated = schema.safeParse(parsed);
      if (validated.success) return validated.data;
      raw = `schema validation failed: ${validated.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`;
    } catch (err) {
      raw = `JSON.parse failed: ${err instanceof Error ? err.message : String(err)}`;
    }
  }
  await reportEvent("error", endpoint, `AI JSON output invalid after retry: ${raw}`);
  throw new Error(`AI returned invalid JSON for ${endpoint}: ${raw}`);
}

// ---------- chain: streaming ----------

function sseTextStream(
  upstream: Response,
  extractDelta: (obj: unknown) => string,
  provider: string,
  endpoint: string
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let tokensOut = 0;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const delta = extractDelta(JSON.parse(payload));
              if (delta) {
                tokensOut += Math.ceil(delta.length / 4);
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // ignore malformed keep-alive chunks
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      } finally {
        logUsage(provider, endpoint, 0, tokensOut, true);
      }
    },
  });
}

export async function aiStream(
  messages: ChatMessage[],
  endpoint: string
): Promise<{ stream: ReadableStream<Uint8Array>; provider: string }> {
  // 1. Gemini SSE
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toGeminiBody(messages, false)),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        }
      );
      if (!res.ok || !res.body) {
        throw new Error(`Gemini stream ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      return {
        provider: "gemini",
        stream: sseTextStream(
          res,
          (obj) => {
            const o = obj as {
              candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
            };
            return (o.candidates?.[0]?.content?.parts ?? [])
              .map((p) => p.text ?? "")
              .join("");
          },
          "gemini",
          endpoint
        ),
      };
    } catch (err) {
      await reportEvent(
        "warning",
        endpoint,
        `Gemini streaming failed, falling back: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  // 2. OpenAI-compatible SSE fallbacks
  for (const cfg of openAICompatProviders()) {
    if (!cfg.key) continue;
    try {
      const res = await fetch(cfg.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({ model: cfg.model, messages, stream: true }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok || !res.body) {
        throw new Error(`${cfg.name} stream ${res.status}: ${(await res.text()).slice(0, 200)}`);
      }
      return {
        provider: cfg.name,
        stream: sseTextStream(
          res,
          (obj) => {
            const o = obj as { choices?: Array<{ delta?: { content?: string } }> };
            return o.choices?.[0]?.delta?.content ?? "";
          },
          cfg.name,
          endpoint
        ),
      };
    } catch (err) {
      await reportEvent(
        "warning",
        endpoint,
        `${cfg.name} streaming failed, falling back: ${err instanceof Error ? err.message : err}`
      );
    }
  }

  await reportEvent("error", endpoint, "All AI providers failed to stream");
  throw new Error("All AI providers failed to stream");
}
