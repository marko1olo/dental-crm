/**
 * packages/shared/src/finance/payrollModules/doctorRentalAndBonusEngine.ts
 * Computes chair rental splits, KPI tiers, and minimum guarantee rules.
 * Mandate 8b: <= 120 lines.
 */

import { KPI_BONUS_TIERS } from "./payrollRules.js";

export interface DoctorChairRentalResult {
	readonly chairRentalKop: number;
	readonly totalNetBase: number;
}

export function computeChairRental(
	rawNetBase: number,
	isChairRental: boolean,
	chairRentalMode: "fixed" | "split_70_30",
	splitDoctorPercent?: number,
	fixedRentalKop?: number,
): DoctorChairRentalResult {
	if (!isChairRental) {
		return { chairRentalKop: 0, totalNetBase: rawNetBase };
	}

	let chairRentalKop = 0;
	if (chairRentalMode === "split_70_30") {
		const doctorSplit = Math.max(0, Math.min(100, splitDoctorPercent ?? 70));
		const clinicSplit = 100 - doctorSplit;
		chairRentalKop = Math.round((rawNetBase * clinicSplit) / 100);
	} else {
		chairRentalKop = Math.max(0, fixedRentalKop ?? 0);
	}

	const totalNetBase = Math.max(0, rawNetBase - chairRentalKop);
	return { chairRentalKop, totalNetBase };
}

export interface KpiBonusResult {
	readonly kpiPercent: number;
	readonly kpiBadge: string;
	readonly kpiBonusEarned: number;
}

export function computeKpiBonus(
	totalGross: number,
	totalNetBase: number,
	isChairRental: boolean,
	chairRentalMode: "fixed" | "split_70_30",
): KpiBonusResult {
	let kpiPercent = 0;
	let kpiBadge = isChairRental
		? (chairRentalMode === "split_70_30" ? "Аренда кресла (Сплит 70/30)" : "Аренда кресла (Фикс за смену)")
		: "Базовая ставка";

	if (!isChairRental) {
		for (const tier of KPI_BONUS_TIERS) {
			if (totalGross >= tier.minRevenueKop) {
				kpiPercent = tier.bonusPercentage;
				kpiBadge = tier.badgeLabelRu;
				break;
			}
		}
	}

	const kpiBonusEarned = isChairRental ? 0 : Math.round((totalNetBase * kpiPercent) / 100);
	return { kpiPercent, kpiBadge, kpiBonusEarned };
}

export interface GuaranteeResult {
	readonly grossPayout: number;
	readonly guaranteeApplied: boolean;
}

export function applyMinimumGuarantee(
	preGuaranteePayout: number,
	minGuaranteeMonthlyKop: number,
	isChairRental: boolean,
	servicesCount: number,
): GuaranteeResult {
	let payout = preGuaranteePayout;
	if (!Number.isFinite(payout)) {
		payout = 0;
	}

	let guaranteeApplied = false;
	if (!isChairRental && payout < minGuaranteeMonthlyKop && servicesCount > 0) {
		payout = minGuaranteeMonthlyKop;
		guaranteeApplied = true;
	}

	return {
		grossPayout: Math.max(0, payout),
		guaranteeApplied,
	};
}
