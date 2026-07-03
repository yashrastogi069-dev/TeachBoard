/*
  PHASE 0 PREVIEW DATA.
  This module is the single temporary data source for the dashboard so the
  full UI can be built and reviewed before the database exists. In Phase 1
  and Phase 3 every consumer switches to Supabase queries and this file is
  deleted. The exported types are the contract those queries must satisfy.
  Dates are fixed strings (never computed at render time) so server and
  client HTML always match.
*/

import { TRACKS, type Track } from "./tracks";

export interface TrackMastery {
  track: Track;
  mastery: number; // 0..100
  modulesDone: number;
  modulesTotal: number;
}

export interface DayActivity {
  day: string; // short weekday label
  minutes: number;
}

export type PlanKind = "lesson" | "assessment" | "review";

export interface PlanItem {
  id: string;
  label: string;
  trackSlug: string;
  kind: PlanKind;
  estMinutes: number;
  done: boolean;
}

export interface Deadline {
  id: string;
  title: string;
  trackSlug: string;
  dueLabel: string;
  daysLeft: number;
  status: "active" | "met" | "missed";
}

export interface RecentScore {
  id: string;
  assessment: string;
  trackSlug: string;
  score: number;
  maxScore: number;
  gradedLabel: string;
}

export interface Recommendation {
  id: string;
  kind: "next_module" | "revision" | "resource";
  text: string;
  trackSlug: string;
}

export interface QuotaUsage {
  provider: string;
  used: number;
  limit: number;
  unit: string;
  period: "day" | "month";
}

export interface SystemEvent {
  id: string;
  severity: "error" | "warning" | "info";
  source: string;
  message: string;
  occurredLabel: string;
}

export interface ResumePoint {
  trackSlug: string;
  moduleTitle: string;
  lessonTitle: string;
  progressPct: number;
}

function track(slug: string): Track {
  const found = TRACKS.find((t) => t.slug === slug);
  if (!found) throw new Error(`Unknown track slug in seed data: ${slug}`);
  return found;
}

export const seed = {
  userName: "Yash",
  streakDays: 4,
  overallMastery: 23,

  resume: {
    trackSlug: "seo-geo",
    moduleTitle: "Technical SEO Foundations",
    lessonTitle: "Crawling, rendering and indexing, step by step",
    progressPct: 60,
  } satisfies ResumePoint,

  trackMastery: [
    { track: track("seo-geo"), mastery: 42, modulesDone: 3, modulesTotal: 8 },
    { track: track("digital-marketing"), mastery: 28, modulesDone: 2, modulesTotal: 9 },
    { track: track("analytics"), mastery: 19, modulesDone: 1, modulesTotal: 7 },
    { track: track("ai-automation"), mastery: 15, modulesDone: 1, modulesTotal: 8 },
    { track: track("finance"), mastery: 8, modulesDone: 0, modulesTotal: 7 },
  ] satisfies TrackMastery[],

  weeklyActivity: [
    { day: "Sat", minutes: 35 },
    { day: "Sun", minutes: 0 },
    { day: "Mon", minutes: 55 },
    { day: "Tue", minutes: 40 },
    { day: "Wed", minutes: 70 },
    { day: "Thu", minutes: 25 },
    { day: "Fri", minutes: 45 },
  ] satisfies DayActivity[],

  todayPlan: [
    {
      id: "plan-1",
      label: "Finish lesson: Crawling, rendering and indexing",
      trackSlug: "seo-geo",
      kind: "lesson",
      estMinutes: 20,
      done: true,
    },
    {
      id: "plan-2",
      label: "Practical test: audit a fictional site's index coverage",
      trackSlug: "seo-geo",
      kind: "assessment",
      estMinutes: 30,
      done: false,
    },
    {
      id: "plan-3",
      label: "Review missed rubric criteria from funnel assessment",
      trackSlug: "digital-marketing",
      kind: "review",
      estMinutes: 15,
      done: false,
    },
  ] satisfies PlanItem[],

  deadlines: [
    {
      id: "dl-1",
      title: "Complete Technical SEO Foundations module",
      trackSlug: "seo-geo",
      dueLabel: "Tue 8 Jul",
      daysLeft: 4,
      status: "active",
    },
    {
      id: "dl-2",
      title: "GA4 property setup practical",
      trackSlug: "analytics",
      dueLabel: "Sat 12 Jul",
      daysLeft: 8,
      status: "active",
    },
    {
      id: "dl-3",
      title: "Funnel strategy scenario test",
      trackSlug: "digital-marketing",
      dueLabel: "Wed 2 Jul",
      daysLeft: -2,
      status: "missed",
    },
  ] satisfies Deadline[],

  recentScores: [
    {
      id: "score-1",
      assessment: "Keyword intent mapping for a NZ retail brand",
      trackSlug: "seo-geo",
      score: 78,
      maxScore: 100,
      gradedLabel: "Thu 2 Jul",
    },
    {
      id: "score-2",
      assessment: "Full-funnel campaign plan on a $2k budget",
      trackSlug: "digital-marketing",
      score: 64,
      maxScore: 100,
      gradedLabel: "Mon 29 Jun",
    },
    {
      id: "score-3",
      assessment: "GA4 vs Universal Analytics: migration questions",
      trackSlug: "analytics",
      score: 85,
      maxScore: 100,
      gradedLabel: "Fri 26 Jun",
    },
  ] satisfies RecentScore[],

  recommendations: [
    {
      id: "rec-1",
      kind: "revision",
      text: "Your funnel assessment lost most points on budget allocation logic. Revisit the CAC vs LTV lesson before retrying.",
      trackSlug: "digital-marketing",
    },
    {
      id: "rec-2",
      kind: "next_module",
      text: "You are ready for Structured Data and Rich Results. It builds directly on the indexing concepts you just passed.",
      trackSlug: "seo-geo",
    },
    {
      id: "rec-3",
      kind: "resource",
      text: "A fresh GA4 audit walkthrough video matched your current module. It is queued inside lesson 2.",
      trackSlug: "analytics",
    },
  ] satisfies Recommendation[],

  quotaUsage: [
    { provider: "Gemini 2.5 Flash", used: 62, limit: 250, unit: "requests", period: "day" },
    { provider: "Tavily", used: 214, limit: 1000, unit: "credits", period: "month" },
    { provider: "YouTube Data API", used: 1800, limit: 10000, unit: "units", period: "day" },
    { provider: "Serper", used: 45, limit: 2500, unit: "searches", period: "month" },
  ] satisfies QuotaUsage[],

  systemEvents: [
    {
      id: "evt-1",
      severity: "error",
      source: "api/resources",
      message: "Tavily request failed: 432 quota exceeded for key ta-****9f. Fell back to Serper, results served normally.",
      occurredLabel: "Today 09:41",
    },
    {
      id: "evt-2",
      severity: "warning",
      source: "api/grade",
      message: "Gemini responded in 28.4s (above 20s threshold). Consider Groq fallback if this repeats.",
      occurredLabel: "Yesterday 18:07",
    },
    {
      id: "evt-3",
      severity: "info",
      source: "n8n/keep-alive",
      message: "Supabase keep-alive ping OK. Project active, next ping in 24h.",
      occurredLabel: "Yesterday 08:00",
    },
  ] satisfies SystemEvent[],
};
