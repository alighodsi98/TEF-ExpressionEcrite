"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const TEX_SYMBOLS: Record<string, string> = {
  rightarrow: "→",
  leftarrow: "←",
  Rightarrow: "⇒",
  Leftarrow: "⇐",
  leftrightarrow: "↔",
  Leftrightarrow: "⇔",
  implies: "⇒",
  iff: "⇔",
  to: "→",
  times: "×",
  cdot: "·",
  dots: "…",
  ldots: "…",
  le: "≤",
  ge: "≥",
  neq: "≠",
  ne: "≠",
  approx: "≈",
  infty: "∞",
  in: "∈",
  notin: "∉",
  subset: "⊂",
  supset: "⊃",
  emptyset: "∅",
};

export function fixLatex(text: string): string {
  return text.replace(/\$\s*\\?([A-Za-z]+)\s*\$/g, (m, cmd: string) => TEX_SYMBOLS[cmd] ?? m);
}

export const MD_COMPONENTS = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="whitespace-pre-wrap leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="list-disc space-y-0.5 pl-5">{children}</ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="list-decimal space-y-0.5 pl-5">{children}</ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-bold">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
  del: ({ children }: { children?: ReactNode }) => <del className="line-through">{children}</del>,
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead className="bg-muted/60">{children}</thead>,
  tbody: ({ children }: { children?: ReactNode }) => <tbody>{children}</tbody>,
  tr: ({ children }: { children?: ReactNode }) => <tr className="border-b border-border/70">{children}</tr>,
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border border-border/70 px-2 py-1 text-left font-semibold">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border border-border/70 px-2 py-1 align-top">{children}</td>
  ),
};

export function Markdown({ value }: { value: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {fixLatex(value)}
    </ReactMarkdown>
  );
}
