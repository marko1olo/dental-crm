ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "assistant_user_id" uuid REFERENCES "users"("id");
