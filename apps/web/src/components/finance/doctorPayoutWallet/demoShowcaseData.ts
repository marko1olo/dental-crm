/**
 * demoShowcaseData.ts — Реэкспорт демо-врачей и сводный отчет для Showcase / Demo Mode.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutReport, DoctorPayoutRow } from "./types.js";
import { DEMO_DOCTOR_VISITS } from "./demoDoctorVisits.js";
import { DEMO_SHOWCASE_SOLO_DOCTOR } from "./demoSoloDoctorData.js";

export const DEMO_SHOWCASE_DOCTOR: DoctorPayoutRow = {
	doctorUserId: "demo_doc_smirnova",
	doctorName: "Д-р Смирнова А. В.",
	role: "Стоматолог-терапевт",
	isActive: true,
	revenueRub: 184000,
	paymentCount: 14,
	materialCostRub: 0,
	materialMovements: 0,
	materialMovementsUnpriced: 0,
	materialsState: "counted",
	labCostRub: 0,
	labOrdersCount: 0,
	withheldLabRub: 0,
	commissionPct: 30,
	materialDeductionPct: 0,
	labDeductionPct: 0,
	rateEffectiveFrom: "2026-01-01",
	rateRowCount: 1,
	state: "computed",
	accruedRub: 55200,
	withheldMaterialRub: 0,
	payoutRub: 55200,
	note: "Сдельная оплата 30% от фактически оплаченных терапевтических услуг (184 000 ₽)",
	visits: DEMO_DOCTOR_VISITS as any,
	labOrders: [],
};

export { DEMO_SHOWCASE_SOLO_DOCTOR };

export const DEMO_SHOWCASE_REPORT: DoctorPayoutReport = {
	scope: "all",
	period: { from: "2026-10-01", to: "2026-10-31" },
	rows: [DEMO_SHOWCASE_DOCTOR, DEMO_SHOWCASE_SOLO_DOCTOR],
	totals: {
		revenueRub: 504000,
		paymentCount: 18,
		attributableRevenueRub: 504000,
		unattributedRevenueRub: 0,
		materialCostRub: 0,
		labCostRub: 45000,
		accruedRub: 247700,
		withheldMaterialRub: 0,
		withheldLabRub: 45000,
		payoutRub: 247700,
		doctorsCounted: 2,
		doctorsWithoutRate: 0,
	},
	methodNote: "Сдельная оплата по фактически оплаченным услугам за вычетом ЗТЛ (Мандат 8n).",
	limitations: [],
	isEmpty: false,
};
