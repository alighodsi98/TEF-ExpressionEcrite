-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
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

-- CreateTable
CREATE TABLE "TopicBank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "section" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "starterSentence" TEXT,
    "context" TEXT,
    "category" TEXT,
    "isDynamic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "focusTopic" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "starterSentence" TEXT,
    "context" TEXT,
    "userText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Exercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Correction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseId" TEXT NOT NULL,
    "level1Errors" TEXT NOT NULL,
    "level2Suggestions" TEXT NOT NULL,
    "level3Advanced" TEXT NOT NULL,
    "level4Rewrite" TEXT NOT NULL,
    "scores" TEXT NOT NULL,
    "nclcLevel" TEXT NOT NULL,
    "cecrLevel" TEXT NOT NULL,
    "overallScore" REAL NOT NULL,
    "globalScore" REAL NOT NULL,
    "grammarIssues" TEXT NOT NULL,
    "vocabularyIssues" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Correction_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SmartMission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stat" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "SmartMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SmartMission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");

-- CreateIndex
CREATE INDEX "Exercise_sessionId_idx" ON "Exercise"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Correction_exerciseId_key" ON "Correction"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "SmartMission_sessionId_key" ON "SmartMission"("sessionId");
