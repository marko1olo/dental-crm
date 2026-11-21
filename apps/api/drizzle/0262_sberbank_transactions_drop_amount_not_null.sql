-- 0262 — Mandate 8bm: drop NOT NULL on legacy sberbank_transactions.amount
ALTER TABLE "sberbank_transactions" ALTER COLUMN "amount" DROP NOT NULL;
