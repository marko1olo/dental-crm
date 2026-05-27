DO $$ BEGIN
  CREATE TYPE "public"."payment_method" AS ENUM('cash', 'card', 'bank_transfer', 'online', 'insurance', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."payment_status" AS ENUM('planned', 'paid', 'refunded', 'voided');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "document_id" uuid;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "status" "public"."payment_status" DEFAULT 'paid' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "note" text;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" TYPE "public"."payment_method" USING (
  CASE
    WHEN "method" IN ('cash', 'card', 'bank_transfer', 'online', 'insurance', 'other') THEN "method"::"public"."payment_method"
    ELSE 'other'::"public"."payment_method"
  END
);
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET DEFAULT 'card';
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "method" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_document_id_generated_documents_id_fk'
  ) THEN
    ALTER TABLE "payments"
      ADD CONSTRAINT "payments_document_id_generated_documents_id_fk"
      FOREIGN KEY ("document_id")
      REFERENCES "generated_documents" ("id");
  END IF;
END $$;
