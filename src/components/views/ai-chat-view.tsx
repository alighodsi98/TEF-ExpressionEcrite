"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  ArrowUp,
  Loader2,
  Trash2,
  Plus,
  ArrowLeft,
  PanelLeftOpen,
  PanelLeftClose,
} from "lucide-react";
import { Markdown } from "@/components/markdown-components";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useApp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

// Detect Persian/Arabic script so bilingual answers render right-to-left
const PERSIAN_RE = /[\u0600-\u06FF]/;
function containsPersian(text: string): boolean {
  return PERSIAN_RE.test(text);
}

const SUGGESTIONS = [
  "Comment utiliser le plus-que-parfait dans un fait divers ?",
  "Quelle est la différence entre « qui » et « que » ?",
  "Donne-moi des connecteurs logiques pour une argumentation.",
  "Comment accorder les adjectifs composés ?",
];

export function AiChatView() {
  const setView = useApp((s) => s.setView);
  const { toast } = useToast();

  // Sidebar state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Active conversation state
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load conversation list
  const loadConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // ignore
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load a specific conversation
  async function openConversation(id: string) {
    setActiveConversationId(id);
    setMessages([]);
    try {
      const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(
          (data.messages || []).map((m: { id: string; role: string; content: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        );
      }
    } catch {
      // ignore
    }
  }

  // Start a new conversation
  async function startNewChat() {
    setActiveConversationId(null);
    setMessages([]);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setActiveConversationId(data.id);
        await loadConversations();
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de créer la conversation.", variant: "destructive" });
    }
  }

  // Delete a conversation
  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setDeletingId(id);
    try {
      const res = await fetch(`/api/chat/conversations/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Supprimé", description: "Conversation supprimée." });
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch {
      toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  // Send a message
  async function send(text?: string) {
    const content = (text || input).trim();
    if (!content || loading) return;

    // Ensure we have a conversation
    let convoId = activeConversationId;
    if (!convoId) {
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (res.ok && data.id) {
          convoId = data.id;
          setActiveConversationId(convoId);
        }
      } catch {
        toast({ title: "Erreur", description: "Impossible de créer la conversation.", variant: "destructive" });
        return;
      }
    }

    const userMsg: ChatMessage = { role: "user", content };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, conversationId: convoId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur inconnue");
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
      // Refresh sidebar to update titles
      await loadConversations();
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${e instanceof Error ? e.message : "Erreur inconnue"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="tef-fade-up flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-background">
      {/* ── HEADER ROW: sidebar header + toolbar share one border-b ── */}
      <div className="flex shrink-0 border-b border-border/50">
        {/* Sidebar header */}
        <div
          inert={!sidebarOpen}
          className={`flex items-center gap-2 transition-all duration-300 ${
            sidebarOpen ? "w-72 shrink-0 border-r border-border/50 px-4 py-2" : "w-0 shrink-0 overflow-hidden px-0 py-2"
          }`}
        >
          <span className="flex-1 truncate text-sm font-semibold">Conversations</span>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={startNewChat}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {/* Chat toolbar */}
        <div className="flex flex-1 items-center gap-2 px-4 py-2 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Masquer la barre latérale" : "Afficher la barre latérale"}
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setView("dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="shrink-0 gap-1.5 text-xs" onClick={startNewChat}>
            <Plus className="h-3.5 w-3.5" />
            Nouvelle conversation
          </Button>
        </div>
      </div>

      {/* ── CONTENT ROW: sidebar list + messages + input ── */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar list */}
        <div
          inert={!sidebarOpen}
          className={`border-r border-border/50 transition-all duration-300 ${
            sidebarOpen ? "w-72 shrink-0" : "w-0 shrink-0 overflow-hidden"
          }`}
        >
          <ScrollArea className="h-full">
            <div className="p-2">
              {loadingConversations ? (
                <div className="space-y-2 p-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Aucune conversation</p>
                </div>
              ) : (
                conversations.map((c) => (
                  <div
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openConversation(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openConversation(c.id);
                      }
                    }}
                    className={`group grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-lg px-3 py-2.5 text-left transition-all ${
                      activeConversationId === c.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {c.messageCount} message{c.messageCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => deleteConversation(c.id, e)}
                      disabled={deletingId === c.id}
                      className="relative z-10 mt-0.5 shrink-0 rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                      aria-label="Supprimer"
                    >
                      {deletingId === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main chat area */}
        <div className="flex flex-1 flex-col min-w-0">
          {/* Messages */}
          <ScrollArea className="flex-1 overflow-hidden">
            <div ref={scrollRef} className="flex flex-col gap-3 p-4 min-h-full justify-end">
              {messages.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8 text-center">
                  <div className="rounded-full bg-muted/60 p-3">
                    <MessageCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Posez vos questions sur la grammaire française, l&apos;orthographe, ou la préparation au TEF Canada.
                  </p>
                  <div className="flex flex-col gap-2 w-full max-w-sm">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5 text-left text-xs text-muted-foreground transition-all hover:border-primary/20 hover:bg-muted/50"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={msg.id || i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    dir={msg.role === "user" ? "ltr" : containsPersian(msg.content) ? "rtl" : "ltr"}
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-2xl rounded-bl-md bg-muted text-foreground"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    ) : (
                      <div className="chat-markdown">
                        <Markdown value={msg.content} />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-muted px-3.5 py-2.5 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Réflexion…
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input — floating bar */}
          <div className="p-4 pt-2">
            <div className="flex gap-2 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-lg shadow-black/5 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Votre question…"
                rows={1}
                className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
              />
              <Button
                size="icon"
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="shrink-0 self-end rounded-full"
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
