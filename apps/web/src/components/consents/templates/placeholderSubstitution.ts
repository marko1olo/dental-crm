import type { ConsentSubstitutionContext, ConsentTemplate } from "./types";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";

/**
 * Движок динамической подстановки плейсхолдеров
 */
export function substitutePlaceholders(
	rawText: string,
	context: ConsentSubstitutionContext,
): string {
	if (!rawText) return "";

	const defaultDate = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

	const isMinor =
		(typeof context.patientAgeYears === "number" && context.patientAgeYears < 15) ||
		(Boolean(context.guardianName?.trim()) && context.guardianName !== "________________________");

	let result = rawText;

	if (isMinor) {
		const repName = context.guardianName?.trim() || "________________________";
		const repRel = context.guardianRelation?.trim() || "мать / отец / опекун";
		const repDoc = context.guardianDocument?.trim() || "паспорт серия ______ № ________";
		const childName = context.patientName?.trim() || "________________________________________";
		const childBirth = context.birthDate?.trim() || "«___» _________ _____ г.";
		const childDoc = context.passport?.trim() || "св-во о рождении / паспорт серия ______ № ________";

		result = result.replace(
			/Настоящим я, \{\{PATIENT_NAME\}\}, дата рождения \{\{BIRTH_DATE\}\} \(документ, удостоверяющий личность: \{\{PASSPORT\}\}\), действуя добровольно и находясь в здравом уме/g,
			`Настоящим я, ${repName} (статус / родство: ${repRel}, документ: ${repDoc}), действуя в качестве законного представителя несовершеннолетнего ${childName}, дата рождения ${childBirth} (документ: ${childDoc}), находясь в здравом уме`,
		);

		result = result.replace(
			/Я, \{\{PATIENT_NAME\}\}, дата рождения \{\{BIRTH_DATE\}\}, документ, удостоверяющий личность: \{\{PASSPORT\}\}/g,
			`Я, ${repName} (статус / родство: ${repRel}, документ: ${repDoc}), являясь законным представителем несовершеннолетнего ${childName}, дата рождения ${childBirth} (документ ребенка: ${childDoc})`,
		);
	}

	const isDemo = isDemoShowcaseMode();
	const map: Record<string, string> = {
		"{{PATIENT_NAME}}": context.patientName?.trim() || "________________________________________",
		"{{BIRTH_DATE}}": context.birthDate?.trim() || "«___» _________ _____ г.",
		"{{PASSPORT}}": context.passport?.trim() || "серия ______ № ________ выдан ____________________",
		"{{DOCTOR_NAME}}": context.doctorName?.trim() || "________________________",
		"{{CLINIC_NAME}}": context.clinicName?.trim() || context.clinicLegalName?.trim() || (isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		"{{CLINIC_LEGAL_NAME}}": context.clinicLegalName?.trim() || context.clinicName?.trim() || (isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
		"{{CLINIC_ADDRESS}}": context.clinicAddress?.trim() || (isDemo ? "г. Москва, ул. Большая Стоматологическая, д. 12" : "«________________________________________»"),
		"{{CLINIC_OGRN}}": context.clinicOgrn?.trim() || (isDemo ? "1217700123456" : "«________________»"),
		"{{LICENSE_NUMBER}}": context.licenseNumber?.trim() || (isDemo ? "ЛО41-01137-77/00368421" : "«________________________________________»"),
		"{{DIAGNOSIS_ICD}}": context.diagnosisIcd?.trim() || (isDemo ? "Первичный осмотр и консультация" : "________________________________________"),
		"{{TOOTH_NUMBERS}}": context.toothNumbers?.trim() || (isDemo ? "Полость рта (зубной ряд)" : "________________________"),
		"{{DATE}}": context.date?.trim() || defaultDate,
		"{{SNILS}}": context.snils?.trim() || "____________________",
		"{{PATIENT_PHONE}}": context.phone?.trim() || "+7 (____) ____-____",
		"{{GUARDIAN_NAME}}": context.guardianName?.trim() || "________________________",
		"{{GUARDIAN_RELATION}}": context.guardianRelation?.trim() || "мать / отец / опекун",
		"{{GUARDIAN_DOCUMENT}}": context.guardianDocument?.trim() || "паспорт серия ______ № ________ выдан ____________________",
		"{{GUARDIAN_PHONE}}": context.guardianPhone?.trim() || context.phone?.trim() || "+7 (____) ____-____",
	};

	for (const [placeholder, value] of Object.entries(map)) {
		result = result.replaceAll(placeholder, value);
	}
	return result;
}

/**
 * Проверка пропущенных обязательных плейсхолдеров
 */
export function getMissingRequiredPlaceholders(
	template: ConsentTemplate,
	context: ConsentSubstitutionContext,
): string[] {
	const missing: string[] = [];
	for (const placeholder of template.mandatoryPlaceholders) {
		switch (placeholder) {
			case "{{PATIENT_NAME}}":
				if (!context.patientName?.trim()) missing.push("Ф.И.О. пациента");
				break;
			case "{{BIRTH_DATE}}":
				if (!context.birthDate?.trim()) missing.push("Дата рождения пациента");
				break;
			case "{{DOCTOR_NAME}}":
				if (!context.doctorName?.trim()) missing.push("Ф.И.О. лечащего врача");
				break;
			case "{{CLINIC_NAME}}":
				if (!context.clinicName?.trim() && !context.clinicLegalName?.trim())
					missing.push("Наименование клиники");
				break;
			case "{{DIAGNOSIS_ICD}}":
				if (!context.diagnosisIcd?.trim()) missing.push("Диагноз по МКБ-10");
				break;
			case "{{TOOTH_NUMBERS}}":
				if (!context.toothNumbers?.trim()) missing.push("Номера зубов / область");
				break;
			case "{{GUARDIAN_NAME}}":
				if (!context.guardianName?.trim()) missing.push("Ф.И.О. законного представителя");
				break;
			case "{{GUARDIAN_RELATION}}":
				if (!context.guardianRelation?.trim()) missing.push("Статус / родство законного представителя");
				break;
			case "{{GUARDIAN_DOCUMENT}}":
				if (!context.guardianDocument?.trim()) missing.push("Документ законного представителя");
				break;
		}
	}
	return missing;
}
