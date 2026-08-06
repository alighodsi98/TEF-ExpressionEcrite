/*
  Warnings:

  - You are about to drop the column `email` on the `UserProfile` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetNclc" INTEGER NOT NULL DEFAULT 7,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "placementDone" BOOLEAN NOT NULL DEFAULT false,
    "placementMode" TEXT,
    "levelSectionA" TEXT,
    "levelSectionB" TEXT,
    "levelOverallNclc" TEXT,
    "levelOverallCecr" TEXT,
    "aiApiKey" TEXT,
    "aiModel" TEXT
);
INSERT INTO "new_UserProfile" ("aiApiKey", "aiModel", "createdAt", "id", "levelOverallCecr", "levelOverallNclc", "levelSectionA", "levelSectionB", "name", "placementDone", "placementMode", "targetNclc", "updatedAt") SELECT "aiApiKey", "aiModel", "createdAt", "id", "levelOverallCecr", "levelOverallNclc", "levelSectionA", "levelSectionB", "name", "placementDone", "placementMode", "targetNclc", "updatedAt" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
