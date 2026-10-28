import type { Kopecks } from "../../utils/money.js";
import { kopecksToNumericString } from "../../utils/money.js";
import { amountToWordsRu } from "../../finance/taxDeduction.js";
import type { DmsRegistryRecord, DmsRegistryTotals } from "./registryTypes.js";

/**
 * Calculates aggregated totals for the DMS claim registry with exact kopeck math.
 */
export function calculateDmsRegistryTotals(
	records: readonly DmsRegistryRecord[],
): DmsRegistryTotals {
	let totalGross = 0;
	let totalPatient = 0;
	let totalInsurer = 0;
	const uniquePatients = new Set<string>();

	for (const rec of records) {
		totalGross += rec.totalGrossKopecks;
		totalPatient += rec.patientPaidKopecks;
		totalInsurer += rec.insurerClaimKopecks;
		uniquePatients.add(rec.patientFullName.trim().toLowerCase() + "_" + rec.policyNumber.trim());
	}

	return {
		totalRecordsCount: records.length,
		uniquePatientsCount: uniquePatients.size,
		totalGrossKopecks: totalGross,
		totalPatientPaidKopecks: totalPatient,
		totalInsurerClaimKopecks: totalInsurer,
		totalGrossRub: kopecksToNumericString(totalGross),
		totalPatientPaidRub: kopecksToNumericString(totalPatient),
		totalInsurerClaimRub: kopecksToNumericString(totalInsurer),
		totalInsurerClaimInWordsRu: amountToWordsRu(totalInsurer),
	};
}
