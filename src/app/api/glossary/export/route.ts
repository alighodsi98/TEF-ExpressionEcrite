import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*] /gm, "")
    .replace(/^\d+\. /gm, "");
}

export async function GET(req: NextRequest) {
  const user = await getOrCreateCurrentUser();
  const format = req.nextUrl.searchParams.get("format") || "csv";

  const entries = await db.glossaryEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (format === "csv") {
    const header = "section,phrase,context,createdAt";
    const rows = entries.map((e) => {
      const phrase = `"${e.phrase.replace(/"/g, '""')}"`;
      const context = e.context ? `"${e.context.replace(/"/g, '""')}"` : "";
      return `${e.section},${phrase},${context},${e.createdAt.toISOString()}`;
    });
    const csv = "\uFEFF" + header + "\n" + rows.join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="glossaire.csv"',
      },
    });
  }

  if (format === "txt") {
    const lines = entries.map((e) => {
      const ctx = e.context ? ` — ${e.context}` : "";
      return `[Section ${e.section}] ${stripMarkdown(e.phrase)}${ctx}`;
    });
    const txt = lines.join("\n") || "Aucune entrée dans le glossaire.";
    return new NextResponse(txt, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": 'attachment; filename="glossaire.txt"',
      },
    });
  }

  return NextResponse.json({ error: "Format non supporté. Utilisez ?format=csv ou ?format=txt." }, { status: 400 });
}
