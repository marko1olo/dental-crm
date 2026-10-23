import type {
	ConsentTemplateKey,
	ConsentTemplate,
} from "./types";
import {
	CONSENT_THERAPY,
	CONSENT_SURGERY_IMPLANT,
	CONSENT_ORTHODONTICS,
	CONSENT_ORTHOPEDICS,
	CONSENT_HYGIENE_BLEACHING,
	CONSENT_ANESTHESIA,
} from "./clinicalTemplates";
import {
	CONSENT_PERSONAL_DATA,
	CONSENT_INSPECTION_1051N,
	CONSENT_PEDIATRIC,
	CONSENT_EGISZ_REFUSAL,
	CONSENT_TREATMENT_REFUSAL,
	CONSENT_WARRANTY_PASSPORT,
	CONSENT_WARRANTY_POLICY,
	CONSENT_SEDATION,
	CONSENT_PHOTOPROTOCOL,
	CONSENT_HEALTH_QUESTIONNAIRE,
} from "./statutoryTemplates";
import {
	CONSENT_TEMPLATES,
	TEMPLATE_SHORT_TITLES,
} from "./templateDictionary";

export {
	CONSENT_PACKAGES,
	getAllConsentPackages,
	getConsentPackage,
	PACKAGE_SHORT_TITLES,
} from "./packagesRegistry";

export {
	CONSENT_TEMPLATES,
	TEMPLATE_SHORT_TITLES,
} from "./templateDictionary";

/**
 * Получить список всех шаблонов в каталоге.
 * @param includeExtended Если true — возвращает все шаблоны (включая расширенные регламенты).
 * По умолчанию false для строгой обратной совместимости с тестами 9 базовых статутных согласий.
 */
export function getAllConsentTemplates(includeExtended = false): ConsentTemplate[] {
	if (!includeExtended) {
		return [
			CONSENT_PERSONAL_DATA,
			CONSENT_INSPECTION_1051N,
			CONSENT_ANESTHESIA,
			CONSENT_THERAPY,
			CONSENT_SURGERY_IMPLANT,
			CONSENT_ORTHODONTICS,
			CONSENT_ORTHOPEDICS,
			CONSENT_HYGIENE_BLEACHING,
			CONSENT_PEDIATRIC,
		];
	}
	return [
		CONSENT_PERSONAL_DATA,
		CONSENT_INSPECTION_1051N,
		CONSENT_ANESTHESIA,
		CONSENT_THERAPY,
		CONSENT_SURGERY_IMPLANT,
		CONSENT_ORTHODONTICS,
		CONSENT_ORTHOPEDICS,
		CONSENT_HYGIENE_BLEACHING,
		CONSENT_PEDIATRIC,
		CONSENT_EGISZ_REFUSAL,
		CONSENT_TREATMENT_REFUSAL,
		CONSENT_WARRANTY_PASSPORT,
		CONSENT_WARRANTY_POLICY,
		CONSENT_SEDATION,
		CONSENT_PHOTOPROTOCOL,
		CONSENT_HEALTH_QUESTIONNAIRE,
	];
}

/**
 * Получить абсолютно все доступные шаблоны (все зарегистрированные шт.)
 */
export function getAllAvailableConsentTemplates(): ConsentTemplate[] {
	return Object.values(CONSENT_TEMPLATES);
}

/**
 * Получить шаблон по ключу
 */
export function getConsentTemplate(key: ConsentTemplateKey): ConsentTemplate {
	const template = CONSENT_TEMPLATES[key];
	if (!template) {
		throw new Error(`Неизвестный ключ шаблона согласия: ${key}`);
	}
	return template;
}
