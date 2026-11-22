-- Migration 0255: Fix appointments GIST exclusion constraints for overbooking and emergency bookings
-- Re-creates exclusion constraints with "is_overbooking" = false condition so overbooking and CITO slots do not trigger 23P01 exclusion_violation

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_assistant_overlap_excl";--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_assistant_overlap_excl" EXCLUDE USING gist (
  "assistant_user_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("assistant_user_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status) AND "is_overbooking" = false);--> statement-breakpoint

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_patient_overlap_excl";--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_overlap_excl" EXCLUDE USING gist (
  "patient_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("patient_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status) AND "is_overbooking" = false);--> statement-breakpoint

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_doctor_overlap_excl";--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_overlap_excl" EXCLUDE USING gist (
  "doctor_user_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("doctor_user_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status) AND "is_overbooking" = false);--> statement-breakpoint

ALTER TABLE "appointments" DROP CONSTRAINT IF EXISTS "appointments_chair_overlap_excl";--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_chair_overlap_excl" EXCLUDE USING gist (
  "chair_id" WITH =,
  tstzrange("starts_at", "ends_at") WITH &&
)
WHERE ("chair_id" IS NOT NULL AND "status" NOT IN ('cancelled'::appointment_status, 'no_show'::appointment_status) AND "is_overbooking" = false);
