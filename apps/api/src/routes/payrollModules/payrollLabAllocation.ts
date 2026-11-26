/**
 * payrollLabAllocation.ts — Service & dental lab (ZTL) cost allocation for doctor payroll.
 */

import { rublesToKopecks, type DoctorCompletedServiceItem } from "@dental/shared";
import {
	CATEGORY_LABELS_RU,
	formatDateIsoInTimeZone,
	getTreatmentItemPricingKopecks,
	normalizeClinicalCategory,
	type PayrollOrderDto,
} from "./payrollTypesAndQueries.js";

export interface PricelistSalaryRuleMatch {
	salaryPriceKop?: number | undefined;
	customCommissionPercent?: number | undefined;
}

export interface TrackedDoctorLabOrder {
	id: string;
	patientId: string;
	toothFdi: string | null;
	appointmentId: string | null;
	treatmentPlanId: string | null;
	remainingCostKop: number;
}

export interface PayrollAppointmentRow {
	id: string;
	patientId: string;
	status: string | null;
	startsAt: Date | null;
	patientName: string | null;
	cardNumber: string;
}

export interface PayrollTreatmentRow {
	id: string;
	visitId: string | null;
	toothCode: string | null;
	priceRub: string | number | null;
	priceKopecks: number | bigint | null;
	unitPriceRub: string | number | null;
	unitPriceKopecks: number | bigint | null;
	discountRub: string | number | null;
	discountKopecks: number | bigint | null;
	quantity: string | number | null;
	title: string | null;
	category: string | null;
	specialty: string | null;
	code: string | null;
	order804nCode: string | null;
	salaryPriceKopecks?: number | bigint | null;
	tierPrices?: unknown;
}

function resolveTierSalaryPriceKop(tierPrices: unknown): number | undefined {
	if (!tierPrices || typeof tierPrices !== "object") return undefined;
	const record = tierPrices as Record<string, unknown>;
	if (typeof record.salaryPriceKopecks === "number" && Number.isFinite(record.salaryPriceKopecks) && record.salaryPriceKopecks >= 0) {
		return Math.round(record.salaryPriceKopecks);
	}
	if (typeof record.salaryPriceRub === "number" && Number.isFinite(record.salaryPriceRub) && record.salaryPriceRub >= 0) {
		return rublesToKopecks(record.salaryPriceRub);
	}
	return undefined;
}

function allocateVisitPaidProportional(
	treats: PayrollTreatmentRow[],
	totalGrossByVisit: Map<string, number>,
	paidKopByVisit: Map<string, number>,
): Map<string, number> {
	const result = new Map<string, number>();
	const byVisit = new Map<string, { id: string; grossKop: number }[]>();
	for (const t of treats) {
		if (!t.visitId) continue;
		const gKop = getTreatmentItemPricingKopecks(t).grossKop;
		const list = byVisit.get(t.visitId) ?? [];
		list.push({ id: t.id, grossKop: gKop });
		byVisit.set(t.visitId, list);
	}

	for (const [visitId, items] of byVisit) {
		const visitTotalGross = totalGrossByVisit.get(visitId) || 0;
		const visitPaidTotal = paidKopByVisit.get(visitId) || 0;
		if (visitTotalGross <= 0 || visitPaidTotal <= 0) continue;
		if (visitPaidTotal >= visitTotalGross) {
			for (const it of items) result.set(it.id, it.grossKop);
			continue;
		}
		let remainingPaid = Math.min(visitPaidTotal, visitTotalGross);
		for (let i = 0; i < items.length; i++) {
			const it = items[i];
			if (!it) continue;
			const share = i === items.length - 1
				? Math.min(it.grossKop, remainingPaid)
				: Math.min(
					it.grossKop,
					Math.min(remainingPaid, Number((BigInt(visitPaidTotal) * BigInt(it.grossKop)) / BigInt(visitTotalGross))),
				);
			remainingPaid = Math.max(0, remainingPaid - share);
			result.set(it.id, share);
		}
	}
	return result;
}

export function buildPayrollServicesAndAllocateLabOrders(params: {
	treats: PayrollTreatmentRow[];
	appts: PayrollAppointmentRow[];
	visitToAppt: Map<string, string | null>;
	totalGrossByVisit: Map<string, number>;
	paidKopByVisit: Map<string, number>;
	remainingPaidKopByVisit: Map<string, number>;
	fiscalReceiptByVisit: Map<string, string>;
	trackedLabOrders: TrackedDoctorLabOrder[];
	matCostByTreatmentId: Map<string, number>;
	salaryRuleByServiceKey?: Map<string, PricelistSalaryRuleMatch> | undefined;
	resolvedDocId: string;
	fromStr: string;
	toStr: string;
	clinicTimeZone?: string | undefined;
}): {
	orders: PayrollOrderDto[];
	completedServices: DoctorCompletedServiceItem[];
	unallocatedLabKop: number;
} {
	const {
		treats,
		appts,
		visitToAppt,
		totalGrossByVisit,
		paidKopByVisit,
		fiscalReceiptByVisit,
		trackedLabOrders,
		matCostByTreatmentId,
		salaryRuleByServiceKey,
		resolvedDocId,
		fromStr,
		toStr,
		clinicTimeZone,
	} = params;

	const orders: PayrollOrderDto[] = [];
	const completedServices: DoctorCompletedServiceItem[] = [];
	const proportionalPaidByItemId = allocateVisitPaidProportional(treats, totalGrossByVisit, paidKopByVisit);

	for (const t of treats) {
		const pricing = getTreatmentItemPricingKopecks(t);
		const grossKop = pricing.grossKop;
		const visitId = t.visitId;
		const visitTotalGross = visitId ? (totalGrossByVisit.get(visitId) || 0) : 0;
		const visitPaidTotal = visitId ? (paidKopByVisit.get(visitId) || 0) : 0;
		const actuallyPaidGrossKop = proportionalPaidByItemId.get(t.id) ?? (
			visitId && visitTotalGross > 0 && visitPaidTotal >= visitTotalGross ? grossKop : 0
		);

		const codeKey = t.code ? `code:${t.code.trim().toLowerCase()}` : "";
		const orderCodeKey = t.order804nCode ? `code:${t.order804nCode.trim().toLowerCase()}` : "";
		const titleKey = t.title ? `name:${t.title.trim().toLowerCase()}` : "";
		const matchedRule =
			(codeKey && salaryRuleByServiceKey?.get(codeKey)) ||
			(orderCodeKey && salaryRuleByServiceKey?.get(orderCodeKey)) ||
			(titleKey && salaryRuleByServiceKey?.get(titleKey)) ||
			undefined;
		const catalogSalaryPriceKop =
			t.salaryPriceKopecks !== null && t.salaryPriceKopecks !== undefined
				? Math.max(0, Math.round(Number(t.salaryPriceKopecks)))
				: undefined;
		const tierSalaryPriceKop = resolveTierSalaryPriceKop(t.tierPrices);
		const salaryPriceKop = matchedRule?.salaryPriceKop ?? catalogSalaryPriceKop ?? tierSalaryPriceKop;

		const isPaid = actuallyPaidGrossKop > 0;
		const isDebt = actuallyPaidGrossKop <= 0 && grossKop > 0;
		const invoiceStatus: "paid" | "partially_paid" | "unpaid" =
			actuallyPaidGrossKop >= grossKop
				? "paid"
				: actuallyPaidGrossKop > 0
					? "partially_paid"
					: "unpaid";
		const receiptNum = visitId ? fiscalReceiptByVisit.get(visitId) : undefined;
		const isPaid54Fz = Boolean(receiptNum) && actuallyPaidGrossKop > 0;

		const linkedApptId = t.visitId ? visitToAppt.get(t.visitId) : undefined;
		const appt = appts.find((a) => a.id === linkedApptId);
		const patientId = appt?.patientId;

		const cat = normalizeClinicalCategory(t.category, t.specialty);
		const catLabelRu = CATEGORY_LABELS_RU[cat] || "Терапия";
		const serviceTitle = t.title || "Стоматологическая услуга";
		const isOrthoService =
			cat === "orthopedics" ||
			/коронк|протез|вкладк|винир|мостовид|абтмент|зтл/i.test(serviceTitle);

		// Себестоимость ЗТЛ вычитается строго из ортопедических услуг или услуг с совпадающим номером зуба
		let labKop = 0;
		if (patientId) {
			const candidateOrder = trackedLabOrders.find((lo) => {
				if (lo.patientId !== patientId || lo.remainingCostKop <= 0) return false;
				const targetTooth = t.toothCode?.trim();
				const toothList = lo.toothFdi
					? lo.toothFdi.split(/[\s,;-]+/).map((s) => s.trim()).filter(Boolean)
					: [];
				if (targetTooth && toothList.includes(targetTooth)) {
					return true;
				}
				if (lo.appointmentId && lo.appointmentId === linkedApptId && isOrthoService) {
					return true;
				}
				return isOrthoService;
			});

			if (candidateOrder) {
				labKop = Math.min(candidateOrder.remainingCostKop, grossKop);
				candidateOrder.remainingCostKop -= labKop;
			}
		}

		const matKop = matCostByTreatmentId.get(t.id) ?? 0;

		const resolvedDateIso = appt?.startsAt
			? formatDateIsoInTimeZone(appt.startsAt, clinicTimeZone)
			: fromStr.slice(0, 10);

		completedServices.push({
			id: t.id,
			dateIso: resolvedDateIso,
			patientName: appt?.patientName || "Пациент",
			medicalCardNumber: appt?.cardNumber || "К-0",
			serviceNameRu: serviceTitle,
			category: cat,
			grossRevenueKop: grossKop,
			listPriceKop: pricing.listPriceKop,
			discountKop: pricing.discountKop,
			salaryPriceKop,
			customCommissionPercent: matchedRule?.customCommissionPercent,
			labCostKop: labKop,
			materialCostKop: matKop,
			doctorId: resolvedDocId,
			order804nCode: t.order804nCode ?? undefined,
			serviceCode: t.code ?? undefined,
			isPaid,
			isDebt,
			invoiceStatus,
			paidAmountKop: actuallyPaidGrossKop,
			actuallyPaidGrossKop,
			fiscalReceiptNumber: receiptNum,
		});

		const apptStartIso = appt?.startsAt ? appt.startsAt.toISOString() : undefined;
		const apptEndIso = appt?.startsAt
			? new Date(appt.startsAt.getTime() + 60 * 60 * 1000).toISOString()
			: undefined;

		orders.push({
			id: t.id,
			orderNumber: `ОРД-${t.id.slice(0, 6).toUpperCase()}`,
			dateIso: resolvedDateIso,
			startsAtIso: apptStartIso,
			endsAtIso: apptEndIso,
			appointmentId: linkedApptId ?? undefined,
			visitId: visitId ?? undefined,
			patientId: patientId ?? undefined,
			patientName: appt?.patientName || "Пациент",
			medicalCardNumber: appt?.cardNumber || "К-0",
			serviceNameRu: serviceTitle,
			serviceCode: t.code ?? undefined,
			category: cat,
			categoryLabelRu: catLabelRu,
			grossKopecks: grossKop,
			listPriceKopecks: pricing.listPriceKop,
			discountKopecks: pricing.discountKop,
			salaryPriceKopecks: salaryPriceKop,
			labCostKopecks: labKop,
			materialCostKopecks: matKop,
			doctorId: resolvedDocId,
			isPaid54Fz,
			paidKopecks: Math.max(0, actuallyPaidGrossKop),
		});
	}

	// Учет нераспределенного остатка заказов лаборатории врача за период (DEF-PAY-LAB-01 / DEFECT 2)
	let remainingUnallocatedLabKop = trackedLabOrders.reduce(
		(sum, lo) => sum + Math.max(0, lo.remainingCostKop),
		0,
	);

	if (remainingUnallocatedLabKop > 0) {
		for (let i = 0; i < completedServices.length && remainingUnallocatedLabKop > 0; i++) {
			const cs = completedServices[i];
			if (!cs) continue;
			if (cs.category === "orthopedics") {
				const availableMargin = Math.max(
					0,
					cs.grossRevenueKop - cs.labCostKop - cs.materialCostKop,
				);
				const toDeduct = Math.min(availableMargin, remainingUnallocatedLabKop);
				if (toDeduct > 0) {
					const updatedLabKop = cs.labCostKop + toDeduct;
					completedServices[i] = {
						...cs,
						labCostKop: updatedLabKop,
					};
					const ord = orders.find((o) => o.id === cs.id);
					if (ord) ord.labCostKopecks = updatedLabKop;
					remainingUnallocatedLabKop -= toDeduct;
				}
			}
		}

		if (remainingUnallocatedLabKop > 0) {
			for (let i = completedServices.length - 1; i >= 0; i--) {
				const cs = completedServices[i];
				if (!cs) continue;
				if (cs.category === "orthopedics") {
					const updatedLabKop = cs.labCostKop + remainingUnallocatedLabKop;
					completedServices[i] = {
						...cs,
						labCostKop: updatedLabKop,
					};
					const ord = orders.find((o) => o.id === cs.id);
					if (ord) ord.labCostKopecks = updatedLabKop;
					remainingUnallocatedLabKop = 0;
					break;
				}
			}
		}

		if (remainingUnallocatedLabKop > 0) {
			const labItemDateIso = toStr.slice(0, 10);
			const labItemId = `lab-balance-${resolvedDocId}-${labItemDateIso}`;
			completedServices.push({
				id: labItemId,
				dateIso: labItemDateIso,
				patientName: "Зуботехническая лаборатория",
				medicalCardNumber: "ЗТЛ",
				serviceNameRu: "Нераспределенные затраты зуботехнической лаборатории за период",
				category: "orthopedics",
				grossRevenueKop: 0,
				labCostKop: remainingUnallocatedLabKop,
				materialCostKop: 0,
				doctorId: resolvedDocId,
				isPaid: true,
				isDebt: false,
				invoiceStatus: "paid",
				paidAmountKop: 0,
				actuallyPaidGrossKop: 0,
			});

			orders.push({
				id: labItemId,
				orderNumber: "ЗТЛ-БАЛАНС",
				dateIso: labItemDateIso,
				patientName: "Зуботехническая лаборатория",
				medicalCardNumber: "ЗТЛ",
				serviceNameRu: "Нераспределенные затраты зуботехнической лаборатории за период",
				category: "orthopedics",
				categoryLabelRu: "Ортопедия",
				grossKopecks: 0,
				labCostKopecks: remainingUnallocatedLabKop,
				materialCostKopecks: 0,
				doctorId: resolvedDocId,
				isPaid54Fz: true,
				paidKopecks: 0,
			});
			remainingUnallocatedLabKop = 0;
		}
	}

	return {
		orders,
		completedServices,
		unallocatedLabKop: remainingUnallocatedLabKop,
	};
}
