/**
 * registryTotals.ts — Расчет сводных итогов реестра оказанных услуг ДМС
 */

import { kopecksToRub, rubToKopecks } from "./currencyMath.js";
import type { DmsRegistryServiceRecord, DmsRegistrySummary } from "./types.js";

export function calculateRegistryTotals(
	records: readonly DmsRegistryServiceRecord[],
	insurerName: string = "Все страховые компании",
	periodStart: string = "",
	periodEnd: string = "",
): DmsRegistrySummary {
	let totalAmountKop = 0;
	let totalDmsCoveredKop = 0;
	let totalPatientPaidKop = 0;
	const patientIds = new Set<string>();

	for (const r of records) {
		const amountKop = rubToKopecks(r.totalPriceRub);
		const dmsKop = rubToKopecks(r.dmsCoveredRub);
		const patientKop = rubToKopecks(r.patientPaidRub);

		totalAmountKop += amountKop;
		totalDmsCoveredKop += dmsKop;
		totalPatientPaidKop += patientKop;
		if (r.patientId) patientIds.add(r.patientId);
	}

	const isBalanced = totalDmsCoveredKop + totalPatientPaidKop === totalAmountKop;

	return {
		totalServicesCount: records.length,
		totalAmountRub: kopecksToRub(totalAmountKop),
		totalDmsCoveredRub: kopecksToRub(totalDmsCoveredKop),
		totalPatientPaidRub: kopecksToRub(totalPatientPaidKop),
		uniquePatientsCount: patientIds.size,
		periodStart,
		periodEnd,
		insurerName,
		isBalanced,
	};
}
