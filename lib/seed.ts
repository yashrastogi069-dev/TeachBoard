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

export type SkillNodeStatus = "done" | "current" | "next" | "locked";

export interface SkillNode {
  id: string;
  title: string;
  status: SkillNodeStatus;
  progressPct: number; // 0..100 within this module
  levelLabel: string; // e.g. "Basic", "Advanced", "Pro"
}

export interface SkillMap {
  trackSlug: string;
  nodes: SkillNode[];
}

export interface JobGoal {
  id: string;
  role: string;
  readiness: number; // 0..100, weighted from linked track mastery
  linkedTrackSlugs: string[];
}

export interface AiUsage {
  callsToday: number;
  tokensToday: number;
  estCostUsd: number; // stays 0.00 while on free tiers, tracked anyway
}

export interface InsightItem {
  id: string;
  source: string;
  title: string;
  ageLabel: string;
  trackSlug: string;
}

export interface Certification {
  id: string;
  name: string;
  provider: string;
  status: "in_progress" | "planned";
  progressPct: number;
}

export interface DataSource {
  id: string;
  name: string;
  detail: string;
  status: "connected" | "pending";
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

  skillMap: {
    trackSlug: "seo-geo",
    nodes: [
      { id: "sm-1", title: "Search fundamentals", status: "done", progressPct: 100, levelLabel: "Basic" },
      { id: "sm-2", title: "Keyword & intent research", status: "done", progressPct: 100, levelLabel: "Basic" },
      { id: "sm-3", title: "Technical SEO foundations", status: "current", progressPct: 60, levelLabel: "Advanced" },
      { id: "sm-4", title: "Structured data & rich results", status: "next", progressPct: 0, levelLabel: "Advanced" },
      { id: "sm-5", title: "GEO: ranking in AI answers", status: "locked", progressPct: 0, levelLabel: "Pro" },
      { id: "sm-6", title: "Full site audit capstone", status: "locked", progressPct: 0, levelLabel: "Pro" },
    ],
  } satisfies SkillMap,

  jobGoals: [
    {
      id: "jg-1",
      role: "SEO / Content Analyst",
      readiness: 38,
      linkedTrackSlugs: ["seo-geo", "analytics"],
    },
    {
      id: "jg-2",
      role: "Digital Marketing Coordinator",
      readiness: 27,
      linkedTrackSlugs: ["digital-marketing", "analytics", "seo-geo"],
    },
    {
      id: "jg-3",
      role: "Marketing Automation Associate",
      readiness: 18,
      linkedTrackSlugs: ["ai-automation", "digital-marketing"],
    },
  ] satisfies JobGoal[],

  aiUsage: {
    callsToday: 62,
    tokensToday: 48200,
    estCostUsd: 0,
  } satisfies AiUsage,

  insights: [
    {
      id: "ins-1",
      source: "Search Engine Land",
      title: "Google's June core update: what changed for small sites",
      ageLabel: "2h ago",
      trackSlug: "seo-geo",
    },
    {
      id: "ins-2",
      source: "Google Blog",
      title: "GA4 adds cross-channel budgeting reports",
      ageLabel: "1d ago",
      trackSlug: "analytics",
    },
    {
      id: "ins-3",
      source: "Marketing Week",
      title: "Paid social benchmarks for NZ retail, H1 2026",
      ageLabel: "2d ago",
      trackSlug: "digital-marketing",
    },
  ] satisfies InsightItem[],

  certifications: [
    {
      id: "cert-1",
      name: "Google Analytics 4 Certification",
      provider: "Google Skillshop",
      status: "in_progress",
      progressPct: 45,
    },
    {
      id: "cert-2",
      name: "Google Ads Search Certification",
      provider: "Google Skillshop",
      status: "planned",
      progressPct: 0,
    },
    {
      id: "cert-3",
      name: "HubSpot Inbound Marketing",
      provider: "HubSpot Academy",
      status: "planned",
      progressPct: 0,
    },
  ] satisfies Certification[],

  dataSources: [
    { id: "ds-1", name: "Supabase", detail: "database + auth", status: "pending" },
    { id: "ds-2", name: "Gemini API", detail: "tutor + grading", status: "pending" },
    { id: "ds-3", name: "Tavily", detail: "research chain", status: "connected" },
    { id: "ds-4", name: "YouTube API", detail: "lesson videos", status: "pending" },
    { id: "ds-5", name: "ntfy push", detail: "error alerts", status: "pending" },
  ] satisfies DataSource[],

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
