"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/*
  Shared state between the pages and the floating Copilot: which lesson the
  user is viewing (so the Professor is context-aware) and a way for lesson
  blocks to open the panel with a seeded message.
*/

export interface TutorLessonContext {
  lessonId: string;
  lessonTitle: string;
}

interface TutorContextValue {
  lesson: TutorLessonContext | null;
  setLesson: (ctx: TutorLessonContext | null) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  seedMessage: string | null;
  openWithMessage: (message: string) => void;
  consumeSeed: () => string | null;
}

const TutorContext = createContext<TutorContextValue | null>(null);

export function TutorProvider({ children }: { children: ReactNode }) {
  const [lesson, setLesson] = useState<TutorLessonContext | null>(null);
  const [open, setOpen] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  const openWithMessage = useCallback((message: string) => {
    setSeedMessage(message);
    setOpen(true);
  }, []);

  const consumeSeed = useCallback(() => {
    const seed = seedMessage;
    setSeedMessage(null);
    return seed;
  }, [seedMessage]);

  const value = useMemo(
    () => ({ lesson, setLesson, open, setOpen, seedMessage, openWithMessage, consumeSeed }),
    [lesson, open, seedMessage, openWithMessage, consumeSeed]
  );

  return <TutorContext.Provider value={value}>{children}</TutorContext.Provider>;
}

export function useTutor(): TutorContextValue {
  const ctx = useContext(TutorContext);
  if (!ctx) throw new Error("useTutor must be used inside TutorProvider");
  return ctx;
}
