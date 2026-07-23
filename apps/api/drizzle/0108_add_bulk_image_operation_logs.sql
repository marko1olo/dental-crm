CREATE TABLE IF NOT EXISTS "bulk_image_operation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"patient_name" text NOT NULL,
	"selected_images_count" integer DEFAULT 1 NOT NULL,
	"assigned_tooth_number" integer,
	"operation_type" text DEFAULT 'batch_link' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
