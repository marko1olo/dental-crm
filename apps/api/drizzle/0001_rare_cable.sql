ALTER TABLE "import_batches" ADD COLUMN "total_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "imported_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "skipped_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "warning_rows" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "blocked_rows" integer DEFAULT 0 NOT NULL;