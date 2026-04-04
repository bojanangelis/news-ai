-- Story clustering migration
-- Adds: Story, StoryArticle, Entity, ArticleEntity, DedupeDecision
-- Alters: Article (titleFingerprint)

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "StoryStatus" AS ENUM ('ACTIVE', 'MERGED', 'ARCHIVED');
CREATE TYPE "ArticleRole" AS ENUM ('CANONICAL', 'SUPPORTING', 'RELATED');
CREATE TYPE "MatchMethod" AS ENUM ('EXACT_URL', 'TITLE_FINGERPRINT', 'ENTITY_OVERLAP', 'MANUAL');
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'ORGANIZATION', 'LOCATION', 'EVENT');
CREATE TYPE "DedupeOutcome" AS ENUM ('JOINED_EXISTING', 'CREATED_NEW', 'EXACT_DUPLICATE_SKIPPED');

-- ─── Alter Article (add titleFingerprint) ─────────────────────────────────────

ALTER TABLE "Article" ADD COLUMN "titleFingerprint" TEXT;

-- ─── Story ────────────────────────────────────────────────────────────────────

CREATE TABLE "stories" (
    "id"                TEXT NOT NULL,
    "title"             TEXT NOT NULL,
    "summary"           TEXT,
    "imageUrl"          TEXT,
    "categoryId"        TEXT,
    "firstPublishedAt"  TIMESTAMP(3) NOT NULL,
    "lastPublishedAt"   TIMESTAMP(3) NOT NULL,
    "sourceCount"       INTEGER NOT NULL DEFAULT 1,
    "articleCount"      INTEGER NOT NULL DEFAULT 1,
    "status"            "StoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "isDeveloping"      BOOLEAN NOT NULL DEFAULT false,
    "clusterConfidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stories_lastPublishedAt_idx" ON "stories"("lastPublishedAt");
CREATE INDEX "stories_categoryId_status_idx" ON "stories"("categoryId", "status");
CREATE INDEX "stories_status_lastPublishedAt_idx" ON "stories"("status", "lastPublishedAt" DESC);

ALTER TABLE "stories"
    ADD CONSTRAINT "stories_categoryId_fkey"
    FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── StoryArticle ─────────────────────────────────────────────────────────────

CREATE TABLE "story_articles" (
    "id"          TEXT NOT NULL,
    "storyId"     TEXT NOT NULL,
    "articleId"   TEXT NOT NULL,
    "role"        "ArticleRole" NOT NULL DEFAULT 'SUPPORTING',
    "rankScore"   DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "matchMethod" "MatchMethod" NOT NULL,
    "matchScore"  DOUBLE PRECISION NOT NULL,
    "addedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "story_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "story_articles_storyId_articleId_key" ON "story_articles"("storyId", "articleId");
CREATE INDEX "story_articles_storyId_role_idx" ON "story_articles"("storyId", "role");
CREATE INDEX "story_articles_articleId_idx" ON "story_articles"("articleId");

ALTER TABLE "story_articles"
    ADD CONSTRAINT "story_articles_storyId_fkey"
    FOREIGN KEY ("storyId") REFERENCES "stories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "story_articles"
    ADD CONSTRAINT "story_articles_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "Article"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Entity ───────────────────────────────────────────────────────────────────

CREATE TABLE "entities" (
    "id"             TEXT NOT NULL,
    "name"           TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "type"           "EntityType" NOT NULL,

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "entities_normalizedName_type_key" ON "entities"("normalizedName", "type");

-- ─── ArticleEntity ────────────────────────────────────────────────────────────

CREATE TABLE "article_entities" (
    "articleId" TEXT NOT NULL,
    "entityId"  TEXT NOT NULL,
    "salience"  DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "article_entities_pkey" PRIMARY KEY ("articleId", "entityId")
);

ALTER TABLE "article_entities"
    ADD CONSTRAINT "article_entities_articleId_fkey"
    FOREIGN KEY ("articleId") REFERENCES "Article"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "article_entities"
    ADD CONSTRAINT "article_entities_entityId_fkey"
    FOREIGN KEY ("entityId") REFERENCES "entities"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── DedupeDecision ───────────────────────────────────────────────────────────

CREATE TABLE "dedupe_decisions" (
    "id"        TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "storyId"   TEXT,
    "decision"  "DedupeOutcome" NOT NULL,
    "method"    "MatchMethod" NOT NULL,
    "score"     DOUBLE PRECISION NOT NULL,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dedupe_decisions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dedupe_decisions_articleId_idx" ON "dedupe_decisions"("articleId");
CREATE INDEX "dedupe_decisions_createdAt_idx" ON "dedupe_decisions"("createdAt" DESC);
