ALTER TABLE "cash_operations" ADD COLUMN IF NOT EXISTS "amount_kopecks" bigint;
ALTER TABLE "installment_tranches" ADD COLUMN IF NOT EXISTS "amount_kopecks" bigint;
