/**
 * adaptSampleAppointmentItem.ts — Адаптация одного демо-приема врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import {
	CATEGORY_NAMES_RU,
	LAB_STATUS_RU,
	type DoctorEarningsAppointmentItem,
	type DoctorEarningsLabOrderItem,
	type DoctorEarningsServiceItem,
} from "./types.js";
import type { CategoryAccumulatorItem } from "./liveEarningsTypes.js";

export function adaptSampleAppointment(
	apt: any,
	index: number,
	categoryRates: Record<string, number>,
	sampleCategoryAgg: Record<string, CategoryAccumulatorItem>,
): DoctorEarningsAppointmentItem & { paidRub: number; unpaidRub: number } {
	let aptGrossKop = 0;
	let aptLabKop = 0;
	let aptMatKop = 0;
	let aptEarnedKop = 0;

	const servicesList: DoctorEarningsServiceItem[] = (apt.services || []).map((srv: any, srvIdx: number) => {
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
			sampleCategoryAgg[srv.category] = { gross: 0, lab: 0, earned: 0, count: 0 };
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
			isPaid: index !== 2,
		};
	});

	const aptNetBaseKop = Math.max(0, aptGrossKop - aptLabKop - aptMatKop);
	const isPaid = index !== 2;
	const paidRub = isPaid ? aptGrossKop / 100 : 0;
	const unpaidRub = isPaid ? 0 : aptGrossKop / 100;

	const sampleLabOrders: DoctorEarningsLabOrderItem[] = aptLabKop > 0
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
		paidRub,
		unpaidRub,
	};
}
