-- Migration 0042: lab_orders sterilization hardening
-- Adds:
--   1. packaging_type + expires_at + indicator_type + cycle_mode to sterilization_logs
--   2. lab_orders status check constraint (prevent arbitrary text)
--   3. lab_orders state transition audit timestamp (sent_at, completed_at)
-- All new columns are nullable so existing rows survive the migration without backfill.

--> statement-breakpoint
ALTER TABLE "sterilization_logs"
    ADD COLUMN "packaging_type"  text,
    ADD COLUMN "expires_at"      timestamp with time zone,
    ADD COLUMN "indicator_type"  text,
    ADD COLUMN "cycle_mode"      text,
    ADD COLUMN "temperature_set" numeric(5,1),
    ADD COLUMN "pressure_set"    numeric(4,2),
    ADD COLUMN "duration_min"    integer;
--> statement-breakpoint

-- lab_orders: add audit timestamps + restrict status to known values
ALTER TABLE "lab_orders"
    ADD COLUMN "sent_at"      timestamp with time zone,
    ADD COLUMN "completed_at" timestamp with time zone,
    ADD COLUMN "cancelled_at" timestamp with time zone;
--> statement-breakpoint

-- Prevent arbitrary status values from being persisted.
-- Existing values 'draft','sent','in_progress','shipped','received','refitting','completed'
-- all exist in the enum. 'cancelled' is new from this migration.
ALTER TABLE "lab_orders"
    ADD CONSTRAINT "lab_orders_status_check"
        CHECK (status IN (
            'draft','sent','in_progress','shipped','received',
            'refitting','completed','cancelled'
        ));
--> statement-breakpoint

-- Sterilization logs: add check on packaging_type and indicator_type
ALTER TABLE "sterilization_logs"
    ADD CONSTRAINT "sterilization_packaging_type_check"
        CHECK (packaging_type IS NULL OR packaging_type IN (
            'kraft_heat_sealed',
            'kraft_self_adhesive',
            'laminated_heat_sealed',
            'metal_cassette',
            'other'
        ));
--> statement-breakpoint

ALTER TABLE "sterilization_logs"
    ADD CONSTRAINT "sterilization_indicator_type_check"
        CHECK (indicator_type IS NULL OR indicator_type IN (
            'class4_multivariable',
            'class5_integrating',
            'class6_emulating',
            'biological',
            'bowie_dick'
        ));
--> statement-breakpoint

ALTER TABLE "sterilization_logs"
    ADD CONSTRAINT "sterilization_cycle_mode_check"
        CHECK (cycle_mode IS NULL OR cycle_mode IN (
            'B','S','N',
            'dry_heat_180','dry_heat_160',
            'plasma_vh2o2','ethylene_oxide'
        ));
