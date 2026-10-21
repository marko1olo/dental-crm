/**
 * registryBuilder.ts — Сборка сводного реестра оказанных услуг ДМС
 */

import { kopecksToRubles } from "@dental/shared";
import { getDmsInsurerById } from "../insuranceCatalogs.js";
import type { DmsReconciliationRegistry, DmsRegistryItem, DmsSplitLineResult } from "./types.js";

export function buildDmsReconciliationRegistry(params: {
	registryNumber: string;
	registryDate?: string | undefined;
	insurerId: string;
	clinicName?: string | undefined;
	clinicInn?: string | undefined;
	clinicOgrn?: string | undefined;
	periodStart: string;
	periodEnd: string;
	splitResults: readonly {
		patientFullName: string;
		policyNumber: string;
		guaranteeLetterNumber?: string | undefined;
		serviceDate: string;
		diagnosisIcd10?: string | undefined;
		lineItem: DmsSplitLineResult;
	}[];
}): DmsReconciliationRegistry {
	const insurer = getDmsInsurerById(params.insurerId) || {
		id: params.insurerId,
		key: params.insurerId,
		shortName: "Страховая компания ДМС",
		fullName: "Страховая компания",
		inn: "0000000000",
		ogrn: "0000000000000",
		phone: "8 (800) 000-00-00",
		email: "dms@insurance.ru",
		portalUrl: "https://insurance.ru",
		defaultClaimSlaHours: 24,
		supportedPrograms: ["base", "extended", "vip"] as const,
		standardTerms: "Стандартные условия",
	};

	const items: DmsRegistryItem[] = params.splitResults.map((r, index) => {
		const unitRub = kopecksToRubles(r.lineItem.unitPriceKopecks);
		return {
			itemIndex: index + 1,
			serviceDate: r.serviceDate,
			patientFullName: r.patientFullName,
			policyNumber: r.policyNumber,
			guaranteeLetterNumber: r.guaranteeLetterNumber,
			serviceCode: r.lineItem.serviceCode,
			serviceName: r.lineItem.serviceName,
			toothNumber: r.lineItem.toothNumber,
			diagnosisIcd10: r.diagnosisIcd10 || "K02.1",
			quantity: r.lineItem.quantity,
			unitPriceRubles: unitRub,
			totalAmountRubles: r.lineItem.totalKopecks / 100,
			dmsAcceptedAmountRubles: r.lineItem.insuranceCoveredKopecks / 100,
			patientPaidAmountRubles: r.lineItem.patientOutOfPocketKopecks / 100,
			taxRateVat: "exempt_149_nk_rf",
		};
	});

	const totalRegistryAmountRubles = items.reduce((acc, i) => acc + i.totalAmountRubles, 0);
	const totalDmsClaimedRubles = items.reduce((acc, i) => acc + i.dmsAcceptedAmountRubles, 0);
	const totalPatientCoPaymentRubles = items.reduce((acc, i) => acc + i.patientPaidAmountRubles, 0);
	const uniquePatients = new Set(items.map((i) => i.patientFullName)).size;

	return {
		registryNumber: params.registryNumber,
		registryDate: params.registryDate || new Date().toISOString().slice(0, 10),
		insurer,
		clinicName: params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicInn: params.clinicInn || "",
		clinicOgrn: params.clinicOgrn || "1027700123456",
		periodStart: params.periodStart,
		periodEnd: params.periodEnd,
		items,
		totalRegistryAmountRubles: Math.round(totalRegistryAmountRubles * 100) / 100,
		totalDmsClaimedRubles: Math.round(totalDmsClaimedRubles * 100) / 100,
		totalPatientCoPaymentRubles: Math.round(totalPatientCoPaymentRubles * 100) / 100,
		totalServicesCount: items.length,
		totalPatientsCount: uniquePatients,
	};
}
