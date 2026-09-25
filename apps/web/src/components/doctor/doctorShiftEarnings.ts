/**
 * UNIFIED DOCTOR FACADE — Chairside Shift Earnings Engine (Mandate 8s)
 * Canonical logic lives in @dental/shared/finance/doctorShiftEarnings.ts
 */

export {
	type ChairsidePatientEarningsItem,
	type ChairsideShiftEarningsSummary,
	type CalculateChairsideShiftEarningsInput,
	calculateChairsideShiftEarnings,
	createSampleChairsideShiftAppointments,
} from "@dental/shared";
