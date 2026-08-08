import { NextRequest, NextResponse } from "next/server";
import { callLLM } from "@/lib/ai";
import { GRAMMAR_TOPICS } from "@/lib/topic-bank";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic } = body as { topic: string };

    const grammarTopic = GRAMMAR_TOPICS.find((g) => g.key === topic);
    if (!grammarTopic) {
      return NextResponse.json({ error: "Sujet grammatical inconnu." }, { status: 400 });
    }

    const system = `CRITICAL FORMAT RULE: Your ENTIRE response must be EXACTLY one JSON object. Start with <<<JSON>>> then the JSON then >>>. No text, no markdown fences, no commentary. Failure to follow this format will cause an error.

You are a professeur de français langue étrangère (FLE) spécialisé dans le TEF Canada. You produce example sentences and interactive exercises for French grammar points.`;

    const userPrompt = `Génère 5 phrases d'exemple ET 3 exercices interactifs en français pour le point de grammaire suivant :

POINT DE GRAMMAIRE : ${grammarTopic.label} (${grammarTopic.description})

EXIGENCES POUR LES EXEMPLES (5 phrases) :
1. Chaque phrase doit être correcte grammaticalement.
2. Chaque phrase doit illustrer clairement "${grammarTopic.label}".
3. Les phrases doivent être liées aux sujets de l'examen TEF Canada Expression Écrite :
   - Section A (fait divers) : faits inhabituels, accidents, découvertes, événements surprenants.
   - Section B (argumentation) : débats de société, éducation, santé, environnement, technologie.
4. Niveau B2-C1 : vocabulaire riche, structures complexes mais naturelles.
5. Chaque phrase doit être accompagnée d'une brève explication en français de pourquoi elle illustre ce point de grammaire.

EXIGENCES POUR LES EXERCICES (3 exercices) :
1. Chaque exercice doit tester "${grammarTopic.label}" de façon pratique.
2. Utilise différents types d'exercices parmi : conjugaison, transformation, complétion, réécriture.
3. L'instruction doit être claire et en français.
4. Le prompt est la phrase à compléter/transformer. Utilise "_____" pour les blancs ou donne la phrase de départ.
5. Fournis une réponse correcte de référence (correctAnswer) en français.
6. Les exercices doivent être liés aux thèmes de l'examen TEF Canada.
7. Niveau B2-C1.

Exemples de types d'exercices :
- Conjugaison : "Conjuguez le verbe au plus-que-parfait : Quand je _____ (arriver), il _____ (déjà partir)."
- Transformation : "Réécrivez à la voix passive : Le facteur a livré le colis."
- Complétion : "Complétez par l'accord correct : Les lettres qu'elle _____ (écrire) sont sur la table."
- Réécriture : "Réécrivez cette phrase en utilisant le conditionnel présent : Il est peut-être malade."

Produis un objet JSON avec exactement cette forme :
<<<JSON>>>
{
  "sentences": [
    { "french": "la phrase en français", "explanation": "explication en français" }
  ],
  "exercises": [
    { "instruction": "Consigne en français", "prompt": "La phrase avec _____ ou la tâche", "correctAnswer": "La réponse correcte" }
  ]
}
>>>

5 exemples et 3 exercices. Toutes en français.`;

    const raw = await callLLM(system, userPrompt);

    // Extract JSON from the response
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
      topic,
      topicLabel: grammarTopic.label,
      description: grammarTopic.description,
      sentences: parsed.sentences || [],
      exercises: parsed.exercises || [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur de génération" },
      { status: 500 }
    );
  }
}
