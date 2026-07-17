import { PGlite } from "@electric-sql/pglite";
import * as path from "path";

async function run() {
    const dbPath = path.resolve(process.cwd(), "dente-db");
    const db = new PGlite(dbPath);
    await db.waitReady;
    try {
        await db.exec(`
CREATE TABLE IF NOT EXISTS "service_consumables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_catalog_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL REFERENCES "inventory_items"("id"),
	"quantity_required" numeric NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "task_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid REFERENCES "patients"("id"),
	"assigned_to_id" uuid NOT NULL REFERENCES "users"("id"),
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "patient_reclamations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id"),
	"doctor_id" uuid NOT NULL REFERENCES "users"("id"),
	"complication_details" text NOT NULL,
	"proposed_action" text,
	"status" text DEFAULT 'under_review' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);

CREATE TABLE IF NOT EXISTS "bank_installment_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id"),
	"bank_name" text NOT NULL,
	"agreement_number" text NOT NULL UNIQUE,
	"loan_amount" numeric NOT NULL,
	"downpayment_amount" numeric DEFAULT '0.0' NOT NULL,
	"interest_rate" numeric DEFAULT '0.0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "syncable_report_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"query_sql" text NOT NULL,
	"is_favorited" boolean DEFAULT false NOT NULL,
	"is_sync_active" boolean DEFAULT false NOT NULL,
	"sync_interval" integer DEFAULT 1440,
	"external_webhook_url" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "employee_mobile_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL REFERENCES "users"("id"),
	"token_value" text NOT NULL UNIQUE,
	"device_model" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp
);
        `);
        console.log('Created all tables successfully.');
    } catch(e) { console.error("Error creating tables:", e); }
    
    // Also recreate the dropped constraint so Drizzle is happy later
    try {
        await db.exec(`ALTER TABLE "visits" ADD CONSTRAINT "visits_id_patient_organization_unique" UNIQUE("id","patient_id","organization_id");`);
        await db.exec(`ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_visit_patient_organization_fk" FOREIGN KEY ("visit_id","patient_id","organization_id") REFERENCES "visits"("id","patient_id","organization_id") ON DELETE no action ON UPDATE no action;`);
        console.log("Restored constraints");
    } catch(e) { console.error("Could not restore constraints:", e.message); }

    console.log("Done");
}
run();
