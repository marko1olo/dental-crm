/**
 * demoShowcaseData.ts — Реэкспорт демо-врачей и сводный отчет для Showcase / Demo Mode.
 * Mandate 8b: строго <= 120 строк на файл.
 */

import type { DoctorPayoutReport } from "../../../pages/payoutDashboard/types.js";
import { DEMO_SHOWCASE_DOCTOR } from "./demoDoctorData.js";
import { DEMO_SHOWCASE_SOLO_DOCTOR } from "./demoSoloDoctorData.js";

export { DEMO_SHOWCASE_DOCTOR } from "./demoDoctorData.js";
export { DEMO_SHOWCASE_SOLO_DOCTOR } from "./demoSoloDoctorData.js";

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
