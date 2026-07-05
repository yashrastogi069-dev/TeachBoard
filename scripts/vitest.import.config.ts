import { defineConfig } from "vitest/config";
import path from "node:path";

/*
  Config for the one-off lesson import pipeline (scripts/import-lessons.test.ts).
  Kept separate so `npm test` never touches the database.
  Run: npx vitest run --config scripts/vitest.import.config.ts
*/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".."),
    },
  },
  test: {
    include: ["scripts/import-lessons.test.ts"],
    environment: "node",
    testTimeout: 120_000,
  },
});
