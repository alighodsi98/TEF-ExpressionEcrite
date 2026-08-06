"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";

import { PlacementIntroView } from "@/components/views/placement-intro";
import { PlacementSectionAView } from "@/components/views/placement-section-a";
import { PlacementSectionBView } from "@/components/views/placement-section-b";
import { LoadingView } from "@/components/views/loading-view";
import { PlacementResultsView } from "@/components/views/placement-results";
import { DashboardView } from "@/components/views/dashboard";
import { PracticeIntroView } from "@/components/views/practice-intro";
import { PracticeSectionAView } from "@/components/views/practice-section-a";
import { PracticeSectionBView } from "@/components/views/practice-section-b";
import { PracticeResultsView } from "@/components/views/practice-results";
import { ExternalEvalView } from "@/components/views/external-eval";
import { ExternalResultsView } from "@/components/views/external-results";
import { HistoryView } from "@/components/views/history";
import { SessionDetailView } from "@/components/views/session-detail";
import { SettingsView } from "@/components/views/settings-view";
import { GlossaryView } from "@/components/views/glossary-view";
import { TopicBankManagementView } from "@/components/views/topic-bank-management";
import { AiChatView } from "@/components/views/ai-chat-view";
import { SmartMissionPracticeView } from "@/components/views/smart-mission-practice";

export default function Home() {
  const view = useApp((s) => s.view);
  const hydrated = useApp((s) => s.hydrated);
  const setHydrated = useApp((s) => s.setHydrated);
  const setView = useApp((s) => s.setView);
  const checkHealth = useApp((s) => s.checkHealth);

  // Hydrate: auto-create user, then check if placement is done
  useEffect(() => {
    if (hydrated) return;
    (async () => {
      try {
        await fetch("/api/settings");
        // If no API key configured, still go to dashboard (settings can be accessed from there)
        setView("dashboard");
      } catch {
        setView("dashboard");
      } finally {
        setHydrated(true);
        // Run a real AI model health check every time the app starts.
        void checkHealth();
      }
    })();
  }, [hydrated, setView, setHydrated, checkHealth]);

  // Determine whether to show header (hide during placement/practice writing for focus)
  const writingViews = ["placement-section-a", "placement-section-b", "practice-section-a", "practice-section-b", "placement-loading", "practice-loading", "external-loading"];
  const showHeader = !writingViews.includes(view);
  const isWriting = writingViews.includes(view);

  const isAiChat = view === "ai-chat";

  return (
    <div className={`flex flex-col bg-background ${isWriting ? "h-screen" : "min-h-screen"}`}>
      {showHeader && <AppHeader />}
      <main className={`flex-1 min-h-0 ${isWriting ? "flex flex-col overflow-hidden" : isAiChat ? "flex flex-col px-4 py-6 sm:py-8" : "px-4 py-6 sm:py-8"}`}>
        {!hydrated ? (
          <div className="mx-auto flex h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Chargement…</p>
          </div>
        ) : (
          <>
            {view === "placement-intro" && <PlacementIntroView key="placement-intro" />}
            {view === "placement-section-a" && <PlacementSectionAView key="placement-section-a" />}
            {view === "placement-section-b" && <PlacementSectionBView key="placement-section-b" />}
            {view === "placement-loading" && (
              <LoadingView key="placement-loading" title="Correction de l'examen de positionnement…" onCancel={() => setView("placement-section-b")} />
            )}
            {view === "placement-results" && <PlacementResultsView key="placement-results" />}
            {view === "dashboard" && <DashboardView key="dashboard" />}
            {view === "practice-intro" && <PracticeIntroView key="practice-intro" />}
            {view === "practice-section-a" && <PracticeSectionAView key="practice-section-a" />}
            {view === "practice-section-b" && <PracticeSectionBView key="practice-section-b" />}
            {view === "practice-loading" && (
              <LoadingView key="practice-loading" title="Correction de l'exercice…" onCancel={() => setView("practice-section-b")} />
            )}
            {view === "practice-results" && <PracticeResultsView key="practice-results" />}
            {view === "external-eval" && <ExternalEvalView key="external-eval" />}
            {view === "external-loading" && (
              <LoadingView key="external-loading" title="Évaluation en cours…" onCancel={() => setView("external-eval")} />
            )}
            {view === "external-results" && <ExternalResultsView key="external-results" />}
            {view === "history" && <HistoryView key="history" />}
            {view === "session-detail" && <SessionDetailView key="session-detail" />}
            {view === "settings" && <SettingsView key="settings" />}
            {view === "glossary" && <GlossaryView key="glossary" />}
            {view === "topic-bank" && <TopicBankManagementView key="topic-bank" />}
            {view === "ai-chat" && <AiChatView key="ai-chat" />}
            {view === "smart-mission-practice" && <SmartMissionPracticeView key="smart-mission-practice" />}
          </>
        )}
      </main>
      {!isWriting && <AppFooter />}
    </div>
  );
}
