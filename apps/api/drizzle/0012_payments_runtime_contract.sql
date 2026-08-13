ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "document_id" uuid REFERENCES "generated_documents"("id");
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_method" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "payment_status" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now();