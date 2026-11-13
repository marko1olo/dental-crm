ALTER TABLE "chairs" ADD COLUMN IF NOT EXISTS "room" text;--> statement-breakpoint
ALTER TABLE "chairs" ADD COLUMN IF NOT EXISTS "color" text;--> statement-breakpoint
ALTER TABLE "chairs" ADD COLUMN IF NOT EXISTS "default_doctor_id" text;
