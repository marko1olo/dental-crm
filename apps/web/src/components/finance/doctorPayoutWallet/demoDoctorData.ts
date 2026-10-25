/**
 * demoDoctorData.ts — Демо-данные врача-терапевта для витрины сдельной оплаты.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutRow } from "../../../pages/payoutDashboard/types.js";
import { DEMO_DOCTOR_VISITS } from "./demoDoctorVisits.js";

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
