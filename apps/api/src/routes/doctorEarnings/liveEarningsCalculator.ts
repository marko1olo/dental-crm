/**
 * liveEarningsCalculator.ts — Честный расчет сдельной оплаты труда врача по боевым данным БД.
 *
 * Сквозная цепочка Mandate 8e:
 * Выручка по прайсу (копейки) -> Вычет ЗТЛ лаборатории -> Вычет себестоимости материалов ->
 * Чистая база сделки -> Комиссионный процент врача -> Начисление к выплате.
 */

import {
	formatKopecksRu,
	resolveProcedureDeductionItems,
	type Kopecks,
} from "@dental/shared";
import {
	CATEGORY_NAMES_RU,
	LAB_STATUS_RU,
	type DoctorEarningsAppointmentItem,
	type DoctorEarningsCategoryBreakdown,
	type DoctorEarningsLabOrderItem,
	type DoctorEarningsServiceItem,
	type DoctorMyEarningsResponse,
} from "./types.js";

export interface LiveCalculationInput {
	readonly targetDoctorId: string;
	readonly doctorName: string;
	readonly doctorSpecialty: string;
	readonly fromDate: Date;
	readonly toDate: Date;
	readonly dateParam?: string | undefined;
	readonly categoryRates: Record<string, number>;
	readonly payoutModel?: "percentage" | "chair_rental" | undefined;
	readonly chairRentalRub?: number | undefined;
	readonly advanceRub?: number | undefined;
	readonly taxRegime?: "employee" | "self_employed" | undefined;
	readonly rawAppointments: ReadonlyArray<{
		id: string;
		patientId: string | null;
		status: string;
		startsAt: Date;
		endsAt: Date;
		patientName: string | null;
		cardNumber: string;
	}>;
	readonly appointmentToVisitMap: Map<string, string>;
	readonly dbTreatmentItems: ReadonlyArray<{
		id: string;
		visitId: string | null;
		title: string;
		priceRub: unknown;
		quantity: unknown;
		category: string | null;
		serviceCode?: string | null | undefined;
	}>;
	readonly dbLabOrders: ReadonlyArray<{
		id: string;
		patientId: string | null;
		toothFdi: string | null;
		material: string | null;
		status: string;
		priceRub: unknown;
		dueDate: Date | null;
	}>;
	readonly dbPayments: ReadonlyArray<{
		visitId: string | null;
		amountRub: unknown;
		status: string;
	}>;
}

export function calculateLiveDoctorEarnings(
	input: LiveCalculationInput,
): DoctorMyEarningsResponse {
	const {
		targetDoctorId,
		doctorName,
		doctorSpecialty,
		fromDate,
		toDate,
		dateParam,
		categoryRates,
		rawAppointments,
		appointmentToVisitMap,
		dbTreatmentItems,
		dbLabOrders,
		dbPayments,
	} = input;

	let totalGrossKop = 0;
	let totalLabKop = 0;
	let totalMatKop = 0;
	let totalEarnedKop = 0;
	let totalPaidRub = 0;
	let totalUnpaidRub = 0;

	const categoryAgg: Record<
		string,
		{ gross: number; lab: number; earned: number; count: number }
	> = {};

	const appointmentsResult: DoctorEarningsAppointmentItem[] = [];

	for (const apt of rawAppointments) {
		const visitId = appointmentToVisitMap.get(apt.id) || null;
		const aptTreatments = visitId
			? dbTreatmentItems.filter((t) => t.visitId === visitId)
			: [];

		const aptLabOrdersList = dbLabOrders.filter(
			(lo) => lo.patientId === apt.patientId,
		);

		const aptPayments = visitId
			? dbPayments.filter((p) => p.visitId === visitId)
			: [];
		const aptPaidAmount = aptPayments.reduce(
			(sum, p) => sum + (parseFloat(String(p.amountRub)) || 0),
			0,
		);

		let aptGrossKop = 0;
		let aptLabKop = 0;
		let aptMatKop = 0;
		let aptEarnedKop = 0;

		const aptLabItems: DoctorEarningsLabOrderItem[] = aptLabOrdersList.map(
			(lo) => {
				const loCostRub = parseFloat(String(lo.priceRub)) || 0;
				const loCostKop = Math.round(loCostRub * 100);
				aptLabKop += loCostKop;

				return {
					id: lo.id,
					toothFdi: lo.toothFdi,
					material: lo.material,
					status: lo.status,
					statusRu: LAB_STATUS_RU[lo.status] || lo.status,
					costRub: loCostRub,
					costKop: loCostKop,
					dueDate: lo.dueDate ? lo.dueDate.toISOString() : null,
				};
			},
		);

		const aptServices: DoctorEarningsServiceItem[] = aptTreatments.map(
			(t, idx) => {
				const priceRub = parseFloat(String(t.priceRub)) || 0;
				const priceKop = Math.round(priceRub * 100);
				const category = t.category || "therapy";
				const catRate = categoryRates[category] ?? 25;

				// Честный расчет себестоимости материалов по техкарте рецептов (materialsAutoDeductionSsot)
				let srvMatKop = 0;
				if (t.serviceCode) {
					const recipeItems = resolveProcedureDeductionItems(t.serviceCode);
					srvMatKop = recipeItems.reduce(
						(acc, item) => acc + item.estimatedUnitCostKopecks,
						0,
					);
				}

				const srvLabKop =
					category === "orthopedics" && aptLabKop > 0 ? aptLabKop : 0;
				const dealBase = Math.max(0, priceKop - srvLabKop - srvMatKop);
				const earnedKop = Math.round((dealBase * catRate) / 100);

				aptGrossKop += priceKop;
				aptMatKop += srvMatKop;
				aptEarnedKop += earnedKop;

				if (!categoryAgg[category]) {
					categoryAgg[category] = { gross: 0, lab: 0, earned: 0, count: 0 };
				}
				categoryAgg[category]!.gross += priceRub;
				categoryAgg[category]!.lab += srvLabKop / 100;
				categoryAgg[category]!.earned += earnedKop / 100;
				categoryAgg[category]!.count += 1;

				return {
					id: t.id || `srv-${apt.id}-${idx}`,
					nameRu: t.title,
					category,
					categoryRu: CATEGORY_NAMES_RU[category] || category,
					priceRub,
					priceKop,
					labCostRub: srvLabKop / 100,
					labCostKop: srvLabKop,
					materialCostRub: srvMatKop / 100,
					materialCostKop: srvMatKop,
					commissionPercent: catRate,
					earnedRub: earnedKop / 100,
					earnedKop,
					isPaid: aptPaidAmount >= priceRub,
				};
			},
		);

		const aptNetBaseKop = Math.max(0, aptGrossKop - aptLabKop - aptMatKop);
		totalGrossKop += aptGrossKop;
		totalLabKop += aptLabKop;
		totalMatKop += aptMatKop;
		totalEarnedKop += aptEarnedKop;

		const aptGrossRub = aptGrossKop / 100;
		let paymentStatus: "paid" | "partial" | "unpaid" = "unpaid";
		if (aptPaidAmount >= aptGrossRub && aptGrossRub > 0) {
			paymentStatus = "paid";
			totalPaidRub += aptGrossRub;
		} else if (aptPaidAmount > 0) {
			paymentStatus = "partial";
			totalPaidRub += aptPaidAmount;
			totalUnpaidRub += Math.max(0, aptGrossRub - aptPaidAmount);
		} else {
			paymentStatus = "unpaid";
			totalUnpaidRub += aptGrossRub;
		}

		appointmentsResult.push({
			appointmentId: apt.id,
			visitId,
			patientId: apt.patientId || "pat-unknown",
			patientFullName: apt.patientName || "Пациент клиники",
			cardNumber: apt.cardNumber,
			startsAtIso: apt.startsAt.toISOString(),
			endsAtIso: apt.endsAt.toISOString(),
			status: apt.status,
			paymentStatus,
			grossRevenueRub: aptGrossRub,
			grossRevenueKop: aptGrossKop,
			labCostRub: aptLabKop / 100,
			labCostKop: aptLabKop,
			materialsCostRub: aptMatKop / 100,
			materialsCostKop: aptMatKop,
			netBaseRub: aptNetBaseKop / 100,
			netBaseKop: aptNetBaseKop,
			doctorEarnedRub: aptEarnedKop / 100,
			doctorEarnedKop: aptEarnedKop,
			services: aptServices,
			labOrders: aptLabItems,
		});
	}

	const specialtyBreakdown: DoctorEarningsCategoryBreakdown[] = Object.entries(
		categoryAgg,
	).map(([cat, data]) => ({
		category: cat,
		categoryRu: CATEGORY_NAMES_RU[cat] || cat,
		commissionPercent: categoryRates[cat] ?? 25,
		grossRevenueRub: data.gross,
		labDeductionsRub: data.lab,
		netBaseRub: Math.max(0, data.gross - data.lab),
		doctorEarnedRub: data.earned,
		servicesCount: data.count,
	}));

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
		: (totalNetBaseKop > 0
			? Math.round((effectiveDoctorEarnedKop * 100) / totalNetBaseKop)
			: 25);

	const advanceRub = Math.max(0, input.advanceRub ?? 0);
	const advanceKop = Math.round(advanceRub * 100);
	const mainPayoutKop = Math.max(0, effectiveDoctorEarnedKop - advanceKop);
	const mainPayoutRub = mainPayoutKop / 100;
	const isSelfEmployed = isChairRental || input.taxRegime === "self_employed";
	const npdTaxKop = isSelfEmployed ? Math.round((effectiveDoctorEarnedKop * 6) / 100) : 0;
	const npdTaxRub = npdTaxKop / 100;

	const formulaExplanationRu = isChairRental
		? `${formatKopecksRu(totalGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(chairRentalKop as Kopecks)} (Аренда кресла) − ${formatKopecksRu(totalLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(totalMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(effectiveDoctorEarnedKop as Kopecks)} (Чистый доход соло-врача)`
		: `${formatKopecksRu(totalGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(totalLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(totalMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(totalNetBaseKop as Kopecks)} (Чистая база) × ${avgCommission}% = ${formatKopecksRu(effectiveDoctorEarnedKop as Kopecks)} к выплате`;

	return {
		doctorId: targetDoctorId,
		doctorName,
		doctorSpecialty,
		period: {
			from: fromDate.toISOString(),
			to: toDate.toISOString(),
			...(dateParam !== undefined ? { date: dateParam } : {}),
		},
		summary: {
			payoutModel: isChairRental ? "chair_rental" : "percentage",
			...(isChairRental ? { chairRentalRub, chairRentalKop } : {}),
			advanceRub,
			advanceKop,
			mainPayoutRub,
			mainPayoutKop,
			...(isSelfEmployed ? { npdTaxRub, npdTaxKop } : {}),
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
			completedAppointmentsCount: rawAppointments.filter(
				(a) => a.status === "completed",
			).length,
			inChairAppointmentsCount: rawAppointments.filter(
				(a) => a.status === "in_chair",
			).length,
			totalAppointmentsCount: rawAppointments.length,
			totalServicesCount: appointmentsResult.reduce(
				(acc, a) => acc + a.services.length,
				0,
			),
			paidAmountRub: totalPaidRub,
			unpaidAmountRub: totalUnpaidRub,
			paymentReconciliationStatus:
				totalUnpaidRub === 0 ? "fully_reconciled" : "pending_cashier",
		},
		specialtyBreakdown,
		appointments: appointmentsResult,
		formulaExplanationRu,
	};
}
