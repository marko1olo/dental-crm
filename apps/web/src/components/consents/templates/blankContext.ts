import type { ConsentSubstitutionContext } from "./types";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";

/**
 * Контекст чистого бланка со строками «________» для ручного заполнения пациентом на бумаге до приема
 */
export function getBlankConsentSubstitutionContext(
	clinicDefaults?: Partial<ConsentSubstitutionContext>,
): ConsentSubstitutionContext {
	const isDemo = isDemoShowcaseMode();
	return {
		patientName: "________________________________________",
		birthDate: "«___» _________ _____ г.",
		passport: "серия ______ № ________ выдан ____________________",
		doctorName: "________________________",
		clinicName:
			clinicDefaults?.clinicName ||
			clinicDefaults?.clinicLegalName ||
			(isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		clinicLegalName:
			clinicDefaults?.clinicLegalName ||
			clinicDefaults?.clinicName ||
			(isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		clinicAddress:
			clinicDefaults?.clinicAddress ||
			(isDemo ? "г. Москва, ул. Большая Стоматологическая, д. 12" : "«________________________________________»"),
		clinicOgrn: clinicDefaults?.clinicOgrn || (isDemo ? "1217700123456" : "«________________»"),
		licenseNumber: clinicDefaults?.licenseNumber || (isDemo ? "ЛО41-01137-77/00368421" : "«________________________________________»"),
		diagnosisIcd: "________________________________________",
		toothNumbers: "________________________",
		date: "«___» _________ 20___ г.",
		snils: "___-___-___ __",
		phone: "+7 (___) ___-__-__",
		guardianName: "________________________",
		guardianRelation: "мать / отец / опекун",
		guardianDocument: "паспорт серия ______ № ________ выдан ____________________",
		guardianPhone: "+7 (___) ___-__-__",
		patientAgeYears: undefined,
	};
}
