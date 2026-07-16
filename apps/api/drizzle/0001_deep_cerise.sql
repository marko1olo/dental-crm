ALTER TYPE "public"."ledger_payment_method" ADD VALUE 'family_wallet';--> statement-breakpoint
CREATE TABLE "dente_max_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"bot_id" text,
	"token_secret_ref" text,
	"webhook_url" text,
	"enabled_features_json" text DEFAULT '[]' NOT NULL,
	"staff_routing_json" text DEFAULT '{"defaultUserId":null,"rules":[]}' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_max_bot_configs_org_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "dente_whatsapp_bot_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"phone_number_id" text,
	"token_secret_ref" text,
	"webhook_verify_token" text,
	"enabled_features_json" text DEFAULT '[]' NOT NULL,
	"staff_routing_json" text DEFAULT '{"defaultUserId":null,"rules":[]}' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dente_whatsapp_bot_configs_org_unique" UNIQUE("organization_id")
);
--> statement-breakpoint
CREATE TABLE "doctor_payrolls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"visit_id" uuid,
	"amount_rub" numeric(12, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messenger_inbound_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"patient_id" uuid,
	"external_chat_id" text NOT NULL,
	"message_text" text,
	"event_kind" text NOT NULL,
	"raw_payload" jsonb,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "specialty" "dental_specialty" NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "service_category" "service_category" NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "commission_pct" real DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "material_cost_deduction_pct" real DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "effective_from" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "doctor_commissions" ADD COLUMN "effective_to" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "dente_max_bot_configs" ADD CONSTRAINT "dente_max_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dente_whatsapp_bot_configs" ADD CONSTRAINT "dente_whatsapp_bot_configs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_payrolls" ADD CONSTRAINT "doctor_payrolls_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_payrolls" ADD CONSTRAINT "doctor_payrolls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_payrolls" ADD CONSTRAINT "doctor_payrolls_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" ADD CONSTRAINT "messenger_inbound_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messenger_inbound_events" ADD CONSTRAINT "messenger_inbound_events_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_commissions" DROP COLUMN "specialization";--> statement-breakpoint
ALTER TABLE "doctor_commissions" DROP COLUMN "percentage";--> statement-breakpoint
ALTER TABLE "doctor_commissions" DROP COLUMN "fixed_rate";