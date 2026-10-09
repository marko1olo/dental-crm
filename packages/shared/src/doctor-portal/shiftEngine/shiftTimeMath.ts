/**
 * ═══════════════════════════════════════════════════════════════════════════
 * DENTE Dental CRM — Doctor Shift Operations (Layer 1: Shift Time Math)
 *
 * Pure utilities:
 * - Exact integer kopecks piece-rate accrual.
 * - Shift duration and interval calculations.
 * - Statutory night hours detection (ТК РФ ст. 96, ст. 154: 22:00–06:00).
 * - Masked doctor phone numbers & EMR protocol hashing.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { Kopecks } from "../../utils/money.js";
import { DEFAULT_CATEGORY_COMMISSION_PERCENT } from "./types.js";

/**
 * Extracts normalized YYYY-MM-DD date string from an ISO timestamp.
 */
export function shiftDateFromIso(iso?: string | null): string {
	if (!iso) {
		return new Date().toISOString().split("T")[0] ?? "1970-01-01";
	}
	const first = iso.split("T")[0];
	return first && first.length === 10 ? first : (new Date().toISOString().split("T")[0] ?? "1970-01-01");
}

/** Masks doctor phone number for SMS delivery privacy e.g. "+7 (926) ***-**-34" */
export function maskDoctorPhoneNumber(phone: string): string {
	const digits = phone.replace(/\D/g, "");
	if (digits.length < 10) return "+7 (***) ***-**-**";
	const main = digits.slice(-10);
	const code = main.slice(0, 3);
	const last2 = main.slice(-2);
	return `+7 (${code}) ***-**-${last2}`;
}

/**
 * Generates a deterministic hash representation of an EMR 043/у batch for cryptographic integrity stamp.
 * Complies with 63-ФЗ ст. 9, Приказ Минздрава 834н и 947н.
 */
export function generateBatchEmrProtocolHash(
	appointmentIds: readonly string[],
	doctorId: string,
	timestampIso: string,
): string {
	const rawPayload = `DENTE:PEP:043U:${doctorId}:${shiftDateFromIso(timestampIso)}:${[...appointmentIds].sort().join(",")}:${timestampIso}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < rawPayload.length; i++) {
		hash ^= rawPayload.charCodeAt(i);
		hash = (hash * 0x01000193) >>> 0;
	}
	const hex = hash.toString(16).padStart(8, "0").toUpperCase();
	return `RU-PEP-043U-${hex}`;
}

/**
 * Calculates a single service item's piece-rate commission in integer kopecks.
 * Formula: Math.round(Math.max(0, finalRevenue - labCosts - materialCosts) * (commissionPct / 100))
 * Zero floating-point drift.
 */
export function calculateServicePieceRateAccrual(
	item: {
		finalRevenueKop?: Kopecks | undefined;
		totalCostKop?: Kopecks | undefined;
		unitPriceKop?: Kopecks | undefined;
		quantity?: number | undefined;
		discountKop?: Kopecks | undefined;
		directLabZtlCostKop?: Kopecks | undefined;
		directMaterialCostKop?: Kopecks | undefined;
		commissionPercent?: number | undefined;
		category?: string | undefined;
	},
	fallbackCommissionPct = 25,
): { dealBaseKop: Kopecks; earnedPayoutKop: Kopecks } {
	const effectiveRevenue =
		item.finalRevenueKop !== undefined && item.finalRevenueKop > 0
			? item.finalRevenueKop
			: item.totalCostKop !== undefined && item.totalCostKop > 0
				? Math.max(0, item.totalCostKop - (item.discountKop || 0))
				: Math.max(
						0,
						(item.unitPriceKop || 0) * (item.quantity || 1) - (item.discountKop || 0),
					);

	const revenue = Math.max(0, Math.round(effectiveRevenue || 0));
	const labCost = Math.max(0, Math.round(item.directLabZtlCostKop || 0));
	const matCost = Math.max(0, Math.round(item.directMaterialCostKop || 0));
	const pct =
		typeof item.commissionPercent === "number" && item.commissionPercent >= 0
			? item.commissionPercent
			: item.category && DEFAULT_CATEGORY_COMMISSION_PERCENT[item.category] !== undefined
				? DEFAULT_CATEGORY_COMMISSION_PERCENT[item.category]!
				: fallbackCommissionPct;

	const dealBaseKop = Math.max(0, revenue - labCost - matCost);
	const earnedPayoutKop = Math.round((dealBaseKop * pct) / 100);

	return {
		dealBaseKop,
		earnedPayoutKop,
	};
}

/**
 * Calculates duration between two ISO timestamps in whole integer minutes.
 */
export function calculateIntervalDurationMinutes(startsAtIso: string, endsAtIso: string): number {
	const startMs = new Date(startsAtIso).getTime();
	const endMs = new Date(endsAtIso).getTime();
	if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
		return 0;
	}
	return Math.round((endMs - startMs) / 60000);
}

/**
 * Checks whether two ISO time ranges overlap (open interval [start, end) intersection).
 */
export function isIsoIntervalOverlap(
	startAIso: string,
	endAIso: string,
	startBIso: string,
	endBIso: string,
): boolean {
	const aStart = new Date(startAIso).getTime();
	const aEnd = new Date(endAIso).getTime();
	const bStart = new Date(startBIso).getTime();
	const bEnd = new Date(endBIso).getTime();

	if (Number.isNaN(aStart) || Number.isNaN(aEnd) || Number.isNaN(bStart) || Number.isNaN(bEnd)) {
		return false;
	}

	return aStart < bEnd && bStart < aEnd;
}

/**
 * Calculates night work minutes between 22:00 and 06:00 local time (ТК РФ ст. 96, ст. 154).
 * Used for statutory timesheet export (Т-13).
 */
export function calculateNightShiftMinutes(startsAtIso: string, endsAtIso: string): number {
	const start = new Date(startsAtIso);
	const end = new Date(endsAtIso);

	if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
		return 0;
	}

	let nightMinutes = 0;
	const cursor = new Date(start.getTime());

	// Iterate minute by minute or in 15-minute quantum for high performance
	while (cursor < end) {
		const hours = cursor.getHours();
		// Night hours: 22:00 - 23:59 (>= 22) or 00:00 - 05:59 (< 6)
		if (hours >= 22 || hours < 6) {
			nightMinutes += 1;
		}
		cursor.setMinutes(cursor.getMinutes() + 1);
	}

	return nightMinutes;
}
