ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "quality_control_status" text DEFAULT 'pending';
