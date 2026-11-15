ALTER TABLE "periodontogram_snapshots" ADD COLUMN IF NOT EXISTS "visit_id" uuid REFERENCES "visits"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "periodontogram_snapshots_visit_idx" ON "periodontogram_snapshots" ("visit_id");
