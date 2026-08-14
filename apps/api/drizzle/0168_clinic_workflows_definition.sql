ALTER TABLE "clinic_workflows"
	ADD COLUMN "definition" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
ALTER TABLE "clinic_workflows" ALTER COLUMN "definition" DROP DEFAULT;
