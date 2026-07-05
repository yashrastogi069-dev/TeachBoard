import { z } from "zod";

/*
  The Interactive Artifact Engine contract (AGENTS.md rule 7).
  The AI emits lesson content as an array of these blocks; the renderer in
  components/artifacts maps each type to a hand-built component. Interactive
  blocks (quiz, card-sort) report scores that feed lesson mastery.
*/

export const textBlock = z.object({
  type: z.literal("text"),
  markdown: z.string().min(1),
});

export const analogyBlock = z.object({
  type: z.literal("analogy"),
  title: z.string().min(1),
  markdown: z.string().min(1),
});

export const workedExampleBlock = z.object({
  type: z.literal("worked-example"),
  title: z.string().min(1),
  markdown: z.string().min(1),
});

export const flowchartBlock = z.object({
  type: z.literal("flowchart"),
  title: z.string().min(1),
  nodes: z
    .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
    .min(2)
    .max(10),
  edges: z
    .array(
      z.object({
        from: z.string().min(1),
        to: z.string().min(1),
        label: z.string().optional(),
      })
    )
    .min(1),
});

export const quizBlock = z.object({
  type: z.literal("quiz"),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  correctIndex: z.number().int().min(0),
  explanation: z.string().min(1),
});

export const cardSortBlock = z.object({
  type: z.literal("card-sort"),
  title: z.string().min(1),
  buckets: z
    .array(z.object({ id: z.string().min(1), label: z.string().min(1) }))
    .min(2)
    .max(4),
  cards: z
    .array(
      z.object({
        id: z.string().min(1),
        label: z.string().min(1),
        bucketId: z.string().min(1),
      })
    )
    .min(3)
    .max(10),
});

export const sliderSimBlock = z.object({
  type: z.literal("slider-sim"),
  title: z.string().min(1),
  description: z.string().min(1),
  inputLabel: z.string().min(1),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  unit: z.string().default(""),
  outputs: z
    .array(
      z.object({
        label: z.string().min(1),
        unit: z.string().default(""),
        base: z.number(),
        factor: z.number(),
      })
    )
    .min(1)
    .max(3),
});

export const compareBlock = z.object({
  type: z.literal("compare"),
  title: z.string().min(1),
  goodLabel: z.string().min(1),
  badLabel: z.string().min(1),
  goodMarkdown: z.string().min(1),
  badMarkdown: z.string().min(1),
});

export const chartBlock = z.object({
  type: z.literal("chart"),
  title: z.string().min(1),
  unit: z.string().default(""),
  series: z
    .array(z.object({ label: z.string().min(1), value: z.number() }))
    .min(2)
    .max(8),
});

export const videoBlock = z.object({
  type: z.literal("video"),
  title: z.string().min(1),
  searchQuery: z.string().min(1),
  url: z.string().url().optional(),
});

export const scenarioBlock = z.object({
  type: z.literal("scenario"),
  prompt: z.string().min(1),
  hint: z.string().min(1),
});

/*
  Hierarchical concept map: a root idea that branches into parts, each part
  expandable to reveal its detail. Two levels below the root keeps it
  readable on mobile.
*/
const treeLeaf = z.object({
  label: z.string().min(1),
  detail: z.string().min(1),
});
export const treeMapBlock = z.object({
  type: z.literal("tree-map"),
  title: z.string().min(1),
  root: z.object({
    label: z.string().min(1),
    children: z
      .array(
        z.object({
          label: z.string().min(1),
          detail: z.string().min(1),
          children: z.array(treeLeaf).max(5).optional(),
        })
      )
      .min(2)
      .max(6),
  }),
});

/*
  Simulated console walkthrough: the learner steps through real commands
  (terminal, SQL, robots.txt fetches, API calls) one at a time and sees the
  output plus why it matters. No real execution; the value is reading real
  tool output safely.
*/
export const terminalSimBlock = z.object({
  type: z.literal("terminal-sim"),
  title: z.string().min(1),
  description: z.string().min(1),
  steps: z
    .array(
      z.object({
        command: z.string().min(1),
        output: z.string().min(1),
        note: z.string().optional(),
      })
    )
    .min(2)
    .max(8),
});

export const lessonBlock = z.discriminatedUnion("type", [
  textBlock,
  analogyBlock,
  workedExampleBlock,
  flowchartBlock,
  quizBlock,
  cardSortBlock,
  sliderSimBlock,
  compareBlock,
  chartBlock,
  videoBlock,
  scenarioBlock,
  treeMapBlock,
  terminalSimBlock,
]);

export const lessonContentSchema = z.object({
  intro: z.string().min(1),
  blocks: z.array(lessonBlock).min(4).max(16),
});

export type LessonBlock = z.infer<typeof lessonBlock>;
export type LessonContent = z.infer<typeof lessonContentSchema>;

/* Deterministic scoring used by interactive blocks and unit tests. */

export function scoreQuiz(block: z.infer<typeof quizBlock>, chosenIndex: number): number {
  return chosenIndex === block.correctIndex ? 100 : 0;
}

export function scoreCardSort(
  block: z.infer<typeof cardSortBlock>,
  placement: Record<string, string> // cardId -> bucketId chosen by the learner
): number {
  const total = block.cards.length;
  if (total === 0) return 0;
  const correct = block.cards.filter((c) => placement[c.id] === c.bucketId).length;
  return Math.round((correct / total) * 100);
}
