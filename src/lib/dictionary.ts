const ARTICLES = [
  "le ", "la ", "les ", "l'", "un ", "une ", "des ", "de ", "d'", "du ",
];

const ELIDED_PRONOUNS = ["n'", "s'", "m'", "t'", "c'", "j'", "l'", "d'"];

export function prepareDictionaryWord(text: string): string {
  let word = text.trim().toLowerCase();

  for (const article of ARTICLES) {
    if (word.startsWith(article)) {
      word = word.slice(article.length).trim();
      break;
    }
  }

  for (const p of ELIDED_PRONOUNS) {
    if (word.startsWith(p)) {
      word = word.slice(p.length).trim();
      break;
    }
  }

  const prepositions = ["à ", "pour ", "avec ", "dans ", "sur ", "sous ", "chez ", "entre ", "vers "];
  for (const prep of prepositions) {
    if (word.startsWith(prep)) {
      word = word.slice(prep.length).trim();
      break;
    }
  }

  word = word.replace(/[^a-zàâäçéèêëîïôöùûüÿæœ'-]/g, "").trim();

  return word || text.trim();
}

export function buildDictionaryUrl(text: string): string {
  const word = prepareDictionaryWord(text);
  return `https://dic.b-amooz.com/fr/dictionary/w?word=${encodeURIComponent(word)}`;
}

export function buildGoogleTranslateUrl(text: string): string {
  return `https://translate.google.com/?text=${encodeURIComponent(text)}&sl=fr&tl=en`;
}
