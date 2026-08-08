"use client";

import { create } from "zustand";

// ---------------------------------------------------------------------------
// View identifiers
// ---------------------------------------------------------------------------
export type ViewId =
  | "placement-intro"
  | "placement-section-a"
  | "placement-section-b"
  | "placement-loading"
  | "placement-results"
  | "dashboard"
  | "practice-intro"
  | "practice-loading"
  | "practice-section-a"
  | "practice-section-b"
  | "practice-results"
  | "practice-single"
  | "practice-single-loading"
  | "practice-single-results"
  | "external-eval"
  | "external-loading"
  | "external-results"
  | "history"
  | "session-detail"
  | "settings"
  | "glossary"
  | "topic-bank"
  | "ai-chat"
  | "smart-mission-practice";

export interface TopicA {
  topic: string;
  starterSentence: string;
  category: string;
}
export interface TopicB {
  topic: string;
  context: string;
  category: string;
}

export interface PracticeTopic {
  section: "A" | "B";
  topic: string;
  starterSentence?: string | null;
  context?: string | null;
  category?: string | null;
}

export interface LoadingProgress {
  total: number;
  completed: number;
  current: string;
  doneSteps: string[];
}

export interface ModelHealth {
  id: string;
  name: string;
  available: boolean;
  reason?: string;
  errorType?: string | null;
  configured: boolean;
}

export interface HealthState {
  status: "idle" | "checking" | "done" | "error";
  configured: boolean;
  models: ModelHealth[];
  checkedAt: string | null;
}

export interface AppState {
  view: ViewId;
  viewParams: Record<string, unknown>;
  hydrated: boolean;

  // Placement flow
  placementSectionA: TopicA | null;
  placementSectionB: TopicB | null;
  placementTextA: string;
  placementTextB: string;
  placementDurationA: number;
  placementDurationB: number;
  placementResult: unknown | null;

  // Practice flow
  practiceSectionA: TopicA | null;
  practiceSectionB: TopicB | null;
  practiceTextA: string;
  practiceTextB: string;
  practiceDurationA: number;
  practiceDurationB: number;
  practiceResult: unknown | null;
  practiceSessionId: string | null;

  // Single-topic practice (started from the topic bank)
  practiceTopic: PracticeTopic | null;

  // Loading progress
  loadingProgress: LoadingProgress | null;

  // External evaluation
  externalResult: unknown | null;
  externalText: string;
  externalTopic: string;

  // Session detail
  detailSessionId: string | null;

  // AI model health check
  health: HealthState;
  checkHealth: () => Promise<void>;
  setActiveModel: (modelId: string) => Promise<boolean>;

  // Actions
  setView: (view: ViewId, params?: Record<string, unknown>) => void;
  setHydrated: (v: boolean) => void;
  setLoadingProgress: (p: LoadingProgress | null) => void;

  setPlacementTopics: (a: TopicA | null, b: TopicB | null) => void;
  setPlacementText: (section: "A" | "B", text: string) => void;
  setPlacementDuration: (section: "A" | "B", sec: number) => void;
  setPlacementResult: (r: unknown) => void;
  resetPlacement: () => void;

  setExternalResult: (r: unknown) => void;
  setExternalText: (t: string) => void;
  setExternalTopic: (t: string) => void;

  setPracticeTopics: (a: TopicA | null, b: TopicB | null) => void;
  setPracticeText: (section: "A" | "B", text: string) => void;
  setPracticeDuration: (section: "A" | "B", sec: number) => void;
  setPracticeResult: (r: unknown) => void;
  setPracticeSessionId: (id: string | null) => void;
  setPracticeTopic: (t: PracticeTopic | null) => void;
  resetPractice: () => void;

  setDetailSessionId: (id: string | null) => void;
}

export const useApp = create<AppState>((set, get) => ({
  view: "dashboard",
  viewParams: {},
  hydrated: false,

  placementSectionA: null,
  placementSectionB: null,
  placementTextA: "",
  placementTextB: "",
  placementDurationA: 0,
  placementDurationB: 0,
  placementResult: null,

  practiceSectionA: null,
  practiceSectionB: null,
  practiceTextA: "",
  practiceTextB: "",
  practiceDurationA: 0,
  practiceDurationB: 0,
  practiceResult: null,
  practiceSessionId: null,
  practiceTopic: null,

  loadingProgress: null,

  externalResult: null,
  externalText: "",
  externalTopic: "",

  detailSessionId: null,

  health: { status: "idle", configured: false, models: [], checkedAt: null },
  checkHealth: async () => {
    if (get().health.status === "checking") return;
    set((s) => ({ health: { ...s.health, status: "checking" } }));
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      set({
        health: {
          status: "done",
          configured: !!data.configured,
          models: data.models ?? [],
          checkedAt: data.checkedAt ?? new Date().toISOString(),
        },
      });
    } catch {
      set((s) => ({ health: { ...s.health, status: "error" } }));
    }
  },
  setActiveModel: async (modelId) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiModel: modelId }),
      });
      if (!res.ok) return false;
      set((s) => ({
        health: {
          ...s.health,
          models: s.health.models.map((m) => ({ ...m, configured: m.id === modelId })),
        },
      }));
      return true;
    } catch {
      return false;
    }
  },

  setView: (view, params = {}) => {
    set({ view, viewParams: params });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  setHydrated: (v) => set({ hydrated: v }),
  setLoadingProgress: (p) => set({ loadingProgress: p }),

  setPlacementTopics: (a, b) => set({ placementSectionA: a, placementSectionB: b }),
  setPlacementText: (section, text) =>
    section === "A" ? set({ placementTextA: text }) : set({ placementTextB: text }),
  setPlacementDuration: (section, sec) =>
    section === "A" ? set({ placementDurationA: sec }) : set({ placementDurationB: sec }),
  setPlacementResult: (r) => set({ placementResult: r }),
  resetPlacement: () =>
    set({
      placementSectionA: null,
      placementSectionB: null,
      placementTextA: "",
      placementTextB: "",
      placementDurationA: 0,
      placementDurationB: 0,
      placementResult: null,
      loadingProgress: null,
    }),

  setExternalResult: (r) => set({ externalResult: r }),
  setExternalText: (t) => set({ externalText: t }),
  setExternalTopic: (t) => set({ externalTopic: t }),

  setPracticeTopics: (a, b) => set({ practiceSectionA: a, practiceSectionB: b }),
  setPracticeText: (section, text) =>
    section === "A" ? set({ practiceTextA: text }) : set({ practiceTextB: text }),
  setPracticeDuration: (section, sec) =>
    section === "A" ? set({ practiceDurationA: sec }) : set({ practiceDurationB: sec }),
  setPracticeResult: (r) => set({ practiceResult: r }),
  setPracticeSessionId: (id) => set({ practiceSessionId: id }),
  setPracticeTopic: (t) => set({ practiceTopic: t }),
  resetPractice: () =>
    set({
      practiceSectionA: null,
      practiceSectionB: null,
      practiceTextA: "",
      practiceTextB: "",
      practiceDurationA: 0,
      practiceDurationB: 0,
      practiceResult: null,
      practiceSessionId: null,
      practiceTopic: null,
      loadingProgress: null,
    }),

  setDetailSessionId: (id) => set({ detailSessionId: id }),
}));
