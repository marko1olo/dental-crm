CREATE TYPE "public"."appointment_source" AS ENUM('admin', 'online');--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "source" "appointment_source" DEFAULT 'admin' NOT NULL;
