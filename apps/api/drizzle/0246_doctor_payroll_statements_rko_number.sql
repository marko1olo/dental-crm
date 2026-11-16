ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "rko_number" text;
--> statement-breakpoint
UPDATE "doctor_payroll_statements"
SET "rko_number" = 'РКО-' || upper(substr(id::text, 1, 8))
WHERE "rko_number" IS NULL;
