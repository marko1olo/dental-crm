/**
 * statutoryRegistryGenerator.ts — Генератор реестра оказанных услуг по ДМС
 */

import { DEFAULT_CLINIC_LEGAL_INFO } from "../dmsInsuranceEngine.js";
import { getStatutoryInsurerById } from "../dmsInsurancePresets.js";
import type { DmsRegistryGenerationPayload, DmsStatutoryRegistry } from "./types.js";

export function generateDmsStatutoryRegistry(
	payload: DmsRegistryGenerationPayload,
): DmsStatutoryRegistry {
	const clinic = payload.clinicInfo ?? DEFAULT_CLINIC_LEGAL_INFO;
	const insurer =
		getStatutoryInsurerById(payload.insurerId) ??
		getStatutoryInsurerById("sogaz")!;

	const uniquePatients = new Set(payload.visitServices.map((v) => v.patientFullName));

	let grandTotalBillKopecks = 0;
	let grandTotalDmsKopecks = 0;
	let grandTotalPatientKopecks = 0;

	for (const item of payload.visitServices) {
		grandTotalBillKopecks += item.totalBillKopecks;
		grandTotalDmsKopecks += item.dmsAcceptedKopecks;
		grandTotalPatientKopecks += item.patientPaidKopecks;
	}

	return {
		registryNumber: payload.registryNumber,
		creationDate: new Date().toISOString().slice(0, 10),
		periodStart: payload.periodStart,
		periodEnd: payload.periodEnd,
		insurer,
		clinicInfo: clinic,
		items: payload.visitServices,
		totalVisitsCount: payload.visitServices.length,
		uniquePatientsCount: uniquePatients.size,
		grandTotalBillKopecks,
		grandTotalDmsKopecks,
		grandTotalPatientKopecks,
	};
}
