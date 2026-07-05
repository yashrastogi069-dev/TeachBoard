import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { aiStream, type ChatMessage } from "@/lib/ai/provider";
import { reportEvent } from "@/lib/notify";

export const maxDuration = 300;

const TUTOR_SYSTEM = `You are the Praxis Professor, a Socratic tutor for Yash, who is
building practical marketing/analytics/SEO skills for entry-level roles in Auckland,
New Zealand. Rules:
- Socratic first: when Yash asks something, probe his current thinking with ONE
  pointed question before explaining, unless he is clearly stuck or asks for a
  direct explanation.
- When he is stuck, explain with maximum CLARITY: plain-language definition, then a
  real-world analogy, then a concrete work example.
- Challenge him: follow correct answers with a slightly harder "what if" from real
  work situations.
- Be warm but concise. No filler, no bullet-point walls, no fabricated statistics.
- Stay on the current topic; if he drifts far off the course, gently steer back.`;

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let sessionId: string | null = null;
  let lessonId: string | null = null;
  let message = "";
  try {
    const body = await request.json();
    sessionId = body.sessionId ? String(body.sessionId) : null;
    lessonId = body.lessonId ? String(body.lessonId) : null;
    message = String(body.message ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  try {
    // Session: reuse (only if it belongs to this user) or create.
    if (sessionId) {
      const { data: session } = await admin
        .from("tutor_sessions")
        .select("user_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (!session || session.user_id !== user.id) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }
    }
    if (!sessionId) {
      const { data: created, error: sessionErr } = await admin
        .from("tutor_sessions")
        .insert({ user_id: user.id, lesson_id: lessonId })
        .select("id")
        .single();
      if (sessionErr || !created) throw new Error(sessionErr?.message ?? "session insert failed");
      sessionId = created.id;
    }

    await admin
      .from("tutor_messages")
      .insert({ session_id: sessionId, role: "user", content: message });

    // Context: lesson info + recent history.
    let contextNote = "Yash is on the global dashboard right now.";
    if (lessonId) {
      const { data: lesson } = await admin
        .from("lessons")
        .select("title, modules(title, skill_tracks(title))")
        .eq("id", lessonId)
        .single();
      if (lesson) {
        const mod = lesson.modules as unknown as {
          title: string;
          skill_tracks: { title: string };
        };
        contextNote = `Yash is currently inside the lesson "${lesson.title}" (module "${mod.title}", course "${mod.skill_tracks.title}"). Anchor your questions and examples to this lesson.`;
      }
    }

    const { data: history } = await admin
      .from("tutor_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(16);

    const messages: ChatMessage[] = [
      { role: "system", content: `${TUTOR_SYSTEM}\n\nContext: ${contextNote}` },
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const { stream } = await aiStream(messages, "api/tutor");

    // Tee: forward chunks to the client while accumulating the full reply,
    // then persist the assistant message when the stream closes.
    let full = "";
    const decoder = new TextDecoder();
    const persistingStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        full += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        if (full.trim()) {
          await admin
            .from("tutor_messages")
            .insert({ session_id: sessionId, role: "assistant", content: full });
        }
      },
    });

    return new Response(stream.pipeThrough(persistingStream), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Session-Id": sessionId!,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Tutor failed";
    await reportEvent("error", "api/tutor", detail);
    return NextResponse.json(
      { error: `The Professor is unreachable right now: ${detail}` },
      { status: 500 }
    );
  }
}
