import { Decimal } from "decimal.js";
import {
	generateDoctorEarningsPayslipHtml,
	type DoctorPayslipPrintPayload,
	type DoctorPayslipVisitItem,
	type DoctorPayslipLabItem,
} from "@dental/shared";
import type { DoctorPayoutRow } from "./types.js";
import { percentOfMoney, roundMoney } from "./math.js";

/**
 * Генерирует официальную расчетную ведомость (расчетный листок) врача.
 * Mandate 8b: <= 120 lines. Mandate 8x: clean Russian clinical language.
 */
export function generateDoctorPayslipHtml(
	doctorRow: DoctorPayoutRow,
	options?: {
		organizationName?: string;
		organizationInn?: string;
		periodFrom?: string;
		periodTo?: string;
	},
): string {
	const visits: DoctorPayslipVisitItem[] = (doctorRow.visits ?? []).flatMap((v) =>
		v.services.map((srv) => {
			const srvTotal = roundMoney(new Decimal(srv.priceRub).times(srv.quantity));
			const srvAccrued = percentOfMoney(srvTotal, doctorRow.commissionPct ?? 0);
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

	const labOrders: DoctorPayslipLabItem[] = (doctorRow.labOrders ?? []).map((lo) => ({
		orderNumber: lo.orderNumber,
		patientName: lo.patientName,
		restorationType: lo.restorationType,
		toothFdi: lo.toothFdi,
		priceRub: lo.priceRub,
		withheldRub: lo.withheldRub,
		isWarranty: Boolean(lo.isWarranty),
	}));

	const payload: DoctorPayslipPrintPayload = {
		organizationName: options?.organizationName ?? "Стоматологическая клиника",
		organizationInn: options?.organizationInn ?? "",
		doctorName: doctorRow.doctorName,
		personnelNumber: doctorRow.doctorUserId.slice(0, 8).toUpperCase(),
		specialtyTitle: doctorRow.role === "doctor" ? "Врач-стоматолог" : doctorRow.role,
		periodFromIso: options?.periodFrom ?? new Date().toISOString(),
		periodToIso: options?.periodTo ?? new Date().toISOString(),
		grossRevenueRub: doctorRow.revenueRub,
		netBaseRevenueRub: roundMoney(
			Decimal.max(
				0,
				new Decimal(doctorRow.revenueRub)
					.minus(new Decimal(doctorRow.labCostRub))
					.minus(new Decimal(doctorRow.materialCostRub)),
			),
		),
		pieceworkAccruedRub: doctorRow.accruedRub ?? 0,
		totalAccruedRub: doctorRow.accruedRub ?? 0,
		ndflTaxRub: roundMoney(new Decimal(doctorRow.accruedRub ?? 0).times(0.13)),
		withheldLabRub: doctorRow.withheldLabRub ?? 0,
		withheldMaterialRub: doctorRow.withheldMaterialRub ?? 0,
		overheadConsumablesCoveredRub: doctorRow.overheadCostRub ?? 0,
		netPayoutRub: doctorRow.payoutRub ?? 0,
		...(doctorRow.categoryBreakdown && doctorRow.categoryBreakdown.length > 0
			? { categoryBreakdown: doctorRow.categoryBreakdown }
			: {}),
		...(visits.length > 0 ? { visits } : {}),
		...(labOrders.length > 0 ? { labOrders } : {}),
	};

	return generateDoctorEarningsPayslipHtml(payload);
}

/** @deprecated Use generateDoctorPayslipHtml (Mandate 8x / 8ap) */
export const generateDoctorT51Payslip = generateDoctorPayslipHtml;
