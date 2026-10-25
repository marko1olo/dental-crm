/**
 * liveEarningsCalculator.ts — Честный расчет сдельной оплаты труда врача по боевым данным БД.
 * Mandate 8e & Mandate 8b: строго <= 120 строк на файл.
 */

import { formatKopecksRu, type Kopecks } from "@dental/shared";
import {
	CATEGORY_NAMES_RU,
	type DoctorEarningsCategoryBreakdown,
	type DoctorMyEarningsResponse,
} from "./types.js";
import type { LiveCalculationInput, CategoryAccumulatorItem } from "./liveEarningsTypes.js";
import { processLiveAppointment } from "./calculateLiveAppointmentItem.js";

export type { LiveCalculationInput } from "./liveEarningsTypes.js";

export function calculateLiveDoctorEarnings(input: LiveCalculationInput): DoctorMyEarningsResponse {
	let totalGrossKop = 0;
	let totalLabKop = 0;
	let totalMatKop = 0;
	let totalEarnedKop = 0;
	let totalPaidRub = 0;
	let totalUnpaidRub = 0;
	const categoryAgg: Record<string, CategoryAccumulatorItem> = {};

	const appointmentsResult = input.rawAppointments.map((apt) => {
		const res = processLiveAppointment(apt, input, categoryAgg);
		totalGrossKop += res.grossRevenueKop;
		totalLabKop += res.labCostKop;
		totalMatKop += res.materialsCostKop;
		totalEarnedKop += res.doctorEarnedKop;
		totalPaidRub += res.paidRub;
		totalUnpaidRub += res.unpaidRub;
		return res;
	});

	const specialtyBreakdown: DoctorEarningsCategoryBreakdown[] = Object.entries(categoryAgg).map(
		([cat, data]) => ({
			category: cat,
			categoryRu: CATEGORY_NAMES_RU[cat] || cat,
			commissionPercent: input.categoryRates[cat] ?? 25,
			grossRevenueRub: data.gross,
			labDeductionsRub: data.lab,
			netBaseRub: Math.max(0, data.gross - data.lab),
			doctorEarnedRub: data.earned,
			servicesCount: data.count,
		}),
	);

	const isChairRental = input.payoutModel === "chair_rental";
	const chairRentalRub = isChairRental ? Math.max(0, input.chairRentalRub ?? 0) : 0;
	const chairRentalKop = Math.round(chairRentalRub * 100);

	let effectiveDoctorEarnedKop = totalEarnedKop;
	let totalNetBaseKop = Math.max(0, totalGrossKop - totalLabKop - totalMatKop);

	if (isChairRental) {
		totalNetBaseKop = Math.max(0, totalGrossKop - totalLabKop - totalMatKop - chairRentalKop);
		effectiveDoctorEarnedKop = totalNetBaseKop;
	}

	const avgCommission = isChairRental
		? 100
		: (totalNetBaseKop > 0 ? Math.round((effectiveDoctorEarnedKop * 100) / totalNetBaseKop) : 25);

	const advanceRub = Math.max(0, input.advanceRub ?? 0);
	const advanceKop = Math.round(advanceRub * 100);
	const mainPayoutKop = Math.max(0, effectiveDoctorEarnedKop - advanceKop);
	const isSelfEmployed = isChairRental || input.taxRegime === "self_employed";
	const npdTaxKop = isSelfEmployed ? Math.round((effectiveDoctorEarnedKop * 6) / 100) : 0;

	const formulaExplanationRu = isChairRental
		? `${formatKopecksRu(totalGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(chairRentalKop as Kopecks)} (Аренда кресла) − ${formatKopecksRu(totalLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(totalMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(effectiveDoctorEarnedKop as Kopecks)} (Чистый доход соло-врача)`
		: `${formatKopecksRu(totalGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(totalLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(totalMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(totalNetBaseKop as Kopecks)} (Чистая база) × ${avgCommission}% = ${formatKopecksRu(effectiveDoctorEarnedKop as Kopecks)} к выплате`;

	return {
		doctorId: input.targetDoctorId,
		doctorName: input.doctorName,
		doctorSpecialty: input.doctorSpecialty,
		period: {
			from: input.fromDate.toISOString(),
			to: input.toDate.toISOString(),
			...(input.dateParam !== undefined ? { date: input.dateParam } : {}),
		},
		summary: {
			payoutModel: isChairRental ? "chair_rental" : "percentage",
			...(isChairRental ? { chairRentalRub, chairRentalKop } : {}),
			advanceRub,
			advanceKop,
			mainPayoutRub: mainPayoutKop / 100,
			mainPayoutKop,
			...(isSelfEmployed ? { npdTaxRub: npdTaxKop / 100, npdTaxKop } : {}),
			totalGrossRevenueRub: totalGrossKop / 100,
			totalGrossRevenueKop: totalGrossKop,
			totalLabDeductionsRub: totalLabKop / 100,
			totalLabDeductionsKop: totalLabKop,
			totalMaterialDeductionsRub: totalMatKop / 100,
			totalMaterialDeductionsKop: totalMatKop,
			netBaseRevenueRub: totalNetBaseKop / 100,
			netBaseRevenueKop: totalNetBaseKop,
			totalDoctorEarnedRub: effectiveDoctorEarnedKop / 100,
			totalDoctorEarnedKop: effectiveDoctorEarnedKop,
			averageCommissionPercent: avgCommission,
			completedAppointmentsCount: input.rawAppointments.filter((a) => a.status === "completed").length,
			inChairAppointmentsCount: input.rawAppointments.filter((a) => a.status === "in_chair").length,
			totalAppointmentsCount: input.rawAppointments.length,
			totalServicesCount: appointmentsResult.reduce((acc, a) => acc + a.services.length, 0),
			paidAmountRub: totalPaidRub,
			unpaidAmountRub: totalUnpaidRub,
			paymentReconciliationStatus: totalUnpaidRub === 0 ? "fully_reconciled" : "pending_cashier",
		},
		specialtyBreakdown,
		appointments: appointmentsResult,
		formulaExplanationRu,
	};
}
