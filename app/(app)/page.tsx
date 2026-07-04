import { supabaseServer } from "@/lib/supabase/server";
import { getDashboardData } from "@/lib/dashboard";
import ResumeCard from "@/components/dashboard/ResumeCard";
import MasteryGrid from "@/components/dashboard/MasteryGrid";
import ActivityChart from "@/components/dashboard/ActivityChart";
import SkillMap from "@/components/dashboard/SkillMap";
import JobGoals from "@/components/dashboard/JobGoals";
import TodayPlan from "@/components/dashboard/TodayPlan";
import DeadlineList from "@/components/dashboard/DeadlineList";
import Recommendations from "@/components/dashboard/Recommendations";
import RecentScores from "@/components/dashboard/RecentScores";
import Certifications from "@/components/dashboard/Certifications";
import InsightsFeed from "@/components/dashboard/InsightsFeed";
import SystemHealth from "@/components/dashboard/SystemHealth";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // proxy redirects unauthenticated visits to /login

  const data = await getDashboardData(supabase, user);
  const firstName = (user.email ?? "there").split("@")[0];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3 pb-1">
        <div className="leading-tight">
          <h1 className="font-display text-xl font-semibold text-ink">
            Good to see you, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}
          </h1>
          <p className="pt-1 text-sm text-ink-muted">
            Here is where every track stands, what is due, and what to do next.
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <ResumeCard resume={data.resume} startHref={data.startHref} />
        <ActivityChart days={data.weeklyActivity} />
      </div>

      {data.skillMap && <SkillMap map={data.skillMap} />}

      <MasteryGrid items={data.trackMastery} />

      <div className="grid gap-4 lg:grid-cols-3">
        <TodayPlan items={data.todayPlan} />
        <DeadlineList items={data.deadlines} />
        <Recommendations items={data.recommendations} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <JobGoals goals={data.jobGoals} />
        <RecentScores items={data.recentScores} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Certifications items={data.certifications} />
        <InsightsFeed items={data.insights} />
      </div>

      <SystemHealth
        quotas={data.quotaUsage}
        events={data.systemEvents}
        aiUsage={data.aiUsage}
        dataSources={data.dataSources}
      />
    </div>
  );
}
