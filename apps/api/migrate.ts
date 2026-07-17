import { PGlite } from "@electric-sql/pglite";

async function run() {
	console.log("Migrating...");
	const client = new PGlite("./dente-db");
	
    try {
        await client.query(`ALTER TABLE "clinics" ADD COLUMN "marketing_settings" jsonb;`);
    } catch(e) { console.log(e.message) }

    try {
        await client.query(`ALTER TABLE "clinics" ADD COLUMN "reporting_settings" jsonb;`);
    } catch(e) { console.log(e.message) }

    try {
        await client.query(`CREATE TABLE IF NOT EXISTS "clinic_workflows" (
            "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
            "organization_id" uuid NOT NULL,
            "name" text NOT NULL,
            "trigger" text NOT NULL,
            "active" boolean DEFAULT false NOT NULL,
            "created_at" timestamp with time zone DEFAULT now() NOT NULL,
            "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        );`);
    } catch(e) { console.log(e.message) }

    try {
        await client.query(`DO $$ BEGIN
        ALTER TABLE "clinic_workflows" ADD CONSTRAINT "clinic_workflows_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;
        EXCEPTION
        WHEN duplicate_object THEN null;
        END $$;`);
    } catch(e) { console.log(e.message) }

	console.log("Migration applied.");
	process.exit(0);
}

run().catch(e => {
	console.error(e);
	process.exit(1);
});
