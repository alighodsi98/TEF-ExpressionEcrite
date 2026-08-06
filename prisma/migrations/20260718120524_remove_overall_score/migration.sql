/*
  Warnings:

  - You are about to drop the column `overallScore` on the `Correction` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Correction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "level1Errors" TEXT NOT NULL,
    "level2Suggestions" TEXT NOT NULL,
    "level3Advanced" TEXT NOT NULL,
    "level4Rewrite" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "nclcLevel" TEXT NOT NULL,
    "cecrLevel" TEXT NOT NULL,
    "globalScore" REAL NOT NULL,
    "grammarIssues" TEXT NOT NULL,
    "vocabularyIssues" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Correction_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Correction" ("cecrLevel", "createdAt", "exerciseId", "feedback", "globalScore", "grammarIssues", "id", "level1Errors", "level2Suggestions", "level3Advanced", "level4Rewrite", "nclcLevel", "scores", "vocabularyIssues") SELECT "cecrLevel", "createdAt", "exerciseId", "feedback", "globalScore", "grammarIssues", "id", "level1Errors", "level2Suggestions", "level3Advanced", "level4Rewrite", "nclcLevel", "scores", "vocabularyIssues" FROM "Correction";
DROP TABLE "Correction";
ALTER TABLE "new_Correction" RENAME TO "Correction";
CREATE UNIQUE INDEX "Correction_exerciseId_key" ON "Correction"("exerciseId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
