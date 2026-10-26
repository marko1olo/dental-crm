/**
 * calculateLiveAppointmentItem.ts — Вычисление финансовых показателей одного приема врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import { resolveProcedureDeductionItems } from "@dental/shared";
import {
	CATEGORY_NAMES_RU,
	type DoctorEarningsAppointmentItem,
	type DoctorEarningsServiceItem,
} from "./types.js";
import type { LiveCalculationInput, CategoryAccumulatorItem } from "./liveEarningsTypes.js";
import { LAB_DEDUCTED_CATEGORIES } from "./constants.js";
import { distributeLabKopAcrossServices, processAptLabOrders } from "./liveLabOrdersProcessor.js";

export function processLiveAppointment(
	apt: LiveCalculationInput["rawAppointments"][number],
	input: LiveCalculationInput,
	categoryAgg: Record<string, CategoryAccumulatorItem>,
): DoctorEarningsAppointmentItem & { paidRub: number; unpaidRub: number } {
	const visitId = input.appointmentToVisitMap.get(apt.id) || null;
	const aptTreatments = visitId ? input.dbTreatmentItems.filter((t) => t.visitId === visitId) : [];
	const aptPayments = visitId ? input.dbPayments.filter((p) => p.visitId === visitId) : [];
	const aptPaidAmount = aptPayments.reduce((sum, p) => sum + (parseFloat(String(p.amountRub)) || 0), 0);

	const { aptLabItems, aptLabKop: patientLabKop } = processAptLabOrders(apt.patientId, input.dbLabOrders);
	// Бюджет вычета приема уже распределен между приемами пациента в калькуляторе:
	// счет ЗТЛ вычитается строго один раз, без задвоения по приёмам и услугам.
	// Отсутствие записи о приеме в готовой карте означает заведомо нулевую долю.
	const aptLabKop = input.appointmentLabBudgetKop
		? (input.appointmentLabBudgetKop.get(apt.id) ?? 0)
		: patientLabKop;
	const aptLabItemsForApt = aptLabKop > 0 ? aptLabItems : [];

	let aptGrossKop = 0;
	let aptMatKop = 0;
	let aptEarnedKop = 0;

	// Протокол против задвоения вычета: счет ЗТЛ распределяется между услугами
	// приема строго один раз (пропорционально цене ортопедических услуг).
	const serviceBaseInfo = aptTreatments.map((t) => {
		const priceKop = Math.round((parseFloat(String(t.priceRub)) || 0) * 100);
		return { priceKop, isOrthopedic: LAB_DEDUCTED_CATEGORIES.has(t.category || "therapy") };
	});
	const labSharesKop = distributeLabKopAcrossServices(aptLabKop, serviceBaseInfo);

	const aptServices: DoctorEarningsServiceItem[] = aptTreatments.map((t, idx) => {
		const priceRub = parseFloat(String(t.priceRub)) || 0;
		const priceKop = Math.round(priceRub * 100);
		const category = t.category || "therapy";
		const catRate = input.categoryRates[category] ?? 25;

		let srvMatKop = 0;
		if (t.serviceCode) {
			const recipeItems = resolveProcedureDeductionItems(t.serviceCode);
			srvMatKop = recipeItems.reduce((acc, item) => acc + item.estimatedUnitCostKopecks, 0);
		}

		const srvLabKop = labSharesKop[idx] ?? 0;
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
	});

	const aptNetBaseKop = Math.max(0, aptGrossKop - aptLabKop - aptMatKop);
	const aptGrossRub = aptGrossKop / 100;
	const isPaid = aptPaidAmount >= aptGrossRub && aptGrossRub > 0;
	const isPartial = !isPaid && aptPaidAmount > 0;
	const paymentStatus: "paid" | "partial" | "unpaid" = isPaid ? "paid" : (isPartial ? "partial" : "unpaid");
	const paidRub = isPaid ? aptGrossRub : (isPartial ? aptPaidAmount : 0);
	const unpaidRub = isPaid ? 0 : (isPartial ? Math.max(0, aptGrossRub - aptPaidAmount) : aptGrossRub);

	return {
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
		labOrders: aptLabItemsForApt,
		paidRub,
		unpaidRub,
	};
}
