"use client";

const ACCENT_KEYS = [
  "à", "â", "é", "è", "ê", "ë",
  "î", "ï", "ô", "ù", "û", "ü",
  "ÿ", "ç", "œ", "æ",
  "«", "»", "—", "''", "``",
  "À", "Â", "É", "È", "Ê", "Ë",
  "Î", "Ï", "Ô", "Ù", "Û", "Ü", "Ÿ", "Ç",
];

interface AccentKeyboardProps {
  onInsert: (char: string) => void;
  className?: string;
}

export function AccentKeyboard({ onInsert, className }: AccentKeyboardProps) {
  return (
    <div dir="ltr" className={`flex flex-wrap gap-1 ${className ?? ""}`}>
      {ACCENT_KEYS.map((k) => (
        <button
          key={k}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(k)}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/30 font-french text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/[0.06] active:scale-95"
        >
          {k}
        </button>
      ))}
    </div>
  );
}
