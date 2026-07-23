CREATE TABLE IF NOT EXISTS "pricelist_doctor_payrolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
	"service_code" text NOT NULL,
	"service_name" text NOT NULL,
	"price_rub" numeric(10, 2) NOT NULL,
	"doctor_payroll_percent" numeric(4, 2) DEFAULT '25.00' NOT NULL,
	"doctor_payroll_rub" numeric(10, 2) NOT NULL,
	"clinic_margin_rub" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
