"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle, Crosshair, Flag, Lock } from "@phosphor-icons/react";
import Panel from "@/components/ui/Panel";
import { getTrack } from "@/lib/tracks";
import type { SkillMap as SkillMapData, SkillNode } from "@/lib/seed";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

function NodeBadge({ node }: { node: SkillNode }) {
  if (node.status === "done") {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-accent/40 bg-accent-soft text-accent">
        <CheckCircle size={18} weight="fill" />
      </span>
    );
  }
  if (node.status === "current") {
    return (
      <span
        className="grid size-11 shrink-0 place-items-center rounded-full border border-accent/60 bg-accent-soft text-accent-bright"
        style={{ boxShadow: "0 0 24px -4px var(--accent-glow)" }}
      >
        <Crosshair size={20} weight="duotone" />
      </span>
    );
  }
  if (node.status === "next") {
    return (
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong bg-bg-overlay text-ink-muted">
        <Flag size={18} weight="duotone" />
      </span>
    );
  }
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-bg-overlay text-ink-faint">
      <Lock size={16} />
    </span>
  );
}

function Connector({ from }: { from: SkillNode }) {
  const fillPct =
    from.status === "done" ? 100 : from.status === "current" ? from.progressPct : 0;
  return (
    <div className="mt-5 h-0.5 min-w-8 flex-1 overflow-hidden rounded-full bg-bg-overlay">
      <div
        className="h-full rounded-full bg-accent"
        style={{ width: `${fillPct}%` }}
      />
    </div>
  );
}

export default function SkillMap({ map }: { map: SkillMapData }) {
  const reduce = useReducedMotion();
  const track = getTrack(map.trackSlug);
  const doneCount = map.nodes.filter((n) => n.status === "done").length;

  return (
    <div data-accent={track?.accent}>
      <Panel
        title="Skill progress map"
        subtitle={`${track?.title}: ${doneCount} of ${map.nodes.length} modules mastered. The lit path is where you are.`}
        action={
          <span className="rounded-md bg-accent-soft px-2 py-1 text-[11px] font-medium text-accent-bright">
            {track?.title}
          </span>
        }
      >
        <div className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-start gap-2 pr-2">
            {map.nodes.map((node, i) => (
              <div key={node.id} className="contents">
                <motion.div
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.24, ease: EASE, delay: 0.04 * i }}
                  className="flex w-28 flex-col items-center gap-2 text-center"
                >
                  <NodeBadge node={node} />
                  <div className="leading-tight">
                    <p
                      className={
                        node.status === "locked"
                          ? "text-[11px] text-ink-faint"
                          : "text-[11px] font-medium text-ink"
                      }
                    >
                      {node.title}
                    </p>
                    <p className="pt-0.5 text-[10px] text-ink-faint">
                      {node.levelLabel}
                      {node.status === "current" && (
                        <span className="text-accent-bright">
                          {" "}
                          · {node.progressPct}%
                        </span>
                      )}
                      {node.status === "done" && (
                        <span className="text-accent"> · mastered</span>
                      )}
                    </p>
                  </div>
                </motion.div>
                {i < map.nodes.length - 1 && <Connector from={node} />}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
