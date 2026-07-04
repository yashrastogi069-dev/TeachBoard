import { describe, expect, it } from "vitest";
import {
  cardSortBlock,
  lessonContentSchema,
  quizBlock,
  scoreCardSort,
  scoreQuiz,
} from "@/lib/blocks";

const quiz = quizBlock.parse({
  type: "quiz",
  question: "What does a canonical tag do?",
  options: [
    "Tells search engines which URL is the preferred version of a page",
    "Blocks a page from being crawled",
    "Speeds up page rendering",
  ],
  correctIndex: 0,
  explanation: "Canonical tags consolidate duplicate URLs onto one preferred version.",
});

const cardSort = cardSortBlock.parse({
  type: "card-sort",
  title: "On-page vs off-page SEO",
  buckets: [
    { id: "on", label: "On-page" },
    { id: "off", label: "Off-page" },
  ],
  cards: [
    { id: "c1", label: "Title tags", bucketId: "on" },
    { id: "c2", label: "Backlinks", bucketId: "off" },
    { id: "c3", label: "Internal linking", bucketId: "on" },
    { id: "c4", label: "Digital PR", bucketId: "off" },
  ],
});

describe("scoreQuiz", () => {
  it("scores 100 for the correct option", () => {
    expect(scoreQuiz(quiz, 0)).toBe(100);
  });

  it("scores 0 for a wrong option", () => {
    expect(scoreQuiz(quiz, 1)).toBe(0);
    expect(scoreQuiz(quiz, 2)).toBe(0);
  });
});

describe("scoreCardSort", () => {
  it("scores 100 when every card lands in its bucket", () => {
    expect(
      scoreCardSort(cardSort, { c1: "on", c2: "off", c3: "on", c4: "off" })
    ).toBe(100);
  });

  it("scores proportionally for partial placements", () => {
    expect(
      scoreCardSort(cardSort, { c1: "on", c2: "on", c3: "off", c4: "off" })
    ).toBe(50);
  });

  it("scores 0 when nothing is placed", () => {
    expect(scoreCardSort(cardSort, {})).toBe(0);
  });
});

describe("lessonContentSchema", () => {
  it("accepts a lesson that follows the teaching sequence", () => {
    const lesson = {
      intro: "Crawl budget decides how much of your site Google actually sees.",
      blocks: [
        { type: "text", markdown: "**Crawl budget** is the number of pages a search engine will fetch from your site in a given period." },
        {
          type: "analogy",
          title: "The supermarket restocker",
          markdown: "A restocker with one hour restocks the busiest aisles first; Googlebot spends its limited time on the pages your site signals matter most.",
        },
        {
          type: "worked-example",
          title: "Finding crawl waste in a 500-page store",
          markdown: "1. Export the crawl stats report.\n2. Group URLs by pattern.\n3. Faceted URLs eat 60 percent of hits: block them in robots.txt.",
        },
        {
          type: "flowchart",
          title: "How a page gets indexed",
          nodes: [
            { id: "a", label: "Discovered" },
            { id: "b", label: "Crawled" },
            { id: "c", label: "Rendered" },
            { id: "d", label: "Indexed" },
          ],
          edges: [
            { from: "a", to: "b" },
            { from: "b", to: "c" },
            { from: "c", to: "d", label: "if quality passes" },
          ],
        },
        {
          type: "quiz",
          question: "Which URL set most likely wastes crawl budget?",
          options: ["Faceted filter combinations", "The homepage", "Top category pages"],
          correctIndex: 0,
          explanation: "Faceted combinations multiply into near-duplicate URLs with little unique value.",
        },
        {
          type: "scenario",
          prompt: "A client's 10,000-page site has 200 pages indexed. Where do you look first?",
          hint: "Start with what the crawl stats and index coverage reports disagree about.",
        },
      ],
    };
    const parsed = lessonContentSchema.safeParse(lesson);
    expect(parsed.success).toBe(true);
  });

  it("rejects a lesson with too few blocks", () => {
    const parsed = lessonContentSchema.safeParse({
      intro: "Too thin to teach anything.",
      blocks: [{ type: "text", markdown: "Only one block." }],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an unknown block type", () => {
    const parsed = lessonContentSchema.safeParse({
      intro: "Bad block inside.",
      blocks: [
        { type: "text", markdown: "ok" },
        { type: "hologram", markdown: "not a real block" },
        { type: "text", markdown: "ok" },
        { type: "text", markdown: "ok" },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a quiz whose correctIndex is negative", () => {
    const parsed = quizBlock.safeParse({ ...quiz, correctIndex: -1 });
    expect(parsed.success).toBe(false);
  });
});
