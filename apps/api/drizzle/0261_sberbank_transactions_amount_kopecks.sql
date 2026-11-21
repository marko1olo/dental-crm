-- 0261 — Mandate 8bm: sberbank_transactions.amount_kopecks bigint
ALTER TABLE "sberbank_transactions" ADD COLUMN IF NOT EXISTS "amount_kopecks" bigint;--> statement-breakpoint

ALTER TABLE "sberbank_transactions" ALTER COLUMN "amount" DROP NOT NULL;--> statement-breakpoint

UPDATE "sberbank_transactions"
SET "amount_kopecks" = "amount"::bigint
WHERE "amount_kopecks" IS NULL AND "amount" IS NOT NULL;--> statement-breakpoint

ALTER TABLE "sberbank_transactions" ALTER COLUMN "amount_kopecks" SET NOT NULL;
