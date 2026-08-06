import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/ai";
import { GRAMMAR_TOPICS } from "@/lib/topic-bank";

interface Exercise {
  instruction: string;
  prompt: string;
  correctAnswer: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, exercise, userAnswer } = body as {
      topic: string;
      exercise: Exercise;
      userAnswer: string;
    };

    if (!topic || !exercise || !userAnswer?.trim()) {
      return NextResponse.json({ error: "Données incomplètes." }, { status: 400 });
    }

    const grammarTopic = GRAMMAR_TOPICS.find((g) => g.key === topic);
    if (!grammarTopic) {
      return NextResponse.json({ error: "Sujet grammatical inconnu." }, { status: 400 });
    }

    const system = `CRITICAL FORMAT RULE: Your ENTIRE response must be EXACTLY one JSON object. Start with <<<JSON>>> then the JSON then >>>. No text, no markdown fences, no commentary. Failure to follow this format will cause an error.

You are a professeur de français langue étrangère (FLE) spécialisé dans le TEF Canada. You evaluate student answers to French grammar exercises. Be encouraging but rigorous.`;

    const userPrompt = `Évalue la réponse d'un étudiant pour un exercice de grammaire française.

POINT DE GRAMMAIRE : ${grammarTopic.label} (${grammarTopic.description})

EXERCICE :
Instruction : ${exercise.instruction}
Consigne : ${exercise.prompt}

RÉPONSE DE L'ÉTUDIANT :
"${userAnswer}"

CORRECTION ATTENDUE (référence) :
"${exercise.correctAnswer}"

Évalue la réponse en fonction du point de grammaire "${grammarTopic.label}". La réponse n'a pas besoin d'être identique mot pour mot à la correction attendue — elle doit être grammaticalement correcte et démontrer la maîtrise du point de grammaire visé.

Ne pénalise pas les variations stylistiques valides. Sois indulgent·e mais honnête : si la réponse est correcte sur le fond, dis-le.
Ne donne pas la correction directement dans le feedback - guide l'étudiant.

Produis un objet JSON avec exactement cette forme :
<<<JSON>>>
{
  "correct": true/false,
  "feedback": "Un retour en français (2-3 phrases) qui explique si la réponse est correcte et pourquoi, ou donne un indice sans révéler la réponse."
}
>>>

Retour en français uniquement.`;

    const raw = await callLLM(system, userPrompt);

    let text = raw
      .replace(/﻿/g, "")
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const delim = text.match(/<<<JSON>>>\s*([\s\S]*?)\s*>>>/i);
    if (delim) text = delim[1].trim();

    const firstBrace = text.indexOf("{");
    const lastBrace = text.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      text = text.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(text);

    return NextResponse.json({
      correct: parsed.correct,
      feedback: parsed.feedback || "Aucun retour généré.",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur de vérification" },
      { status: 500 }
    );
  }
}
