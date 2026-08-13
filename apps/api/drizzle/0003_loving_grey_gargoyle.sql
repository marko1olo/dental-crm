ALTER TABLE "patient_invoices" ADD COLUMN "insurance_amount_rub" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "patient_invoices" ADD COLUMN "patient_amount_rub" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "insurance_contract_id" uuid;--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN "insurance_policy_number" text;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_insurance_contract_id_insurance_contracts_id_fk" FOREIGN KEY ("insurance_contract_id") REFERENCES "public"."insurance_contracts"("id") ON DELETE set null ON UPDATE no action;