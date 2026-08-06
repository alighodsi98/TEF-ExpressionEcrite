"use client";

import { useState } from "react";
import { GraduationCap, Moon, Sun, Home, History, Settings, Activity, Check, Loader2, BookOpen, Library, MessageCircle, Target, Clock, KeyRound, Ban, ServerCrash, Wifi, AlertTriangle } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useApp, type ViewId } from "@/lib/store";
import { useMounted } from "@/hooks/use-mounted";
import { useToast } from "@/hooks/use-toast";

const NAV_ITEMS: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: Home },
  { id: "history", label: "Historique", icon: History },
  { id: "glossary", label: "Glossaire", icon: BookOpen },
  { id: "topic-bank", label: "Banque de sujets", icon: Library },
  { id: "smart-mission-practice", label: "Missions", icon: Target },
  { id: "ai-chat", label: "Assistant IA", icon: MessageCircle },
];

export function AppHeader() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const view = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16">
        <button
          onClick={() => setView("dashboard")}
          className="flex items-center gap-2.5 transition-all hover:opacity-80 active:scale-[0.98]"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/20 sm:h-9 sm:w-9 sm:rounded-xl">
            <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5" />
          </span>
          <span className="hidden flex-col items-start leading-tight sm:flex">
            <span className="text-sm font-bold tracking-tight">TEF Canada</span>
            <span className="text-[11px] text-muted-foreground">Expression Écrite</span>
          </span>
        </button>

        <nav className="flex items-center gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = view === item.id;
            return (
              <Button
                key={item.id}
                variant={active ? "default" : "ghost"}
                size="sm"
                onClick={() => setView(item.id)}
                className={`gap-1.5 transition-all ${active ? "shadow-sm shadow-primary/10" : ""}`}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            );
          })}
          <div className="mx-0.5 h-4 w-px bg-border/60" />
        </nav>

        <div className="flex items-center gap-0.5">
          <HealthIndicator />
          <Button
            variant={view === "settings" ? "default" : "ghost"}
            size="icon"
            onClick={() => setView("settings")}
            aria-label="Paramètres"
            className="transition-all"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Changer de thème"
            className="transition-all"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}

function HealthIndicator() {
  const health = useApp((s) => s.health);
  const checkHealth = useApp((s) => s.checkHealth);
  const setActiveModel = useApp((s) => s.setActiveModel);
  const mounted = useMounted();
  const { toast } = useToast();
  const [settingId, setSettingId] = useState<string | null>(null);

  if (!mounted) return null;

  const checking = health.status === "checking";
  const available = health.models.filter((m) => m.available);
  const total = health.models.length;

  const handleSelect = async (m: { id: string; name: string; available: boolean; configured: boolean }) => {
    if (!m.available || m.configured || settingId) return;
    setSettingId(m.id);
    const ok = await setActiveModel(m.id);
    setSettingId(null);
    if (ok) {
      toast({ title: "Modèle activé", description: `« ${m.name} » est désormais le modèle actif.` });
    } else {
      toast({ title: "Erreur", description: "Impossible d'activer ce modèle.", variant: "destructive" });
    }
  };

  let dotClass = "bg-muted-foreground";
  if (checking) dotClass = "bg-amber-500 animate-pulse";
  else if (health.status === "done") {
    dotClass = available.length > 0 ? "bg-emerald-500" : "bg-destructive";
  } else if (health.status === "error") dotClass = "bg-destructive";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="État des modèles IA" className="relative transition-all">
          <Activity className="h-4 w-4" />
          <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full ring-2 ring-background ${dotClass}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>État des modèles IA</span>
          {health.status === "done" && (
            <span className="text-xs font-normal text-muted-foreground">
              {available.length}/{total} disponibles
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {checking && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Vérification en cours…</p>
        )}
        {!checking && !health.configured && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Clé API non configurée. Configurez-la dans les paramètres.
          </p>
        )}
        {!checking && health.configured && total === 0 && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">Aucun modèle testé.</p>
        )}

        {!checking && health.models.length > 0 && (
          <>
            <p className="px-2 pb-1 text-[11px] text-muted-foreground">
              Sélectionnez un modèle disponible pour l&apos;activer.
            </p>
            <div className="max-h-72 overflow-y-auto tef-scroll">
              {health.models.map((m) => {
                const selectable = m.available && !m.configured && !settingId;
                const isSetting = settingId === m.id;
                return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      disabled={!selectable}
                      title={
                        m.configured
                          ? "Modèle actif"
                          : m.available
                            ? "Activer ce modèle"
                            : `Modèle indisponible${m.reason ? ` — ${m.reason}` : ""}`
                      }
                      className={`flex w-full items-center justify-between gap-2 px-2.5 py-2 text-right text-sm transition-all ${
                        m.configured
                          ? "bg-primary/5"
                          : selectable
                            ? "cursor-pointer hover:bg-accent"
                            : "cursor-not-allowed opacity-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            m.available ? "bg-emerald-500" : "bg-destructive"
                          }`}
                        />
                        <span className="truncate">{m.name}</span>
                        {!m.available && (
                          <span className="shrink-0">
                            {m.errorType === "timeout" && <Clock className="h-3 w-3 text-destructive/70" />}
                            {m.errorType === "auth_error" && <KeyRound className="h-3 w-3 text-destructive/70" />}
                            {m.errorType === "rate_limit" && <Ban className="h-3 w-3 text-destructive/70" />}
                            {m.errorType === "insufficient_quota" && <AlertTriangle className="h-3 w-3 text-destructive/70" />}
                            {m.errorType === "server_error" && <ServerCrash className="h-3 w-3 text-destructive/70" />}
                            {m.errorType === "network_error" && <Wifi className="h-3 w-3 text-destructive/70" />}
                          </span>
                        )}
                        {m.configured && (
                          <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Actif
                          </span>
                        )}
                      </span>
                    {isSetting ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                    ) : m.configured ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <span
                        className={`shrink-0 text-xs ${
                          m.available ? "text-emerald-600" : "text-destructive"
                        }`}
                      >
                        {m.available ? "Disponible" : "Indisponible"}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <DropdownMenuSeparator />
        <button
          onClick={() => void checkHealth()}
          disabled={checking}
          className="w-full px-2.5 py-1.5 text-right text-xs text-primary transition-colors hover:underline disabled:opacity-50"
        >
          Revérifier maintenant
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
