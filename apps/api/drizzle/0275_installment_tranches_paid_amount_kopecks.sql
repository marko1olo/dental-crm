ALTER TABLE "installment_tranches" ADD COLUMN IF NOT EXISTS "paid_amount_kopecks" bigint DEFAULT 0;
