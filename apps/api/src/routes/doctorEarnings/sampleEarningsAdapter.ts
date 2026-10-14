/**
 * sampleEarningsAdapter.ts — Адаптер демонстрационных приемов врача (Showcase / Offline Demo).
 *
 * Mandate 8e & Zero Mocks: изолированная генерация расчетных показателей для демо-режима.
 */

import {
	createSampleChairsideShiftAppointments,
	formatKopecksRu,
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
	const {
		targetDoctorId,
		doctorName,
		doctorSpecialty,
		fromDate,
		toDate,
		dateParam,
		categoryRates,
		payoutModel,
		chairRentalRub: rawChairRentalRub,
		advanceRub: rawAdvanceRub,
		taxRegime,
	} = params;

	const sampleAppointments = createSampleChairsideShiftAppointments(
		targetDoctorId,
		doctorName,
		dateParam || fromDate.toISOString().split("T")[0]!,
	);

	let sampleGrossKop = 0;
	let sampleLabKop = 0;
	let sampleMatKop = 0;
	let sampleEarnedKop = 0;
	let samplePaidRub = 0;
	let sampleUnpaidRub = 0;

	const sampleCategoryAgg: Record<
		string,
		{ gross: number; lab: number; earned: number; count: number }
	> = {};

	const adaptedAppointments: DoctorEarningsAppointmentItem[] =
		sampleAppointments.map((apt, index) => {
			let aptGrossKop = 0;
			let aptLabKop = 0;
			let aptMatKop = 0;
			let aptEarnedKop = 0;

			const servicesList: DoctorEarningsServiceItem[] = (
				apt.services || []
			).map((srv, srvIdx) => {
				const srvPriceKop = srv.finalRevenueKop || srv.totalCostKop || 0;
				const srvLabKop = srv.directLabZtlCostKop || 0;
				const srvMatKop = srv.directMaterialCostKop || 0;
				const catRate = categoryRates[srv.category] ?? 25;
				const dealBase = Math.max(0, srvPriceKop - srvLabKop - srvMatKop);
				const earnedKop = Math.round((dealBase * catRate) / 100);

				aptGrossKop += srvPriceKop;
				aptLabKop += srvLabKop;
				aptMatKop += srvMatKop;
				aptEarnedKop += earnedKop;

				if (!sampleCategoryAgg[srv.category]) {
					sampleCategoryAgg[srv.category] = {
						gross: 0,
						lab: 0,
						earned: 0,
						count: 0,
					};
				}
				sampleCategoryAgg[srv.category]!.gross += srvPriceKop / 100;
				sampleCategoryAgg[srv.category]!.lab += srvLabKop / 100;
				sampleCategoryAgg[srv.category]!.earned += earnedKop / 100;
				sampleCategoryAgg[srv.category]!.count += 1;

				return {
					id: `srv-${apt.id}-${srvIdx + 1}`,
					nameRu: srv.nameRu,
					category: srv.category,
					categoryRu: CATEGORY_NAMES_RU[srv.category] || srv.category,
					priceRub: srvPriceKop / 100,
					priceKop: srvPriceKop,
					labCostRub: srvLabKop / 100,
					labCostKop: srvLabKop,
					materialCostRub: srvMatKop / 100,
					materialCostKop: srvMatKop,
					commissionPercent: catRate,
					earnedRub: earnedKop / 100,
					earnedKop,
					isPaid: index !== 2, // 1 визит с задержкой оплаты в демонстрации
				};
			});

			const aptNetBaseKop = Math.max(0, aptGrossKop - aptLabKop - aptMatKop);
			sampleGrossKop += aptGrossKop;
			sampleLabKop += aptLabKop;
			sampleMatKop += aptMatKop;
			sampleEarnedKop += aptEarnedKop;

			const isPaid = index !== 2;
			if (isPaid) {
				samplePaidRub += aptGrossKop / 100;
			} else {
				sampleUnpaidRub += aptGrossKop / 100;
			}

			const sampleLabOrders: DoctorEarningsLabOrderItem[] =
				aptLabKop > 0
					? [
							{
								id: `lab-order-${apt.id}`,
								toothFdi: "2.1",
								material: "Диоксид циркония с нанесением E.max",
								status: "received",
								statusRu: LAB_STATUS_RU.received || "Получен",
								costRub: aptLabKop / 100,
								costKop: aptLabKop,
								dueDate: `${apt.startsAtIso.split("T")[0]}T18:00:00.000Z`,
							},
						]
					: [];

			return {
				appointmentId: apt.id,
				visitId: `visit-${apt.id}`,
				patientId: apt.patientId,
				patientFullName: apt.patientFullName,
				cardNumber: apt.cardNumber,
				startsAtIso: apt.startsAtIso,
				endsAtIso: apt.endsAtIso,
				status: apt.status,
				paymentStatus: isPaid ? "paid" : "unpaid",
				grossRevenueRub: aptGrossKop / 100,
				grossRevenueKop: aptGrossKop,
				labCostRub: aptLabKop / 100,
				labCostKop: aptLabKop,
				materialsCostRub: aptMatKop / 100,
				materialsCostKop: aptMatKop,
				netBaseRub: aptNetBaseKop / 100,
				netBaseKop: aptNetBaseKop,
				doctorEarnedRub: aptEarnedKop / 100,
				doctorEarnedKop: aptEarnedKop,
				services: servicesList,
				labOrders: sampleLabOrders,
			};
		});

	const specialtyBreakdown: DoctorEarningsCategoryBreakdown[] = Object.entries(
		sampleCategoryAgg,
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

	const isChairRental = payoutModel === "chair_rental";
	const chairRentalRub = isChairRental ? Math.max(0, rawChairRentalRub ?? 0) : 0;
	const chairRentalKop = Math.round(chairRentalRub * 100);

	let effectiveDoctorEarnedKop = sampleEarnedKop;
	let netBaseKop = Math.max(0, sampleGrossKop - sampleLabKop - sampleMatKop);

	if (isChairRental) {
		netBaseKop = Math.max(0, sampleGrossKop - sampleLabKop - sampleMatKop - chairRentalKop);
		effectiveDoctorEarnedKop = netBaseKop;
	}

	const avgCommission = isChairRental
		? 100
		: (netBaseKop > 0 ? Math.round((effectiveDoctorEarnedKop * 100) / netBaseKop) : 25);

	const advanceRub = Math.max(0, rawAdvanceRub ?? 0);
	const advanceKop = Math.round(advanceRub * 100);
	const mainPayoutKop = Math.max(0, effectiveDoctorEarnedKop - advanceKop);
	const mainPayoutRub = mainPayoutKop / 100;
	const isSelfEmployed = isChairRental || taxRegime === "self_employed";
	const npdTaxKop = isSelfEmployed ? Math.round((effectiveDoctorEarnedKop * 6) / 100) : 0;
	const npdTaxRub = npdTaxKop / 100;

	const formulaExplanationRu = isChairRental
		? `${formatKopecksRu(sampleGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(chairRentalKop as Kopecks)} (Аренда кресла) − ${formatKopecksRu(sampleLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(sampleMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(effectiveDoctorEarnedKop as Kopecks)} (Чистый доход соло-врача)`
		: `${formatKopecksRu(sampleGrossKop as Kopecks)} (Выручка) − ${formatKopecksRu(sampleLabKop as Kopecks)} (ЗТЛ) − ${formatKopecksRu(sampleMatKop as Kopecks)} (Материалы) = ${formatKopecksRu(netBaseKop as Kopecks)} (Чистая база) × ${avgCommission}% = ${formatKopecksRu(effectiveDoctorEarnedKop as Kopecks)} к выплате`;

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
			totalGrossRevenueRub: sampleGrossKop / 100,
			totalGrossRevenueKop: sampleGrossKop,
			totalLabDeductionsRub: sampleLabKop / 100,
			totalLabDeductionsKop: sampleLabKop,
			totalMaterialDeductionsRub: sampleMatKop / 100,
			totalMaterialDeductionsKop: sampleMatKop,
			netBaseRevenueRub: netBaseKop / 100,
			netBaseRevenueKop: netBaseKop,
			totalDoctorEarnedRub: effectiveDoctorEarnedKop / 100,
			totalDoctorEarnedKop: effectiveDoctorEarnedKop,
			averageCommissionPercent: avgCommission,
			completedAppointmentsCount: sampleAppointments.filter(
				(a) => a.status === "completed",
			).length,
			inChairAppointmentsCount: sampleAppointments.filter(
				(a) => a.status === "in_chair",
			).length,
			totalAppointmentsCount: sampleAppointments.length,
			totalServicesCount: sampleAppointments.reduce(
				(acc, a) => acc + (a.services?.length || 0),
				0,
			),
			paidAmountRub: samplePaidRub,
			unpaidAmountRub: sampleUnpaidRub,
			paymentReconciliationStatus:
				sampleUnpaidRub === 0 ? "fully_reconciled" : "pending_cashier",
		},
		specialtyBreakdown,
		appointments: adaptedAppointments,
		formulaExplanationRu,
	};
}
