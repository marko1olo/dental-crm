ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "is_installment" boolean DEFAULT false;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "installment_months" integer;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "down_payment_kopecks" bigint;
ALTER TABLE "treatment_plans" ADD COLUMN IF NOT EXISTS "monthly_payment_kopecks" bigint;
