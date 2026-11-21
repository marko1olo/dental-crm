-- 0279_family_groups_balance_kopecks.sql
-- DEF-FAM-03: Add balance_kopecks bigint to family_groups table for exact integer financial integrity without float drift.
ALTER TABLE "family_groups" ADD COLUMN IF NOT EXISTS "balance_kopecks" bigint DEFAULT 0 NOT NULL;
UPDATE "family_groups" SET "balance_kopecks" = ROUND(COALESCE("balance", 0) * 100)::bigint WHERE "balance_kopecks" = 0 AND "balance" != 0;
