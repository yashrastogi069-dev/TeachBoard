"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

/*
  Cross-block mission state for a single lesson (AGENTS.md mission chain:
  briefing -> simulation -> reflection -> expert review). The four mission
  blocks render independently, but they share one run: the simulation records
  the learner's decision path and metric trajectory here, the reflection stores
  its text here, and the expert review reads both to critique the actual work.
  Everything is scoped to one MissionProvider instance, which LessonPlayer
  wraps around a lesson's block list, so two lessons never bleed into each other.
*/

export type MissionQuality = "best" | "good" | "poor";

/*
  One decision the learner actually made. Carries both the machine reference
  (stageId/choiceId, so lib/blocks helpers can replay it) and the human-facing
  text (situation/chosenLabel/feedback) the expert reviewer needs to judge it.
*/
export type MissionDecision = {
  stageId: string;
  choiceId: string;
  quality: MissionQuality;
  situation: string;
  chosenLabel: string;
  feedback: string;
};

export type MissionMeta = {
  title: string;
  role: string;
  objective: string;
  stakes: string;
};

type MissionSnapshot = {
  path: MissionDecision[];
  trajectory: Array<Record<string, number>>;
  finals: Record<string, number>;
  simulationDone: boolean;
};

type MissionContextValue = {
  /* Mission framing, recorded by the briefing block when one is present. */
  missionMeta: MissionMeta | null;
  setMissionMeta: (meta: MissionMeta) => void;

  /* Simulation run, written by the simulation block as decisions happen. */
  path: MissionDecision[];
  trajectory: Array<Record<string, number>>;
  finals: Record<string, number>;
  simulationDone: boolean;
  recordSimulation: (snapshot: MissionSnapshot) => void;
  resetSimulation: () => void;

  /* The saved run id (from /api/mission save), so the review can attach to it. */
  missionRunId: string | null;
  setMissionRunId: (id: string | null) => void;

  /* Reflection text, written by the reflection block. */
  reflection: string;
  setReflection: (text: string) => void;
};

const MissionContext = createContext<MissionContextValue | null>(null);

export function MissionProvider({ children }: { children: ReactNode }) {
  const [missionMeta, setMissionMetaState] = useState<MissionMeta | null>(null);
  const [path, setPath] = useState<MissionDecision[]>([]);
  const [trajectory, setTrajectory] = useState<Array<Record<string, number>>>([]);
  const [finals, setFinals] = useState<Record<string, number>>({});
  const [simulationDone, setSimulationDone] = useState(false);
  const [missionRunId, setMissionRunIdState] = useState<string | null>(null);
  const [reflection, setReflectionState] = useState("");

  const setMissionMeta = useCallback((meta: MissionMeta) => {
    // Idempotent: the briefing block sets this from stable props, so avoid a
    // needless re-render (and any effect loop) when nothing actually changed.
    setMissionMetaState((prev) =>
      prev &&
      prev.title === meta.title &&
      prev.role === meta.role &&
      prev.objective === meta.objective &&
      prev.stakes === meta.stakes
        ? prev
        : meta
    );
  }, []);

  const recordSimulation = useCallback((snapshot: MissionSnapshot) => {
    setPath(snapshot.path);
    setTrajectory(snapshot.trajectory);
    setFinals(snapshot.finals);
    setSimulationDone(snapshot.simulationDone);
  }, []);

  const resetSimulation = useCallback(() => {
    setPath([]);
    setTrajectory([]);
    setFinals({});
    setSimulationDone(false);
    setMissionRunIdState(null);
  }, []);

  const setMissionRunId = useCallback((id: string | null) => {
    setMissionRunIdState(id);
  }, []);

  const setReflection = useCallback((text: string) => {
    setReflectionState(text);
  }, []);

  const value = useMemo<MissionContextValue>(
    () => ({
      missionMeta,
      setMissionMeta,
      path,
      trajectory,
      finals,
      simulationDone,
      recordSimulation,
      resetSimulation,
      missionRunId,
      setMissionRunId,
      reflection,
      setReflection,
    }),
    [
      missionMeta,
      setMissionMeta,
      path,
      trajectory,
      finals,
      simulationDone,
      recordSimulation,
      resetSimulation,
      missionRunId,
      setMissionRunId,
      reflection,
      setReflection,
    ]
  );

  return <MissionContext.Provider value={value}>{children}</MissionContext.Provider>;
}

/*
  Reads the mission run. Returns null when a block is rendered outside a
  MissionProvider (e.g. a standalone preview) so blocks can degrade gracefully
  instead of crashing.
*/
export function useMission(): MissionContextValue | null {
  return useContext(MissionContext);
}
