"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Languages, Globe, Volume2, Loader2 } from "lucide-react";
import { buildDictionaryUrl, buildGoogleTranslateUrl } from "@/lib/dictionary";
import { speakFrench } from "@/lib/speech";

interface FloatingToolbarProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function FloatingToolbar({ containerRef }: FloatingToolbarProps) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const selectedTextRef = useRef("");

  const update = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setVisible(false);
      setPos(null);
      selectedTextRef.current = "";
      return;
    }

    const container = containerRef.current;
    if (!container) { setVisible(false); setPos(null); return; }

    let node = sel.anchorNode;
    while (node) {
      if (node === container) break;
      node = node.parentNode;
    }
    if (!node) { setVisible(false); setPos(null); return; }

    const raw = sel.toString().trim();
    if (!raw || raw.length > 300) { setVisible(false); setPos(null); return; }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    selectedTextRef.current = raw;
    setPos({ x: rect.left + rect.width / 2, y: rect.top - 48 });
    setVisible(true);
  }, [containerRef]);

  useEffect(() => {
    const onUp = () => setTimeout(update, 10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setVisible(false); setPos(null); }
    };
    const onScroll = () => { if (visible) update(); };
    const onMouseDown = (e: MouseEvent) => {
      const toolbar = document.getElementById("floating-toolbar-glossary");
      if (toolbar?.contains(e.target as Node)) return;
      setVisible(false);
      setPos(null);
      selectedTextRef.current = "";
    };

    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [update, visible]);

  if (!visible || !pos) return null;

  return createPortal(
    <div
      id="floating-toolbar-glossary"
      className="fixed z-[9999] flex items-center gap-1 rounded-full bg-background shadow-xl border border-border/60 px-1.5 py-1"
      style={{ left: pos.x, top: pos.y, transform: "translateX(-50%)" }}
    >
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1 rounded-full text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(buildGoogleTranslateUrl(selectedTextRef.current), "translate", "width=800,height=700,menubar=0,toolbar=0,location=1,status=0,scrollbars=1");
        }}
        title="Traduire avec Google Traduction"
      >
        <Languages className="h-3 w-3" /> Google
      </Button>
      <div className="h-4 w-px bg-border/40" />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1 rounded-full text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(buildDictionaryUrl(selectedTextRef.current), "dictionary", "width=800,height=700,menubar=0,toolbar=0,location=1,status=0,scrollbars=1");
        }}
        title="Chercher dans le dictionnaire dic.b-amooz"
      >
        <Globe className="h-3 w-3" /> dic.b-amooz
      </Button>
      <div className="h-4 w-px bg-border/40" />
      <Button
        size="sm"
        variant="ghost"
        className="h-7 gap-1 rounded-full text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
        onMouseDown={(e) => {
          e.preventDefault(); e.stopPropagation();
          speakFrench(selectedTextRef.current);
        }}
        title="Écouter la sélection"
      >
        {speaking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
        {speaking ? "..." : "Écouter"}
      </Button>
    </div>,
    document.body
  );
}