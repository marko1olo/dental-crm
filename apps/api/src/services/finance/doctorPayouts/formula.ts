/**
 * apps/api/src/services/finance/doctorPayouts/formula.ts
 *
 * Single Source of Truth (SSOT) re-exporting doctor payout formula directly from @dental/shared.
 */

export {
	computeDoctorPayout,
	materialsStateOf,
	payoutRowNote,
} from "@dental/shared";
