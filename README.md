# TEF Canada — Expression Écrite

Application de pratique pour l'**épreuve d'expression écrite du TEF Canada**, avec correction par intelligence artificielle, suivi de progression et entraînement ciblé.

> Next.js 16 · TypeScript · Prisma/SQLite · Tailwind CSS · shadcn/ui · Electron

---

## ✨ Fonctionnalités

### 📝 Entraînement à l'écriture
- **Examen de positionnement** — évalue votre niveau NCLC/CECR (sections A et B) avant de commencer.
- **Séances complètes** — les deux sections de l'épreuve (fait divers + lettre argumentative) avec chronomètre, compteur de mots et correction IA.
- **Entraînement par sujet** — choisissez un sujet précis de la banque et entraînez-vous dessus seul.
- **Évaluation libre** — collez n'importe quel texte pour le faire corriger.
- **Correction quadruple par l'IA** — grammaire, vocabulaire, cohérence et style, avec score global /699 et niveau NCLC.

### 🗂️ Banque de sujets
- Sujets officiels TEF Canada (fait divers + lettre argumentative) avec phrase de départ.
- Recherche, filtres par section, ajout/édition/suppression et réorganisation par glisser-déposer.
- Génération de nouveaux sujets par l'IA.

### 📚 Glossaire personnel
- Sauvegarde des mots et expressions rencontrés dans les corrections.
- **Mode révision (flashcards)** avec lecture vocale (TTS français), comparaison de votre réponse, clavier d'accents et notation (Encore / Bon / Facile).
- Import/export CSV et TXT.

### 💬 Chat IA
- Posez vos questions de grammaire et d'orthographe en français.
- Historique des conversations, réponses en markdown, rendu RTL pour les réponses en persan.

### 🎯 Missions de révision intelligentes
- Après chaque correction, des exercices ciblés sur vos erreurs grammaticales réelles sont générés automatiquement.

### 📊 Suivi de progression
- Tableau de bord avec statistiques (séances, scores moyen/meilleur/dernier).
- Historique complet des séances avec détail des corrections.

### ⚙️ Personnalisation
- Choix du modèle IA (OpenRouter, 9router ou endpoint personnalisé).
- **Couleur d'accent** : émeraude, bleu, violet, rose ou ambre.
- Voix de synthèse française préférée.
- Sauvegarde/restauration complète des données (JSON).

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+ et npm
- Une clé API [OpenRouter](https://openrouter.ai/keys) (ou un endpoint compatible OpenAI)

### Installation

```bash
npm install
npx prisma generate
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000).

> La base de données SQLite (`prisma/db/custom.db`) est créée automatiquement au premier lancement.

### Scripts utiles

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production (standalone) |
| `npm run start` | Lance le serveur standalone |
| `npm run lint` | ESLint |
| `npm run db:push` | Synchronise le schéma Prisma avec la base |
| `npm run db:generate` | Régénère le client Prisma |
| `npm run electron:build` | Build Windows (NSIS + portable) |

---

## 🖥️ Build Windows (Electron)

### Build local

```bash
npm install
npx prisma generate
npm run electron:build   # NSIS + portable dans dist-electron/
```

### Build via GitHub Actions

Le workflow `.github/workflows/build.yml` construit les installateurs Windows (NSIS + portable) et les publie en **GitHub Release** à chaque tag `v*`.

1. **Ajouter le secret API** — le fichier `.env` (contenant `OPENROUTER_API_KEY`) est ignoré par Git. Ajoutez la clé comme secret du dépôt :
   - GitHub → **Settings → Secrets and variables → Actions → New repository secret**
   - Name : `OPENROUTER_API_KEY` · Value : votre clé OpenRouter

2. **Déclencher un build** :
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **Télécharger les artefacts** :
   - **Release** : onglet *Releases* du dépôt (fichiers `.exe`)
   - **Artifacts** : onglet *Actions* → workflow → *windows-installers* (valable 90 jours)

---

## 🗄️ Base de données

- **Moteur** : SQLite via Prisma ORM
- **Fichier** : `prisma/db/custom.db` (non versionné)
- La base est générée en CI via `prisma db push` (vide) puis auto-seedée au premier lancement (sujets officiels, profil utilisateur).

### Modèles principaux

| Modèle | Description |
|---|---|
| `UserProfile` | Profil utilisateur, configuration IA, couleur d'accent |
| `TopicBank` | Sujets officiels (section A/B, phrase de départ, catégorie) |
| `GlossaryEntry` | Mots/expressions sauvegardés + données de révision (boîte, compteur) |
| `Session` | Séances d'entraînement avec scores |
| `Correction` | Corrections IA détaillées (grammaire, vocabulaire, cohérence) |
| `Exercise` | Exercices de missions de révision |
| `SmartMission` | Missions générées après correction |
| `AiModel` | Catalogue de modèles IA (ajout/édition/suppression) |
| `ChatConversation` / `ChatMessage` | Conversations du chat IA |

---

## 🏗️ Architecture

```
src/
├── app/                  # App Router (pages + API routes)
│   ├── api/              # Routes API (settings, chat, glossary, sessions, backup…)
│   └── page.tsx          # Vue unique pilotée par le store Zustand
├── components/
│   ├── ui/               # Composants shadcn/ui
│   ├── views/            # Vues de l'application (dashboard, pratique, glossaire…)
│   └── accent-keyboard.tsx, accent-provider.tsx, theme-provider.tsx…
├── lib/                  # Logique métier (store, IA, TTS, diff, accent, topic-bank…)
└── hooks/                # Hooks réutilisables (use-draft, use-timer, use-toast…)
```

- **Navigation** : store Zustand (`src/lib/store.ts`) — chaque vue est un composant rendu conditionnellement.
- **IA** : `src/lib/ai.ts` — appel aux modèles via OpenRouter ou endpoint personnalisé (streaming SSE).
- **TTS** : `src/lib/speech.ts` — synthèse vocale française (Web Speech API).
- **Diff** : `src/lib/diff.ts` — comparaison mot à mot des réponses (révision flashcards).

---

## 📄 Licence

Projet personnel — usage privé.