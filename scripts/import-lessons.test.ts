import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { lessonContentSchema } from "@/lib/blocks";

/*
  Pre-authored lesson import pipeline. Reads every <lessonId>.json in the
  directory given by LESSON_CONTENT_DIR, validates it against the artifact
  schema, and writes it into lessons.content (service role). Any invalid file
  fails the run with the exact zod error so nothing broken ever reaches the
  player. Runs via its own config so `npm test` stays side-effect free:
    LESSON_CONTENT_DIR=<dir> npx vitest run --config scripts/vitest.import.config.ts
*/

function loadEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  const raw = fs.readFileSync(path.resolve(__dirname, "..", ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([^=#]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const dir = process.env.LESSON_CONTENT_DIR ?? "";

describe("import pre-authored lessons", () => {
  it("validates and imports every lesson file", async () => {
    expect(dir, "LESSON_CONTENT_DIR env var must point at the JSON folder").toBeTruthy();
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    expect(files.length, `no .json files found in ${dir}`).toBeGreaterThan(0);

    const env = loadEnv();
    const admin = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const failures: string[] = [];
    let imported = 0;

    for (const file of files) {
      const lessonId = path.basename(file, ".json");
      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      } catch (err) {
        failures.push(`${file}: invalid JSON: ${err instanceof Error ? err.message : err}`);
        continue;
      }
      const validated = lessonContentSchema.safeParse(parsedJson);
      if (!validated.success) {
        const issues = validated.error.issues
          .slice(0, 3)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        failures.push(`${file}: schema: ${issues}`);
        continue;
      }
      const { error, data } = await admin
        .from("lessons")
        .update({ content: validated.data })
        .eq("id", lessonId)
        .select("id");
      if (error) {
        failures.push(`${file}: db: ${error.message}`);
      } else if (!data || data.length === 0) {
        failures.push(`${file}: db: no lesson row with id ${lessonId}`);
      } else {
        imported++;
      }
    }

    console.log(`imported ${imported}/${files.length} lessons from ${dir}`);
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
