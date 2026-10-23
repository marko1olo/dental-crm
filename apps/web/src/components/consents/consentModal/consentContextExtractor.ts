import { sanitizeConsentContext } from "../consentSummaryHelper.js";
import { getBlankConsentSubstitutionContext } from "../consentTemplates.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { InformedConsentModalProps, ConsentSubstitutionContext } from "./types.js";

export function buildConsentSubstitutionContext(
	props: InformedConsentModalProps,
	customDiagnosis: string,
	customTeeth: string,
): ConsentSubstitutionContext {
	const isDemo = isDemoShowcaseMode();
	const {
		patient,
		doctorName,
		doctorSpecialty,
		clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicLegalName = "ООО «Стоматологическая клиника ДЕНТЕ»",
		clinicAddress,
		clinicOgrn,
		licenseNumber,
		diagnosisIcd,
		toothNumbers,
	} = props;

	return sanitizeConsentContext({
		patientName: patient?.fullName || null,
		birthDate: patient?.birthDate || null,
		passport: patient?.passport || null,
		doctorName: doctorName || (doctorSpecialty ? `Врач-стоматолог (${doctorSpecialty})` : null),
		clinicName: clinicName || clinicLegalName,
		clinicLegalName: clinicLegalName || clinicName,
		clinicAddress: clinicAddress || (isDemo ? "г. Москва, ул. Клиническая, д. 10" : "«________________________________________»"),
		clinicOgrn: clinicOgrn || (isDemo ? "1217700123456" : "«________________»"),
		licenseNumber: licenseNumber || (isDemo ? "ЛО41-01137-77/00123456" : "«________________________________________»"),
		diagnosisIcd: customDiagnosis || diagnosisIcd || (isDemo ? "K02.1 Кариес дентина" : ""),
		toothNumbers: customTeeth || toothNumbers || (isDemo ? "1.6, 1.7" : ""),
		date: new Date().toLocaleDateString("ru-RU"),
		snils: patient?.snils || null,
		phone: patient?.phone || null,
	});
}

export function buildConsentBlankContext(props: InformedConsentModalProps): ConsentSubstitutionContext {
	return getBlankConsentSubstitutionContext({
		clinicName: props.clinicName ?? null,
		clinicLegalName: props.clinicLegalName ?? null,
		clinicAddress: props.clinicAddress ?? null,
		clinicOgrn: props.clinicOgrn ?? null,
		licenseNumber: props.licenseNumber ?? null,
	});
}
