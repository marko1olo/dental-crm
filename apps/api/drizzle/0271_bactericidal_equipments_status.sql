ALTER TABLE "bactericidal_equipments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active' NOT NULL;
