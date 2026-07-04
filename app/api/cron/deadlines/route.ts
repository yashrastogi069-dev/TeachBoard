import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pushNotification, reportEvent } from "@/lib/notify";
import { checkCronAuth } from "@/lib/cron";

/*
  Morning deadline sweep: pushes a reminder for anything due within a day
  and marks overdue active deadlines as missed (which also pushes, so a
  missed deadline is never silent).
*/
export async function POST(request: Request) {
  const denied = checkCronAuth(request);
  if (denied) return denied;

  const admin = supabaseAdmin();

  try {
    const { data: rows, error } = await admin
      .from("deadlines")
      .select("id, title, due_date")
      .eq("status", "active")
      .order("due_date");
    if (error) throw new Error(error.message);

    const today = new Date(new Date().toISOString().slice(0, 10));
    let reminded = 0;
    let missed = 0;

    for (const d of rows ?? []) {
      const due = new Date(d.due_date);
      const daysLeft = Math.round((due.getTime() - today.getTime()) / 86400_000);

      if (daysLeft < 0) {
        const { error: updateErr } = await admin
          .from("deadlines")
          .update({ status: "missed" })
          .eq("id", d.id);
        if (updateErr) {
          await reportEvent(
            "error",
            "cron/deadlines",
            `Could not mark deadline missed (${d.title}): ${updateErr.message}`
          );
          continue;
        }
        missed++;
        await pushNotification(
          "Praxis deadline missed",
          `"${d.title}" was due ${d.due_date}. It is now marked missed; the dashboard has a rescue plan.`
        );
      } else if (daysLeft <= 1) {
        reminded++;
        await pushNotification(
          "Praxis deadline reminder",
          `"${d.title}" is due ${daysLeft === 0 ? "today" : "tomorrow"} (${d.due_date}).`
        );
      }
    }

    await reportEvent(
      "info",
      "cron/deadlines",
      `Deadline sweep done: ${reminded} reminder(s), ${missed} marked missed.`
    );
    return NextResponse.json({ ok: true, reminded, missed });
  } catch (err) {
    const message = err instanceof Error ? err.message : "deadline sweep failed";
    await reportEvent("error", "cron/deadlines", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
