"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Markdown } from "@/components/markdown-components";

const MdxEditor = dynamic(() => import("./mdx-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-36 items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

export function MarkdownContent({
  value,
  className,
  dir,
}: {
  value: string;
  className?: string;
  dir?: string;
}) {
  return (
    <div dir={dir} className={cn("text-sm leading-relaxed", className)}>
      <Markdown value={value} />
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  dir,
  resetKey,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dir?: string;
  resetKey?: string;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <div dir={dir} className={cn(dark && "dark-theme", className)}>
      <div className="rounded-lg border border-input bg-transparent transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]">
        <MdxEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          resetKey={resetKey}
          contentEditableClassName="mdx-contenteditable"
        />
      </div>
    </div>
  );
}
