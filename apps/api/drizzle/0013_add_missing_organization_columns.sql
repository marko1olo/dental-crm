ALTER TABLE "organizations" ADD COLUMN "ai_enable_treatment_plan" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ai_enable_recommendations" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "ai_enable_documents" boolean DEFAULT true NOT NULL;
