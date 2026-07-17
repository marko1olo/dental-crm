ALTER TABLE "organizations" ADD COLUMN "has_orthodontics" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "has_tasks" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "has_reclamations" boolean DEFAULT true NOT NULL;
