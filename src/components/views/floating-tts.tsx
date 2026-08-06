"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Volume2, Loader2 } from "lucide-react";
import { findFrVoice, speakFrench } from "@/lib/speech";

interface FloatingTtsProps {
  containerRef: React.RefObject<HTMLElement | null>;
}

export function FloatingTtsButton({ containerRef }: FloatingTtsProps) {
  const [text, setText] = useState("");
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [visible, setVisible] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [hasFrench, setHasFrench] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const check = () => {
      setHasFrench(!!findFrVoice());
    };

    check();
    speechSynthesis.addEventListener("voiceschanged", check);

    const polling = setInterval(() => {
      if (findFrVoice()) {
        setHasFrench(true);
        clearInterval(polling);
      }
    }, 200);

    setTimeout(() => clearInterval(polling), 5000);

    return () => {
      speechSynthesis.cancel();
      speechSynthesis.removeEventListener("voiceschanged", check);
      clearInterval(polling);
    };
  }, []);

  useEffect(() => {
    return () => { speechSynthesis.cancel(); };
  }, []);

  const update = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setVisible(false);
      return;
    }

    const container = containerRef.current;
    if (!container) { setVisible(false); return; }

    let node = sel.anchorNode;
    while (node) {
      if (node === container) break;
      node = node.parentNode;
    }
    if (!node) { setVisible(false); return; }

    const raw = sel.toString().trim();
    if (!raw || raw.length > 300) { setVisible(false); return; }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setText(raw);
    setPos({ x: rect.right, y: rect.top + rect.height / 2 });
    setVisible(true);
  }, [containerRef]);

  useEffect(() => {
    const onUp = () => setTimeout(update, 10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    const onScroll = () => { if (visible) update(); };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("keyup", onUp);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("keyup", onUp);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [update, visible]);

  const speak = () => {
    if (!text || speaking) return;
    const u = speakFrench(text);
    if (!u) return;
    setSpeaking(true);
    const finish = () => setSpeaking(false);
    u.onend = finish;
    u.onerror = finish;
  };

  if (!visible) return null;

  return createPortal(
    <button
      ref={btnRef}
      onClick={speak}
      disabled={!hasFrench}
      style={{
        position: "fixed",
        left: `${pos.x + 8}px`,
        top: `${pos.y}px`,
        transform: "translateY(-50%)",
        zIndex: 9999,
      }}
      className="flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium shadow-lg transition-all hover:bg-muted active:scale-95 disabled:cursor-not-allowed"
      title={
        hasFrench
          ? speaking
            ? "Lecture en cours..."
            : "Écouter la sélection"
          : "Aucune voix française disponible"
      }
    >
      {speaking ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Volume2 className="h-3.5 w-3.5" />
      )}
      {speaking ? "..." : "Écouter"}
    </button>,
    document.body,
  );
}
