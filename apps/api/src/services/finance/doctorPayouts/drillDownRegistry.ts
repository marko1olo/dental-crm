import { Decimal } from "decimal.js";
import {
	classifyServiceCategory,
	generateDoctorEarningsPayslipHtml,
	isGeneralClinicOverheadConsumable,
	type CategoryAccrualBreakdown,
	type DoctorPayslipLabItem,
	type DoctorPayslipPrintPayload,
	type DoctorPayslipVisitItem,
} from "@dental/shared";
import type {
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
	DoctorPayoutScope,
} from "./types.js";
import { moneyFromDb } from "./dbParsers.js";
import { extractMedicalCardNumber, humanizeRestorationType } from "./helpers.js";
import { isUsablePercent, percentOfMoney, roundMoney } from "./math.js";

export interface DrillDownDetailsInput {
	readonly paidVisitsDetails: Array<{
		readonly doctorUserId: string | null;
		readonly visitId: string;
		readonly appointmentId: string | null;
		readonly paidAt: Date | string | null;
		readonly visitCreatedAt: Date | string;
		readonly appointmentStartTime: Date | string | null;
		readonly patientId: string;
		readonly patientName: string;
		readonly administrativeProfile: unknown;
		readonly paymentAmountRub: unknown;
	}>;
	readonly visitServices: Array<{
		readonly visitId: string;
		readonly id: string;
		readonly title: string;
		readonly order804nCode: string | null;
		readonly category: string | null;
		readonly toothCode: string | null;
		readonly priceRub: unknown;
		readonly quantity: number | null;
	}>;
	readonly visitMaterials: Array<{
		readonly visitId: string;
		readonly id: string;
		readonly name: string | null;
		readonly quantityChanged: unknown;
		readonly unit: string | null;
		readonly unitCostRub: unknown;
	}>;
	readonly rawLabOrders: Array<{
		readonly id: string;
		readonly doctorId: string | null;
		readonly secureToken: string | null;
		readonly toothFdi: string | null;
		readonly material: string | null;
		readonly patientName: string | null;
		readonly status: string;
		readonly completedAt: Date | string | null;
		readonly priceRub: unknown;
		readonly clinicalNotes?: string | null;
		readonly isWarranty?: boolean;
	}>;
	readonly rawLabItems: Array<{
		readonly labOrderId: string;
		readonly toothFdi: string | number;
		readonly restorationType: string | null;
		readonly material: string | null;
	}>;
	readonly organizationName: string;
	readonly organizationInn: string | null;
}

/**
 * Построение реестра оплаченных визитов врача за период.
 */
export function buildDoctorVisitsRegistry(
	doctorUserId: string,
	drillDown: DrillDownDetailsInput,
): DoctorPayoutVisit[] {
	const doctorVisitPayments = drillDown.paidVisitsDetails.filter(
		(v) => v.doctorUserId === doctorUserId,
	);

	const visitsMap = new Map<string, DoctorPayoutVisit>();
	for (const v of doctorVisitPayments) {
		const paymentRub = moneyFromDb(v.paymentAmountRub, "сумма оплаты визита");
		const existing = visitsMap.get(v.visitId);
		if (existing) {
			visitsMap.set(v.visitId, {
				...existing,
				revenueRub: roundMoney(new Decimal(existing.revenueRub).plus(paymentRub)),
				paymentCount: existing.paymentCount + 1,
			});
		} else {
			const servicesForVisit = drillDown.visitServices
				.filter((srv) => srv.visitId === v.visitId)
				.map((srv) => {
					const specialty = classifyServiceCategory(
						srv.category || srv.title,
						srv.order804nCode,
					);
					return {
						id: srv.id,
						title: srv.title,
						order804nCode: srv.order804nCode ?? "A16.07.002",
						category: srv.category ?? null,
						specialty,
						toothCode: srv.toothCode ?? null,
						priceRub: moneyFromDb(srv.priceRub, "цена услуги"),
						quantity: Number(srv.quantity ?? 1),
					};
				});

			const materialsForVisit = drillDown.visitMaterials
				.filter((mat) => mat.visitId === v.visitId)
				.map((mat) => {
					const qty = Math.abs(Number(mat.quantityChanged ?? 0));
					const unitCost = moneyFromDb(mat.unitCostRub, "себестоимость материала");
					const totalCost = roundMoney(new Decimal(qty).times(new Decimal(unitCost)));
					const matName = mat.name ?? "Расходный материал";
					const isOverhead = isGeneralClinicOverheadConsumable(matName);
					return {
						id: mat.id,
						name: matName,
						quantity: qty,
						unit: mat.unit ?? "шт",
						unitCostRub: unitCost,
						totalCostRub: totalCost,
						isOverheadConsumable: isOverhead,
						coveredByClinic: isOverhead,
					};
				});

			const visitIso = v.appointmentStartTime
				? new Date(v.appointmentStartTime).toISOString()
				: new Date(v.visitCreatedAt).toISOString();
			const paidIso = v.paidAt
				? new Date(v.paidAt).toISOString()
				: visitIso;

			visitsMap.set(v.visitId, {
				visitId: v.visitId,
				appointmentId: v.appointmentId,
				paidAt: paidIso,
				visitDate: visitIso,
				patientId: v.patientId,
				patientName: v.patientName,
				medicalCardNumber: extractMedicalCardNumber(v.patientId, v.administrativeProfile),
				revenueRub: paymentRub,
				paymentCount: 1,
				services: servicesForVisit,
				materials: materialsForVisit,
			});
		}
	}

	return Array.from(visitsMap.values()).sort(
		(a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime(),
	);
}

/**
 * Построение реестра нарядов зуботехнической лаборатории (ЗТЛ) с честным вычетом себестоимости.
 */
export function buildDoctorLabOrdersRegistry(
	doctorUserId: string,
	drillDown: DrillDownDetailsInput,
	commissionPct: number | null,
	labDeductionPct: number | null,
): DoctorPayoutLabOrder[] {
	const doctorRawLabOrders = drillDown.rawLabOrders.filter(
		(order) => order.doctorId === doctorUserId,
	);

	const labPct = isUsablePercent(labDeductionPct)
		? labDeductionPct
		: (isUsablePercent(commissionPct) ? commissionPct : 100);

	return doctorRawLabOrders.map((order) => {
		const itemsForOrder = drillDown.rawLabItems.filter(
			(item) => item.labOrderId === order.id,
		);
		const price = moneyFromDb(order.priceRub, "стоимость наряда ЗТЛ");
		const notesLower = ((order.clinicalNotes || "") + " " + (order.status || "")).toLowerCase();
		const isWarranty =
			Boolean(order.isWarranty) ||
			notesLower.includes("гарант") ||
			notesLower.includes("warranty") ||
			notesLower.includes("переделк") ||
			notesLower.includes("рекламац");

		// Гарантийные переделки НЕ удерживаются с врача (0 ₽), а относятся на рекламационный фонд клиники
		const withheld = isWarranty ? 0 : percentOfMoney(price, labPct);
		const tooth = itemsForOrder.length > 0
			? itemsForOrder.map((item) => String(item.toothFdi)).join(", ")
			: (order.toothFdi || "—");
		const restoration = itemsForOrder.length > 0
			? itemsForOrder.map((item) => humanizeRestorationType(item.restorationType, item.material)).join("; ")
			: humanizeRestorationType(null, order.material);

		return {
			id: order.id,
			orderNumber: order.secureToken
				? order.secureToken.slice(0, 8).toUpperCase()
				: order.id.slice(0, 8).toUpperCase(),
			toothFdi: tooth,
			restorationType: restoration,
			material: order.material,
			patientName: order.patientName ?? "Пациент",
			status: order.status,
			completedAt: order.completedAt ? new Date(order.completedAt).toISOString() : null,
			priceRub: price,
			withheldRub: withheld,
			deductionPct: isWarranty ? 0 : labPct,
			isWarranty,
			warrantyCoveredByClinicRub: isWarranty ? price : 0,
		};
	});
}

export interface BuildPayslipInput {
	readonly doctorUserId: string;
	readonly doctorName: string;
	readonly role: string;
	readonly scope: DoctorPayoutScope;
	readonly revenueRub: number;
	readonly materialCostRub: number;
	readonly overheadCostRub: number;
	readonly labCostRub: number;
	readonly computedAccruedRub: number | null;
	readonly computedPayoutRub: number | null;
	readonly computedWithheldLabRub: number | null;
	readonly computedWithheldMaterialRub: number | null;
	readonly commissionPct: number | null;
	readonly categoryBreakdown: CategoryAccrualBreakdown[];
	readonly doctorVisitsList: DoctorPayoutVisit[];
	readonly doctorLabOrdersList: DoctorPayoutLabOrder[];
	readonly drillDown: DrillDownDetailsInput;
}

/**
 * Синтез официального расчетного листка врача по формуле Net Revenue.
 */
export function buildDoctorPayslipHtml(input: BuildPayslipInput): string {
	const payslipVisits: DoctorPayslipVisitItem[] = input.doctorVisitsList.flatMap((v) =>
		v.services.map((srv) => {
			const srvTotal = roundMoney(new Decimal(srv.priceRub).times(srv.quantity));
			const srvAccrued = percentOfMoney(srvTotal, input.commissionPct ?? 0);
			return {
				visitId: v.visitId,
				visitDate: v.visitDate,
				patientName: v.patientName,
				medicalCardNumber: v.medicalCardNumber,
				serviceTitle: srv.title,
				order804nCode: srv.order804nCode,
				toothCode: srv.toothCode,
				priceRub: srvTotal,
				accruedRub: srvAccrued,
			};
		}),
	);

	const payslipLabOrders: DoctorPayslipLabItem[] = input.doctorLabOrdersList.map((lo) => ({
		orderNumber: lo.orderNumber,
		patientName: lo.patientName,
		restorationType: lo.restorationType,
		toothFdi: lo.toothFdi,
		priceRub: lo.priceRub,
		withheldRub: lo.withheldRub,
		isWarranty: Boolean(lo.isWarranty),
	}));

	const netBaseRevenueRub = roundMoney(
		Decimal.max(
			0,
			new Decimal(input.revenueRub)
				.minus(new Decimal(input.labCostRub))
				.minus(new Decimal(input.materialCostRub)),
		),
	);

	const payslipPayload: DoctorPayslipPrintPayload = {
		organizationName: input.drillDown.organizationName,
		organizationInn: input.drillDown.organizationInn ?? "",
		doctorName: input.doctorName,
		personnelNumber: input.doctorUserId.slice(0, 8).toUpperCase(),
		specialtyTitle: input.role === "doctor" ? "Врач-стоматолог" : input.role,
		periodFromIso: input.scope.from.toISOString(),
		periodToIso: input.scope.to.toISOString(),
		grossRevenueRub: input.revenueRub,
		netBaseRevenueRub,
		pieceworkAccruedRub: input.computedAccruedRub ?? 0,
		totalAccruedRub: input.computedAccruedRub ?? 0,
		ndflTaxRub: roundMoney(new Decimal(input.computedAccruedRub ?? 0).times(0.13)),
		withheldLabRub: input.computedWithheldLabRub ?? 0,
		withheldMaterialRub: input.computedWithheldMaterialRub ?? 0,
		overheadConsumablesCoveredRub: input.overheadCostRub,
		netPayoutRub: input.computedPayoutRub ?? 0,
		...(input.categoryBreakdown.length > 0 ? { categoryBreakdown: input.categoryBreakdown } : {}),
		...(payslipVisits.length > 0 ? { visits: payslipVisits } : {}),
		...(payslipLabOrders.length > 0 ? { labOrders: payslipLabOrders } : {}),
	};

	return generateDoctorEarningsPayslipHtml(payslipPayload);
}
