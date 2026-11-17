ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "net_base_revenue_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "calculated_piecework_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "fixed_salary_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "service_salary_price_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "bonuses_total_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "penalties_total_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "total_accrued_kopecks" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_payroll_statements" ADD COLUMN IF NOT EXISTS "ndfl_13_kopecks" bigint DEFAULT 0 NOT NULL;
