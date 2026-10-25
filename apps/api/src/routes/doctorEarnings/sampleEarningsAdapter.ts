/**
 * sampleEarningsAdapter.ts — Адаптер демонстрационных приемов врача (Showcase / Offline Demo).
 * Mandate 8e & Mandate 8b: строго <= 120 строк на файл.
 */

import { createSampleChairsideShiftAppointments } from "@dental/shared";
import {
	CATEGORY_NAMES_RU,
	type DoctorEarningsCategoryBreakdown,
	type DoctorMyEarningsResponse,
} from "./types.js";
import type { CategoryAccumulatorItem } from "./liveEarningsTypes.js";
import { adaptSampleAppointment } from "./adaptSampleAppointmentItem.js";
import { buildSampleSummaryAndFormula } from "./sampleSummaryCalculator.js";

export function buildSampleDoctorEarningsResponse(params: {
	targetDoctorId: string;
	doctorName: string;
	doctorSpecialty: string;
	fromDate: Date;
	toDate: Date;
	dateParam?: string | undefined;
	categoryRates: Record<string, number>;
	payoutModel?: "percentage" | "chair_rental" | undefined;
	chairRentalRub?: number | undefined;
	advanceRub?: number | undefined;
	taxRegime?: "employee" | "self_employed" | undefined;
}): DoctorMyEarningsResponse {
	const { targetDoctorId, doctorName, doctorSpecialty, fromDate, toDate, dateParam, categoryRates } = params;
	const sampleAppointments = createSampleChairsideShiftAppointments(targetDoctorId, doctorName, dateParam || fromDate.toISOString().split("T")[0]!);

	let sampleGrossKop = 0;
	let sampleLabKop = 0;
	let sampleMatKop = 0;
	let sampleEarnedKop = 0;
	let samplePaidRub = 0;
	let sampleUnpaidRub = 0;
	const sampleCategoryAgg: Record<string, CategoryAccumulatorItem> = {};

	const adaptedAppointments = sampleAppointments.map((apt, index) => {
		const res = adaptSampleAppointment(apt, index, categoryRates, sampleCategoryAgg);
		sampleGrossKop += res.grossRevenueKop;
		sampleLabKop += res.labCostKop;
		sampleMatKop += res.materialsCostKop;
		sampleEarnedKop += res.doctorEarnedKop;
		samplePaidRub += res.paidRub;
		sampleUnpaidRub += res.unpaidRub;
		return res;
	});

	const specialtyBreakdown: DoctorEarningsCategoryBreakdown[] = Object.entries(sampleCategoryAgg).map(([cat, data]) => ({
		category: cat,
		categoryRu: CATEGORY_NAMES_RU[cat] || cat,
		commissionPercent: categoryRates[cat] ?? 25,
		grossRevenueRub: data.gross,
		labDeductionsRub: data.lab,
		netBaseRub: Math.max(0, data.gross - data.lab),
		doctorEarnedRub: data.earned,
		servicesCount: data.count,
	}));

	const isChairRental = params.payoutModel === "chair_rental";
	const chairRentalRub = isChairRental ? Math.max(0, params.chairRentalRub ?? 0) : 0;
	const chairRentalKop = Math.round(chairRentalRub * 100);
	const netBaseKop = Math.max(0, sampleGrossKop - sampleLabKop - sampleMatKop - (isChairRental ? chairRentalKop : 0));
	const effectiveDoctorEarnedKop = isChairRental ? netBaseKop : sampleEarnedKop;
	const avgCommission = isChairRental ? 100 : (netBaseKop > 0 ? Math.round((effectiveDoctorEarnedKop * 100) / netBaseKop) : 25);

	const advanceRub = Math.max(0, params.advanceRub ?? 0);
	const advanceKop = Math.round(advanceRub * 100);
	const mainPayoutKop = Math.max(0, effectiveDoctorEarnedKop - advanceKop);
	const isSelfEmployed = isChairRental || params.taxRegime === "self_employed";
	const npdTaxKop = isSelfEmployed ? Math.round((effectiveDoctorEarnedKop * 6) / 100) : 0;

	const { summary, formulaExplanationRu } = buildSampleSummaryAndFormula({
		isChairRental,
		chairRentalRub,
		chairRentalKop,
		sampleGrossKop,
		sampleLabKop,
		sampleMatKop,
		effectiveDoctorEarnedKop,
		netBaseKop,
		avgCommission,
		advanceRub,
		advanceKop,
		mainPayoutKop,
		isSelfEmployed,
		npdTaxKop,
		completedAppointmentsCount: sampleAppointments.filter((a) => a.status === "completed").length,
		inChairAppointmentsCount: sampleAppointments.filter((a) => a.status === "in_chair").length,
		totalAppointmentsCount: sampleAppointments.length,
		totalServicesCount: sampleAppointments.reduce((acc, a) => acc + (a.services?.length || 0), 0),
		samplePaidRub,
		sampleUnpaidRub,
	});

	return {
		doctorId: targetDoctorId,
		doctorName,
		doctorSpecialty,
		period: {
			from: fromDate.toISOString(),
			to: toDate.toISOString(),
			...(dateParam !== undefined ? { date: dateParam } : {}),
		},
		summary,
		specialtyBreakdown,
		appointments: adaptedAppointments,
		formulaExplanationRu,
	};
}
