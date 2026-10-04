import type {
  ConsentTemplate,
  ConsentTemplateKey,
  ConsentSubstitutionContext,
} from './types';
import { getConsentTemplate } from './registry';
import { isDemoShowcaseMode } from '../../../lib/demoMode.js';

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

	// Если пациент несовершеннолетний (< 15 лет по ст. 20 323-ФЗ) или указан законный представитель:
	// адаптируем преамбулу для подписания родителем / опекуном
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
 * Полный рендеринг шаблона согласия со всеми секциями
 */
export function renderConsentTemplate(
	template: ConsentTemplate,
	context: ConsentSubstitutionContext,
): {
	title: string;
	subtitle: string;
	statutoryBasis: string;
	renderedSections: { id: string; title: string; content: string; bullets?: string[] | undefined }[];
	aftercareInstructions: string[];
	riskFactors: string[];
	alternativeTreatments: string[];
	fullTextContent: string;
} {
	const renderedSections = template.sections.map((section) => ({
		id: section.id,
		title: substitutePlaceholders(section.title, context),
		content: substitutePlaceholders(section.content, context),
		bullets: section.bullets?.map((b) => substitutePlaceholders(b, context)),
	}));

	const aftercareInstructions = template.aftercareInstructions.map((i) =>
		substitutePlaceholders(i, context),
	);
	const riskFactors = template.riskFactors.map((r) =>
		substitutePlaceholders(r, context),
	);
	const alternativeTreatments = template.alternativeTreatments.map((a) =>
		substitutePlaceholders(a, context),
	);

	// Формируем сплошной текст документа для криптографического хеширования
	const lines: string[] = [];
	lines.push(template.title.toUpperCase());
	lines.push(template.subtitle);
	lines.push(`Нормативное основание: ${template.statutoryBasis}`);
	lines.push("----------------------------------------");

	for (const section of renderedSections) {
		lines.push(section.title);
		lines.push(section.content);
		if (section.bullets && section.bullets.length > 0) {
			for (const bullet of section.bullets) {
				lines.push(`  • ${bullet}`);
			}
		}
		lines.push("");
	}

	if (riskFactors.length > 0) {
		lines.push("СПЕЦИФИЧЕСКИЕ ФАКТОРЫ РИСКА:");
		for (const rf of riskFactors) {
			lines.push(`  - ${rf}`);
		}
		lines.push("");
	}

	if (aftercareInstructions.length > 0) {
		lines.push("РЕКОМЕНДАЦИИ И ОГРАНИЧЕНИЯ:");
		for (const ac of aftercareInstructions) {
			lines.push(`  - ${ac}`);
		}
		lines.push("");
	}

	lines.push(`Дата подписания: ${context.date || new Date().toLocaleDateString("ru-RU")}`);
	lines.push(`Пациент: ${context.patientName || "[ФИО]"}`);
	lines.push(`Врач: ${context.doctorName || "[ФИО]"}`);

	const fullTextContent = lines.join("\n");

	return {
		title: template.title,
		subtitle: template.subtitle,
		statutoryBasis: template.statutoryBasis,
		renderedSections,
		aftercareInstructions,
		riskFactors,
		alternativeTreatments,
		fullTextContent,
	};
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
