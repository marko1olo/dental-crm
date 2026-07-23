CREATE TABLE IF NOT EXISTS "digital_receipt_dispatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"dispatch_channel" text DEFAULT 'email' NOT NULL,
	"target_destination" text NOT NULL,
	"fiscal_receipt_number" text NOT NULL,
	"receipt_amount_rub" numeric(12, 2) NOT NULL,
	"paper_print_skipped" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
