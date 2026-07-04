/*
  Shared dashboard panel types (the data contract).
  Originally the Phase 0 preview data file; since Phase 3 the dashboard reads
  live Supabase data assembled in lib/dashboard.ts, and this file only
  defines the shapes every panel component consumes.
*/

import type { Track } from "./tracks";

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
  href: string;
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
