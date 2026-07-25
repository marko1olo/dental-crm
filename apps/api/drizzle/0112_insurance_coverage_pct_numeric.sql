-- Convert insurance coverage percentage columns from real (binary float, lossy)
-- to numeric(5,2) (exact decimal) so reimbursement math is penny-exact at rest.
-- Range 0.00..100.00 fits precision 5 / scale 2. USING cast preserves existing data.
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_therapy_pct" SET DATA TYPE numeric(5, 2) USING "coverage_therapy_pct"::numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_therapy_pct" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_surgery_pct" SET DATA TYPE numeric(5, 2) USING "coverage_surgery_pct"::numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_surgery_pct" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_ortho_pct" SET DATA TYPE numeric(5, 2) USING "coverage_ortho_pct"::numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_ortho_pct" SET DEFAULT '0';--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_hygiene_pct" SET DATA TYPE numeric(5, 2) USING "coverage_hygiene_pct"::numeric(5, 2);--> statement-breakpoint
ALTER TABLE "insurance_contracts" ALTER COLUMN "coverage_hygiene_pct" SET DEFAULT '0';
