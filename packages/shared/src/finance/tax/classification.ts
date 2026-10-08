/**
 * DENTE Dental CRM — Tax Deduction Engine (Classification: Nomenclature 804n & Decree 458)
 * Classifies medical services into Code 01 (standard) and Code 02 (expensive treatment).
 */

import { ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024, EXPENSIVE_TREATMENT_804N_CODES } from "./constants.js";

/**
 * Определение кода медицинской услуги для налогового вычета (Код 01 vs Код 02)
 * по Номенклатуре Минздрава 804н и клиническому наименованию процедуры.
 */
export function resolveTaxDeductionCategoryShared(code804n?: string, serviceName?: string): "1" | "2" {
	if (code804n) {
		const trimmedCode = code804n.trim();
		if (EXPENSIVE_TREATMENT_804N_CODES.includes(trimmedCode)) {
			return "2";
		}
		// Проверка по префиксам имплантации/костной пластики/остеопластики
		if (
			trimmedCode.startsWith("A16.07.054") ||
			trimmedCode.startsWith("A16.07.041") ||
			trimmedCode.startsWith("A16.07.055") ||
			trimmedCode.startsWith("A16.07.096") ||
			trimmedCode.startsWith("A16.07.040")
		) {
			return "2";
		}
	}

	if (serviceName) {
		const lower = serviceName.toLowerCase();
		if (
			lower.includes("имплант") ||
			lower.includes("имплантат") ||
			lower.includes("имплантац") ||
			lower.includes("синус-лифтинг") ||
			lower.includes("синуслифтинг") ||
			lower.includes("субантральн") ||
			lower.includes("костная пластика") ||
			lower.includes("костной пластик") ||
			lower.includes("остеопластик") ||
			lower.includes("остеотоми") ||
			lower.includes("остеосинтез") ||
			lower.includes("аугментация") ||
			lower.includes("аугментаци") ||
			lower.includes("расщепление гребня") ||
			lower.includes("расщепление альвеолярного") ||
			lower.includes("реконструкция челюсти") ||
			lower.includes("реконструктивные операции") ||
			lower.includes("костный трансплантат") ||
			lower.includes("костный блок") ||
			lower.includes("костный материал") ||
			lower.includes("костная ткань") ||
			lower.includes("костная регенерация") ||
			lower.includes("нкр") ||
			lower.includes("мембрана bio-gide") ||
			lower.includes("bio-oss") ||
			lower.includes("био-осс") ||
			lower.includes("титановая сетка") ||
			lower.includes("титановая мембрана") ||
			lower.includes("коллагеновая мембрана") ||
			lower.includes("all-on-4") ||
			lower.includes("all-on-6") ||
			lower.includes("all-on-x") ||
			lower.includes("all on 4") ||
			lower.includes("all on 6") ||
			lower.includes("all on x") ||
			lower.includes("trefoil") ||
			lower.includes("zygoma") ||
			lower.includes("зигома") ||
			lower.includes("скулов") ||
			lower.includes("мультиюнит") ||
			lower.includes("multi-unit") ||
			lower.includes("multiunit") ||
			lower.includes("протезирование на имплант") ||
			lower.includes("протез на имплант") ||
			lower.includes("коронка на имплант") ||
			lower.includes("балочный протез")
		) {
			return "2";
		}
	}

	return "1";
}

/**
 * Классификация стоматологической услуги по Номенклатуре 804н и ст. 219 НК РФ:
 * Код 02: Дорогостоящее лечение (имплантация, синус-лифтинг, костная пластика)
 * Код 01: Стандартное лечение (терапия кариеса, пульпит, ортодонтия, гигиена).
 */
export function classifyTaxDeduction804n(code804n?: string, serviceName?: string): {
	categoryCode: "1" | "2";
	categoryNameRu: string;
	isExpensiveTreatment: boolean;
	hasAnnualLimit: boolean;
	statutoryLimitRub: number;
} {
	const code = resolveTaxDeductionCategoryShared(code804n, serviceName);
	if (code === "2") {
		return {
			categoryCode: "2",
			categoryNameRu: "Дорогостоящее лечение (дентальная имплантация, синус-лифтинг, костная пластика)",
			isExpensiveTreatment: true,
			hasAnnualLimit: false,
			statutoryLimitRub: Number.POSITIVE_INFINITY,
		};
	}
	return {
		categoryCode: "1",
		categoryNameRu: "Медицинские услуги (терапия кариеса, пульпит, ортодонтия, гигиена)",
		isExpensiveTreatment: false,
		hasAnnualLimit: true,
		statutoryLimitRub: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
	};
}
