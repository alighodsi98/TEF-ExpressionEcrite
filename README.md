# TEF Canada — Expression Écrite

Application de pratique pour le TEF Canada — Expression Écrite (Next.js + Electron + Prisma/SQLite).

## Build local

```bash
npm install
npx prisma generate
npm run electron:build   # NSIS + portable dans dist-electron/
```

## Build via GitHub Actions

Le workflow `.github/workflows/build.yml` construit les installateurs Windows
(NSIS + portable) et les publie en **GitHub Release** à chaque tag `v*`.

### 1. Ajouter le secret API

Le fichier `.env` (contenant `OPENROUTER_API_KEY`) est **ignoré par Git** et n'est
jamais poussé. Ajoutez la clé comme secret du dépôt :

- GitHub → **Settings → Secrets and variables → Actions → New repository secret**
- Name : `OPENROUTER_API_KEY`
- Value : votre clé OpenRouter

### 2. Déclencher un build

```bash
git tag v1.0.0
git push origin v1.0.0
```

Le workflow s'exécute, construit les `.exe` et les attache à une Release.

### 3. Télécharger les artefacts

- **Release** : onglet *Releases* du dépôt (fichiers `.exe`).
- **Artifacts** : onglet *Actions* → workflow → *windows-installers* (valable 90 jours).

## Base de données

La base `prisma/db/custom.db` est générée en CI via `prisma db push` (vide) puis
auto-seedée au premier lancement de l'application. Elle n'est pas versionnée.