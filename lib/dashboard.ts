import type { SupabaseClient, User } from "@supabase/supabase-js";
import { TRACKS, getTrack } from "@/lib/tracks";
import type {
  AiUsage,
  Certification,
  DataSource,
  DayActivity,
  Deadline,
  InsightItem,
  JobGoal,
  PlanItem,
  QuotaUsage,
  RecentScore,
  Recommendation,
  ResumePoint,
  SkillMap,
  SkillNodeStatus,
  SystemEvent,
  TrackMastery,
} from "@/lib/seed";

/*
  Phase 3: assembles every dashboard panel from live Supabase data for the
  signed-in user. Each section fails soft: a query problem produces an empty
  panel, never a crashed dashboard.
*/

export interface DashboardData {
  streakDays: number;
  overallMastery: number;
  resume: ResumePoint | null;
  startHref: string;
  trackMastery: TrackMastery[];
  weeklyActivity: DayActivity[];
  skillMap: SkillMap | null;
  currentTrackHref: string | null;
  jobGoals: JobGoal[];
  todayPlan: PlanItem[];
  deadlines: Deadline[];
  recommendations: Recommendation[];
  recentScores: RecentScore[];
  certifications: Certification[];
  insights: InsightItem[];
  quotaUsage: QuotaUsage[];
  aiUsage: AiUsage;
  systemEvents: SystemEvent[];
  dataSources: DataSource[];
}

interface ModuleRow {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  sort_order: number;
  track_id: string;
  lessons: Array<{ id: string; slug: string; title: string; sort_order: number }>;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString("en-NZ", { weekday: "short" });
}

function dateLabel(d: Date): string {
  return d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });
}

function relativeLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" });
  const dayDiff = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86400_000
  );
  if (dayDiff <= 0) return `Today ${time}`;
  if (dayDiff === 1) return `Yesterday ${time}`;
  return d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
}

export async function getDashboardData(
  supabase: SupabaseClient,
  user: User
): Promise<DashboardData> {
  // ---------- content skeleton ----------
  const { data: trackRows } = await supabase
    .from("skill_tracks")
    .select("id, slug, title, tagline, accent, active, sort_order")
    .order("sort_order");
  const tracks = trackRows ?? [];
  const trackById = new Map(tracks.map((t) => [t.id, t]));

  const { data: moduleRows } = await supabase
    .from("modules")
    .select("id, slug, title, difficulty, sort_order, track_id, lessons(id, slug, title, sort_order)")
    .order("sort_order");
  const modules = (moduleRows ?? []) as unknown as ModuleRow[];

  const allLessonIds = modules.flatMap((m) => m.lessons.map((l) => l.id));
  const { data: progressRows } = allLessonIds.length
    ? await supabase
        .from("progress")
        .select("lesson_id, status, mastery, updated_at")
        .eq("user_id", user.id)
    : { data: [] as Array<{ lesson_id: string; status: string; mastery: number; updated_at: string }> };
  const progress = progressRows ?? [];
  const completedByLesson = new Map(
    progress.filter((p) => p.status === "completed").map((p) => [p.lesson_id, Number(p.mastery)])
  );

  // ---------- per-track mastery ----------
  const trackMastery: TrackMastery[] = [];
  for (const t of tracks) {
    const staticTrack = getTrack(t.slug);
    if (!staticTrack) continue;
    const trackModules = modules.filter((m) => m.track_id === t.id);
    const lessonIds = trackModules.flatMap((m) => m.lessons.map((l) => l.id));
    const masterySum = lessonIds.reduce(
      (sum, id) => sum + (completedByLesson.get(id) ?? 0),
      0
    );
    const mastery = lessonIds.length > 0 ? Math.round(masterySum / lessonIds.length) : 0;
    const modulesDone = trackModules.filter(
      (m) => m.lessons.length > 0 && m.lessons.every((l) => completedByLesson.has(l.id))
    ).length;
    trackMastery.push({
      track: staticTrack,
      mastery,
      modulesDone,
      modulesTotal: trackModules.length,
    });
  }
  const activeMasteries = trackMastery.filter((tm) => tm.track.active);
  const overallMastery =
    activeMasteries.length > 0
      ? Math.round(
          activeMasteries.reduce((s, tm) => s + tm.mastery, 0) / activeMasteries.length
        )
      : 0;

  // ---------- activity + streak ----------
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const { data: activityRows } = await supabase
    .from("activity_log")
    .select("minutes, created_at")
    .eq("user_id", user.id)
    .gte("created_at", since);
  const activity = activityRows ?? [];

  const weeklyActivity: DayActivity[] = [];
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const minutesByDay = new Map<string, number>();
  const activeDays = new Set<string>();
  for (const row of activity) {
    const key = dayKey(new Date(row.created_at));
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + row.minutes);
    activeDays.add(key);
  }
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    weeklyActivity.push({ day: dayLabel(d), minutes: minutesByDay.get(dayKey(d)) ?? 0 });
  }
  let streakDays = 0;
  for (let i = 0; i < 60; i++) {
    const d = new Date(Date.now() - i * 86400_000);
    if (activeDays.has(dayKey(d))) streakDays++;
    else if (i > 0) break;
    // a quiet "today" does not break the streak
  }

  // ---------- resume point + current track ----------
  const lessonMeta = new Map<
    string,
    { lessonSlug: string; lessonTitle: string; module: ModuleRow }
  >();
  for (const m of modules) {
    for (const l of m.lessons) {
      lessonMeta.set(l.id, { lessonSlug: l.slug, lessonTitle: l.title, module: m });
    }
  }

  let resume: ResumePoint | null = null;
  let currentTrackId: string | null = null;
  const latestProgress = [...progress].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0];
  if (latestProgress) {
    const meta = lessonMeta.get(latestProgress.lesson_id);
    if (meta) {
      const track = trackById.get(meta.module.track_id);
      currentTrackId = meta.module.track_id;
      // Next lesson to do inside that module (first incomplete), else this one.
      const nextLesson =
        meta.module.lessons
          .sort((a, b) => a.sort_order - b.sort_order)
          .find((l) => !completedByLesson.has(l.id)) ?? null;
      const target = nextLesson
        ? { slug: nextLesson.slug, title: nextLesson.title }
        : { slug: meta.lessonSlug, title: meta.lessonTitle };
      const done = meta.module.lessons.filter((l) => completedByLesson.has(l.id)).length;
      if (track) {
        resume = {
          trackSlug: track.slug,
          moduleTitle: meta.module.title,
          lessonTitle: target.title,
          progressPct: Math.round((done / Math.max(meta.module.lessons.length, 1)) * 100),
          href: `/tracks/${track.slug}/${meta.module.slug}/${target.slug}`,
        };
      }
    }
  }
  const firstActive = tracks.find((t) => t.active);
  const startHref = firstActive ? `/tracks/${firstActive.slug}` : "/";
  if (!currentTrackId && firstActive) currentTrackId = firstActive.id;

  // ---------- skill map for the current track ----------
  let skillMap: SkillMap | null = null;
  let currentTrackHref: string | null = null;
  if (currentTrackId) {
    const track = trackById.get(currentTrackId);
    const trackModules = modules
      .filter((m) => m.track_id === currentTrackId)
      .sort((a, b) => a.sort_order - b.sort_order);
    if (track && trackModules.length > 0) {
      currentTrackHref = `/tracks/${track.slug}`;
      let currentAssigned = false;
      skillMap = {
        trackSlug: track.slug,
        nodes: trackModules.map((m) => {
          const total = m.lessons.length;
          const done = m.lessons.filter((l) => completedByLesson.has(l.id)).length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          let status: SkillNodeStatus;
          if (total > 0 && done === total) status = "done";
          else if (!currentAssigned) {
            status = "current";
            currentAssigned = true;
          } else if (
            trackModules.indexOf(m) > 0 &&
            skillMapStatusOf(trackModules, m, completedByLesson) === "next"
          ) {
            status = "next";
          } else {
            status = "locked";
          }
          return {
            id: m.id,
            title: m.title,
            status,
            progressPct: pct,
            levelLabel: m.difficulty.charAt(0).toUpperCase() + m.difficulty.slice(1),
          };
        }),
      };
      // Promote the node right after "current" to "next".
      const idx = skillMap.nodes.findIndex((n) => n.status === "current");
      if (idx >= 0 && skillMap.nodes[idx + 1] && skillMap.nodes[idx + 1].status === "locked") {
        skillMap.nodes[idx + 1] = { ...skillMap.nodes[idx + 1], status: "next" };
      }
    }
  }

  // ---------- deadlines ----------
  const { data: deadlineRows } = await supabase
    .from("deadlines")
    .select("id, title, due_date, status, module_id")
    .eq("user_id", user.id)
    .order("due_date")
    .limit(6);
  const moduleTrackSlug = (moduleId: string | null): string => {
    const m = modules.find((mm) => mm.id === moduleId);
    const t = m ? trackById.get(m.track_id) : null;
    return t?.slug ?? firstActive?.slug ?? "seo-geo";
  };
  const today = new Date(new Date().toISOString().slice(0, 10));
  const deadlines: Deadline[] = (deadlineRows ?? []).map((d) => {
    const due = new Date(d.due_date);
    const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400_000);
    const status =
      d.status === "active" && daysLeft < 0 ? "missed" : (d.status as Deadline["status"]);
    return {
      id: d.id,
      title: d.title,
      trackSlug: moduleTrackSlug(d.module_id),
      dueLabel: dateLabel(due),
      daysLeft,
      status,
    };
  });

  // ---------- recommendations ----------
  const { data: recRows } = await supabase
    .from("recommendations")
    .select("id, kind, text, track_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(3);
  const recommendations: Recommendation[] = (recRows ?? []).map((r) => ({
    id: r.id,
    kind: r.kind as Recommendation["kind"],
    text: r.text,
    trackSlug: (r.track_id && trackById.get(r.track_id)?.slug) || firstActive?.slug || "seo-geo",
  }));

  // ---------- today plan (derived) ----------
  const todayPlan: PlanItem[] = [];
  if (resume) {
    todayPlan.push({
      id: "plan-lesson",
      label: `Lesson: ${resume.lessonTitle}`,
      trackSlug: resume.trackSlug,
      kind: "lesson",
      estMinutes: 20,
      done: false,
    });
  }
  const revision = recommendations.find((r) => r.kind === "revision");
  if (revision) {
    todayPlan.push({
      id: "plan-review",
      label: revision.text.slice(0, 90),
      trackSlug: revision.trackSlug,
      kind: "review",
      estMinutes: 15,
      done: false,
    });
  }
  const nearestDeadline = deadlines.find((d) => d.status === "active");
  if (nearestDeadline && todayPlan.length < 3) {
    todayPlan.push({
      id: "plan-deadline",
      label: nearestDeadline.title,
      trackSlug: nearestDeadline.trackSlug,
      kind: "assessment",
      estMinutes: 30,
      done: false,
    });
  }

  // ---------- recent scores ----------
  const { data: scoreRows } = await supabase
    .from("submissions")
    .select("id, score, created_at, assessments(title, modules(track_id))")
    .eq("user_id", user.id)
    .eq("status", "graded")
    .order("created_at", { ascending: false })
    .limit(3);
  const recentScores: RecentScore[] = (scoreRows ?? []).map((s) => {
    const a = s.assessments as unknown as {
      title: string;
      modules: { track_id: string };
    } | null;
    return {
      id: s.id,
      assessment: a?.title ?? "Assessment",
      trackSlug:
        (a && trackById.get(a.modules.track_id)?.slug) || firstActive?.slug || "seo-geo",
      score: Math.round(Number(s.score ?? 0)),
      maxScore: 100,
      gradedLabel: relativeLabel(s.created_at),
    };
  });

  // ---------- job goals ----------
  const { data: goalRows } = await supabase
    .from("job_goals")
    .select("id, role, weights, sort_order")
    .order("sort_order");
  const masteryBySlug = new Map(trackMastery.map((tm) => [tm.track.slug, tm.mastery]));
  const jobGoals: JobGoal[] = (goalRows ?? []).map((g) => {
    const weights = (g.weights ?? {}) as Record<string, number>;
    const entries = Object.entries(weights);
    const totalWeight = entries.reduce((s, [, w]) => s + w, 0) || 1;
    const readiness = Math.round(
      entries.reduce((s, [slug, w]) => s + (masteryBySlug.get(slug) ?? 0) * w, 0) /
        totalWeight
    );
    return {
      id: g.id,
      role: g.role,
      readiness,
      linkedTrackSlugs: entries.map(([slug]) => slug),
    };
  });

  // ---------- certifications ----------
  const { data: certRows } = await supabase
    .from("certifications")
    .select("id, name, provider, status, progress_pct, sort_order")
    .order("sort_order");
  const certifications: Certification[] = (certRows ?? [])
    .filter((c) => c.status !== "acquired")
    .map((c) => ({
      id: c.id,
      name: c.name,
      provider: c.provider,
      status: c.status as Certification["status"],
      progressPct: c.progress_pct,
    }));

  // ---------- insights ----------
  const { data: newsRows } = await supabase
    .from("resource_cache")
    .select("id, payload, fetched_at")
    .eq("kind", "news")
    .order("fetched_at", { ascending: false })
    .limit(3);
  const insights: InsightItem[] = (newsRows ?? []).flatMap((n) => {
    const p = n.payload as {
      title?: string;
      source?: string;
      trackSlug?: string;
    } | null;
    if (!p?.title) return [];
    return [
      {
        id: n.id,
        source: p.source ?? "web",
        title: p.title,
        ageLabel: relativeLabel(n.fetched_at),
        trackSlug: p.trackSlug ?? firstActive?.slug ?? "seo-geo",
      },
    ];
  });

  // ---------- usage, events, sources ----------
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
  const { data: usageRows } = await supabase
    .from("api_usage")
    .select("provider, tokens_in, tokens_out, created_at")
    .gte("created_at", monthStart.toISOString());
  const usage = usageRows ?? [];
  const countSince = (provider: string, sinceDate: Date) =>
    usage.filter(
      (u) => u.provider === provider && new Date(u.created_at) >= sinceDate
    ).length;
  const quotaUsage: QuotaUsage[] = [
    { provider: "Gemini 2.5 Flash", used: countSince("gemini", dayStart), limit: 250, unit: "requests", period: "day" },
    { provider: "Tavily", used: countSince("tavily", monthStart), limit: 1000, unit: "credits", period: "month" },
    { provider: "Serper", used: countSince("serper", monthStart), limit: 2500, unit: "searches", period: "month" },
    { provider: "OpenRouter", used: countSince("openrouter", dayStart), limit: 50, unit: "requests", period: "day" },
  ];
  const todayAi = usage.filter(
    (u) =>
      ["gemini", "openrouter", "nvidia"].includes(u.provider) &&
      new Date(u.created_at) >= dayStart
  );
  const aiUsage: AiUsage = {
    callsToday: todayAi.length,
    tokensToday: todayAi.reduce((s, u) => s + u.tokens_in + u.tokens_out, 0),
    estCostUsd: 0,
  };

  const { data: eventRows } = await supabase
    .from("system_events")
    .select("id, severity, source, message, created_at")
    .order("created_at", { ascending: false })
    .limit(3);
  const systemEvents: SystemEvent[] = (eventRows ?? []).map((e) => ({
    id: e.id,
    severity: e.severity as SystemEvent["severity"],
    source: e.source,
    message: e.message,
    occurredLabel: relativeLabel(e.created_at),
  }));

  const dataSources: DataSource[] = [
    { id: "ds-supabase", name: "Supabase", detail: "database + auth", status: "connected" },
    { id: "ds-gemini", name: "Gemini API", detail: "tutor + grading", status: process.env.GEMINI_API_KEY ? "connected" : "pending" },
    { id: "ds-tavily", name: "Tavily", detail: "research chain", status: process.env.TAVILY_API_KEY ? "connected" : "pending" },
    { id: "ds-serper", name: "Serper", detail: "research fallback", status: process.env.SERPER_API_KEY ? "connected" : "pending" },
    { id: "ds-ntfy", name: "ntfy push", detail: "error alerts", status: process.env.NTFY_TOPIC ? "connected" : "pending" },
  ];

  return {
    streakDays,
    overallMastery,
    resume,
    startHref,
    trackMastery,
    weeklyActivity,
    skillMap,
    currentTrackHref,
    jobGoals,
    todayPlan,
    deadlines,
    recommendations,
    recentScores,
    certifications,
    insights,
    quotaUsage,
    aiUsage,
    systemEvents,
    dataSources,
  };
}

/*
  Lightweight stats for the topbar, fetched in the app layout on every page.
*/
export interface TopStats {
  streakDays: number;
  overallMastery: number;
  trackMastery: Array<{ trackSlug: string; mastery: number }>;
}

export async function getTopStats(
  supabase: SupabaseClient,
  user: User
): Promise<TopStats> {
  const { data: moduleRows } = await supabase
    .from("modules")
    .select("track_id, skill_tracks(slug, active), lessons(id)");
  const mods = (moduleRows ?? []) as unknown as Array<{
    track_id: string;
    skill_tracks: { slug: string; active: boolean };
    lessons: Array<{ id: string }>;
  }>;

  const { data: progressRows } = await supabase
    .from("progress")
    .select("lesson_id, status, mastery")
    .eq("user_id", user.id)
    .eq("status", "completed");
  const masteryByLesson = new Map(
    (progressRows ?? []).map((p) => [p.lesson_id, Number(p.mastery)])
  );

  const bySlug = new Map<string, { sum: number; count: number; active: boolean }>();
  for (const m of mods) {
    const slug = m.skill_tracks.slug;
    const entry = bySlug.get(slug) ?? { sum: 0, count: 0, active: m.skill_tracks.active };
    for (const l of m.lessons) {
      entry.sum += masteryByLesson.get(l.id) ?? 0;
      entry.count += 1;
    }
    bySlug.set(slug, entry);
  }
  const trackMastery = TRACKS.map((t) => {
    const entry = bySlug.get(t.slug);
    return {
      trackSlug: t.slug,
      mastery: entry && entry.count > 0 ? Math.round(entry.sum / entry.count) : 0,
    };
  });
  const activeVals = TRACKS.filter((t) => t.active).map(
    (t) => trackMastery.find((tm) => tm.trackSlug === t.slug)?.mastery ?? 0
  );
  const overallMastery =
    activeVals.length > 0
      ? Math.round(activeVals.reduce((a, b) => a + b, 0) / activeVals.length)
      : 0;

  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const { data: activityRows } = await supabase
    .from("activity_log")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", since);
  const activeDays = new Set(
    (activityRows ?? []).map((a) => new Date(a.created_at).toISOString().slice(0, 10))
  );
  let streakDays = 0;
  for (let i = 0; i < 60; i++) {
    const key = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
    if (activeDays.has(key)) streakDays++;
    else if (i > 0) break;
  }

  return { streakDays, overallMastery, trackMastery };
}

function skillMapStatusOf(
  trackModules: ModuleRow[],
  mod: ModuleRow,
  completedByLesson: Map<string, number>
): SkillNodeStatus {
  const idx = trackModules.indexOf(mod);
  const prev = trackModules[idx - 1];
  if (!prev) return "locked";
  const prevDone =
    prev.lessons.length > 0 && prev.lessons.every((l) => completedByLesson.has(l.id));
  return prevDone ? "next" : "locked";
}
