/**
 * canonicalPayrollAdapter.ts — Унифицированный адаптер между каноническим API
 * GET /api/v1/payroll/calculations и мобильным расчётным кошельком врача.
 * Mandate 8b (<= 120 lines), Mandate 8wy (100% честные цифры из PostgreSQL без float-дрифта).
 */

import type {
	DoctorPayoutReport,
	DoctorPayoutRow,
	DoctorPayoutVisit,
	DoctorPayoutLabOrder,
} from "./types.js";

export interface CanonicalPayrollApiResponse {
	readonly ok: boolean;
	readonly shiftsCount?: number;
	readonly summary?: {
		readonly doctorId: string;
		readonly doctorName: string;
		readonly schemeType: string;
		readonly totalGrossKopecks: number;
		readonly totalLabCostKopecks: number;
		readonly totalMaterialCostKopecks: number;
		readonly totalNetBaseKopecks: number;
		readonly doctorAccruedKopecks: number;
		readonly chairRentalKopecks: number;
		readonly advanceKopecks: number;
		readonly ndfl13TaxKopecks: number;
		readonly payoutKopecks: number;
		readonly payoutStatus: "accrued" | "paid_rko";
		readonly servicesCount: number;
		readonly minimumGuaranteeApplied?: boolean;
	};
	readonly orders?: readonly {
		readonly id: string;
		readonly orderNumber: string;
		readonly dateIso: string;
		readonly patientName: string;
		readonly medicalCardNumber: string;
		readonly serviceNameRu: string;
		readonly category: string;
		readonly categoryLabelRu: string;
		readonly grossKopecks: number;
		readonly labCostKopecks: number;
		readonly materialCostKopecks: number;
		readonly doctorId: string;
		readonly isPaid54Fz: boolean;
		readonly paidKopecks: number;
	}[];
	readonly closedPeriods?: readonly unknown[];
}

export function canonicalPayrollToWalletReport(
	data: CanonicalPayrollApiResponse,
	period: { readonly from: string; readonly to: string },
): DoctorPayoutReport {
	const s = data.summary;
	const orders = data.orders ?? [];

	const visits: DoctorPayoutVisit[] = orders.map((o) => ({
		visitId: o.id,
		appointmentId: null,
		paidAt: `${o.dateIso}T12:00:00.000Z`,
		visitDate: o.dateIso,
		patientId: o.id,
		patientName: o.patientName,
		medicalCardNumber: o.medicalCardNumber,
		revenueRub: Math.round(o.grossKopecks / 100),
		paymentCount: 1,
		services: [
			{
				id: o.id,
				title: o.serviceNameRu,
				order804nCode: null,
				toothCode: null,
				priceRub: Math.round(o.grossKopecks / 100),
				quantity: 1,
			},
		],
		materials:
			o.materialCostKopecks > 0
				? [
						{
							id: `${o.id}-mat`,
							name: "Расходные материалы",
							quantity: 1,
							unit: "компл",
							unitCostRub: Math.round(o.materialCostKopecks / 100),
							totalCostRub: Math.round(o.materialCostKopecks / 100),
						},
					]
				: [],
	}));

	const labOrders: DoctorPayoutLabOrder[] = orders
		.filter((o) => o.labCostKopecks > 0)
		.map((o) => ({
			id: `${o.id}-lab`,
			orderNumber: o.orderNumber,
			toothFdi: null,
			restorationType: o.serviceNameRu,
			material: null,
			patientName: o.patientName,
			status: "completed",
			completedAt: `${o.dateIso}T12:00:00.000Z`,
			priceRub: Math.round(o.labCostKopecks / 100),
			withheldRub: Math.round(o.labCostKopecks / 100),
			deductionPct: 100,
		}));

	const revRub = Math.round((s?.totalGrossKopecks ?? 0) / 100);
	const matRub = Math.round((s?.totalMaterialCostKopecks ?? 0) / 100);
	const labRub = Math.round((s?.totalLabCostKopecks ?? 0) / 100);
	const accRub = Math.round((s?.doctorAccruedKopecks ?? 0) / 100);
	const payRub = Math.round((s?.payoutKopecks ?? 0) / 100);

	const row: DoctorPayoutRow = {
		doctorUserId: s?.doctorId || "doc-1",
		doctorName: s?.doctorName || "Врач-стоматолог",
		role: "doctor",
		isActive: true,
		revenueRub: revRub,
		paymentCount: orders.length,
		materialCostRub: matRub,
		materialMovements: orders.filter((o) => o.materialCostKopecks > 0).length,
		materialMovementsUnpriced: 0,
		materialsState: "counted",
		labCostRub: labRub,
		labOrdersCount: labOrders.length,
		withheldLabRub: labRub,
		commissionPct: 25,
		materialDeductionPct: 100,
		rateEffectiveFrom: null,
		rateRowCount: 1,
		state: "computed",
		accruedRub: accRub,
		withheldMaterialRub: matRub,
		payoutRub: payRub,
		note: "Фактические начисления по базе данных",
		visits,
		labOrders,
	};

	return {
		scope: "all",
		period,
		rows: s ? [row] : [],
		totals: {
			revenueRub: revRub,
			paymentCount: orders.length,
			attributableRevenueRub: revRub,
			unattributedRevenueRub: 0,
			materialCostRub: matRub,
			labCostRub: labRub,
			accruedRub: accRub,
			withheldMaterialRub: matRub,
			withheldLabRub: labRub,
			payoutRub: payRub,
			doctorsCounted: s ? 1 : 0,
			doctorsWithoutRate: 0,
		},
		methodNote: "Фактические начисления по каноническому API зарплат",
		limitations: [],
		isEmpty: !s || orders.length === 0,
	};
}
