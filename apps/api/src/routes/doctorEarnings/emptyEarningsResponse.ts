/**
 * emptyEarningsResponse.ts — Честный пустой ответ сдельной оплаты за период без приемов.
 * Mandate 8wy: в боевом контуре фейковые приемы запрещены — врач видит правдивый пустой период.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorMyEarningsResponse } from "./types.js";
import type { LiveCalculationInput } from "./liveEarningsTypes.js";

export function buildEmptyDoctorEarningsResponse(input: Pick<
	LiveCalculationInput,
	"targetDoctorId" | "doctorName" | "doctorSpecialty" | "fromDate" | "toDate" | "dateParam" | "payoutModel"
> & {
	chairRentalRub?: number | undefined;
	advanceRub?: number | undefined;
	taxRegime?: string | undefined;
}): DoctorMyEarningsResponse {
	const isChairRental = input.payoutModel === "chair_rental";
	const chairRentalRub = isChairRental ? Math.max(0, input.chairRentalRub ?? 0) : undefined;
	const chairRentalKop = chairRentalRub !== undefined ? Math.round(chairRentalRub * 100) : undefined;
	const advanceRub = Math.max(0, input.advanceRub ?? 0);
	const advanceKop = Math.round(advanceRub * 100);
	const isSelfEmployed = isChairRental || input.taxRegime === "self_employed";

	const formulaExplanationRu = isChairRental
		? "0 ₽ (Выручка) − 0 ₽ (Аренда кресла) − 0 ₽ (ЗТЛ) − 0 ₽ (Материалы) = 0 ₽ (Чистый доход соло-врача). В выбранном периоде нет выполненных приёмов."
		: "0 ₽ (Выручка) − 0 ₽ (ЗТЛ) − 0 ₽ (Материалы) = 0 ₽ (Чистая база) × 0% = 0 ₽ к выплате. В выбранном периоде нет выполненных приёмов.";

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
			...(chairRentalRub !== undefined ? { chairRentalRub, chairRentalKop } : {}),
			advanceRub,
			advanceKop,
			mainPayoutRub: 0,
			mainPayoutKop: 0,
			...(isSelfEmployed ? { npdTaxRub: 0, npdTaxKop: 0 } : {}),
			totalGrossRevenueRub: 0,
			totalGrossRevenueKop: 0,
			totalLabDeductionsRub: 0,
			totalLabDeductionsKop: 0,
			totalMaterialDeductionsRub: 0,
			totalMaterialDeductionsKop: 0,
			netBaseRevenueRub: 0,
			netBaseRevenueKop: 0,
			totalDoctorEarnedRub: 0,
			totalDoctorEarnedKop: 0,
			averageCommissionPercent: 0,
			completedAppointmentsCount: 0,
			inChairAppointmentsCount: 0,
			totalAppointmentsCount: 0,
			totalServicesCount: 0,
			paidAmountRub: 0,
			unpaidAmountRub: 0,
			paymentReconciliationStatus: "fully_reconciled",
		},
		specialtyBreakdown: [],
		appointments: [],
		formulaExplanationRu,
	};
}
