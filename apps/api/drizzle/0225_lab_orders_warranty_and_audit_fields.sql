-- 0225 — Добавление недостающих колонок в lab_orders
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "is_warranty" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "is_locked_installed" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "installed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "paid_from_cash_operation_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "lab_orders" ADD COLUMN IF NOT EXISTS "cancelled_at" timestamp with time zone;
