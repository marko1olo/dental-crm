/**
 * sampleSummaryCalculator.ts — Расчет итоговой сводки и формулы для демо-выплат.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { formatKopecksRu, type Kopecks } from "@dental/shared";
import type { DoctorMyEarningsSummary } from "./types.js";

export interface SampleSummaryParams {
	isChairRental: boolean;
	chairRentalRub: number;
	chairRentalKop: number;
	sampleGrossKop: number;
	sampleLabKop: number;
	sampleMatKop: number;
	effectiveDoctorEarnedKop: number;
	netBaseKop: number;
	avgCommission: number;
	advanceRub: number;
	advanceKop: number;
	mainPayoutKop: number;
	isSelfEmployed: boolean;
	npdTaxKop: number;
	completedAppointmentsCount: number;
	inChairAppointmentsCount: number;
	totalAppointmentsCount: number;
	totalServicesCount: number;
	samplePaidRub: number;
	sampleUnpaidRub: number;
}

export function buildSampleSummaryAndFormula(p: SampleSummaryParams): {
	summary: DoctorMyEarningsSummary;
	formulaExplanationRu: string;
} {
	const formulaExplanationRu = p.isChairRental
		? `${formatKopecksRu(p.sampleGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(p.chairRentalKop as Kopecks)} (Аренда кресла) − ${formatKopecksRu(p.sampleLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(p.sampleMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(p.effectiveDoctorEarnedKop as Kopecks)} (Чистый доход соло-врача)`
		: `${formatKopecksRu(p.sampleGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(p.sampleLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(p.sampleMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(p.netBaseKop as Kopecks)} (Чистая база) × ${p.avgCommission}% = ${formatKopecksRu(p.effectiveDoctorEarnedKop as Kopecks)} к выплате`;

	const summary: DoctorMyEarningsSummary = {
		payoutModel: p.isChairRental ? "chair_rental" : "percentage",
		...(p.isChairRental ? { chairRentalRub: p.chairRentalRub, chairRentalKop: p.chairRentalKop } : {}),
		advanceRub: p.advanceRub,
		advanceKop: p.advanceKop,
		mainPayoutRub: p.mainPayoutKop / 100,
		mainPayoutKop: p.mainPayoutKop,
		...(p.isSelfEmployed ? { npdTaxRub: p.npdTaxKop / 100, npdTaxKop: p.npdTaxKop } : {}),
		totalGrossRevenueRub: p.sampleGrossKop / 100,
		totalGrossRevenueKop: p.sampleGrossKop,
		totalLabDeductionsRub: p.sampleLabKop / 100,
		totalLabDeductionsKop: p.sampleLabKop,
		totalMaterialDeductionsRub: p.sampleMatKop / 100,
		totalMaterialDeductionsKop: p.sampleMatKop,
		netBaseRevenueRub: p.netBaseKop / 100,
		netBaseRevenueKop: p.netBaseKop,
		totalDoctorEarnedRub: p.effectiveDoctorEarnedKop / 100,
		totalDoctorEarnedKop: p.effectiveDoctorEarnedKop,
		averageCommissionPercent: p.avgCommission,
		completedAppointmentsCount: p.completedAppointmentsCount,
		inChairAppointmentsCount: p.inChairAppointmentsCount,
		totalAppointmentsCount: p.totalAppointmentsCount,
		totalServicesCount: p.totalServicesCount,
		paidAmountRub: p.samplePaidRub,
		unpaidAmountRub: p.sampleUnpaidRub,
		paymentReconciliationStatus: p.sampleUnpaidRub === 0 ? "fully_reconciled" : "pending_cashier",
	};

	return { summary, formulaExplanationRu };
}
