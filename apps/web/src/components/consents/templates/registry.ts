import type {
  ConsentTemplateKey,
  ConsentTemplate,
  ConsentPackageKey,
  ConsentPackageDefinition,
} from './types';
import {
  CONSENT_THERAPY,
  CONSENT_SURGERY_IMPLANT,
  CONSENT_ORTHODONTICS,
  CONSENT_ORTHOPEDICS,
  CONSENT_HYGIENE_BLEACHING,
  CONSENT_ANESTHESIA,
} from './clinicalTemplates';
import {
  CONSENT_PERSONAL_DATA,
  CONSENT_INSPECTION_1051N,
  CONSENT_PEDIATRIC,
} from './statutoryTemplates';

/**
 * Словарь всех стандартных согласий
 */
export const CONSENT_TEMPLATES: Record<ConsentTemplateKey, ConsentTemplate> = {
	CONSENT_PERSONAL_DATA,
	CONSENT_INSPECTION_1051N,
	CONSENT_ANESTHESIA,
	CONSENT_THERAPY,
	CONSENT_SURGERY_IMPLANT,
	CONSENT_ORTHODONTICS,
	CONSENT_ORTHOPEDICS,
	CONSENT_HYGIENE_BLEACHING,
	CONSENT_PEDIATRIC,
};

/**
 * ============================================================================
 * ПАКЕТЫ СОГЛАСИЙ ИДС (1-КЛИК ПАКЕТНОЕ ПОДПИСАНИЕ И ПЕЧАТЬ — МАНДАТЫ 8e, 8k, 8n)
 * Ликвидация бюрократического трения: одна подпись пациента / 1 код SMS OTP
 * подтверждает весь комплекс документов при первичном приеме или операции!
 * ============================================================================
 */

export const CONSENT_PACKAGES: Record<ConsentPackageKey, ConsentPackageDefinition> = {
	PACKAGE_PRIMARY_VISIT: {
		key: "PACKAGE_PRIMARY_VISIT",
		code: "ПАКЕТ-ПЕРВИЧНЫЙ",
		title: "Пакет: Первичный приём",
		shortTitle: "Первичный приём",
		subtitle: "Персональные данные + Осмотр и диагностика + Местная анестезия + Терапия",
		templateKeys: [
			"CONSENT_PERSONAL_DATA",
			"CONSENT_INSPECTION_1051N",
			"CONSENT_ANESTHESIA",
			"CONSENT_THERAPY",
		],
		description: "Обязательный первичный комплекс при первом визите взрослого пациента в клинику (4 документа за 1 подпись)",
	},
	PACKAGE_SURGERY: {
		key: "PACKAGE_SURGERY",
		code: "ПАКЕТ-ХИРУРГИЯ",
		title: "Пакет: Хирургия и имплантация",
		shortTitle: "Хирургия / Имплантация",
		subtitle: "Персональные данные + Местная анестезия + Хирургическое вмешательство / Имплантация",
		templateKeys: [
			"CONSENT_PERSONAL_DATA",
			"CONSENT_ANESTHESIA",
			"CONSENT_SURGERY_IMPLANT",
		],
		description: "Хирургический комплекс перед операциями удаления, костной пластики и имплантации (3 документа за 1 подпись)",
	},
	PACKAGE_ORTHOPEDICS: {
		key: "PACKAGE_ORTHOPEDICS",
		code: "ПАКЕТ-ОРТОПЕДИЯ",
		title: "Пакет: Ортопедия",
		shortTitle: "Ортопедия / Протезирование",
		subtitle: "Персональные данные + Местная анестезия + Ортопедическое лечение",
		templateKeys: [
			"CONSENT_PERSONAL_DATA",
			"CONSENT_ANESTHESIA",
			"CONSENT_ORTHOPEDICS",
		],
		description: "Ортопедический комплекс перед препарированием, слепками и фиксацией коронок (3 документа за 1 подпись)",
	},
};

/**
 * Получить список всех пакетов согласий
 */
export function getAllConsentPackages(): ConsentPackageDefinition[] {
	return Object.values(CONSENT_PACKAGES);
}

/**
 * Получить пакет согласий по ключу
 */
export function getConsentPackage(key: ConsentPackageKey): ConsentPackageDefinition {
	const pkg = CONSENT_PACKAGES[key];
	if (!pkg) {
		throw new Error(`Неизвестный ключ пакета согласий: ${key}`);
	}
	return pkg;
}

/**
 * Получить список всех шаблонов в каталоге
 */
export function getAllConsentTemplates(): ConsentTemplate[] {
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

export const PACKAGE_SHORT_TITLES: Record<ConsentPackageKey, string> = {
	PACKAGE_PRIMARY_VISIT: "Пакет: Первичный приём (4 док.)",
	PACKAGE_SURGERY: "Пакет: Хирургия (3 док.)",
	PACKAGE_ORTHOPEDICS: "Пакет: Ортопедия (3 док.)",
};

export const TEMPLATE_SHORT_TITLES: Record<ConsentTemplateKey, string> = {
	CONSENT_THERAPY: "Терапия и Эндодонтия",
	CONSENT_SURGERY_IMPLANT: "Хирургия / Имплантация",
	CONSENT_ORTHODONTICS: "Ортодонтия (Брекеты)",
	CONSENT_ORTHOPEDICS: "Ортопедия (Коронки)",
	CONSENT_HYGIENE_BLEACHING: "Профгигиена и отбеливание",
	CONSENT_ANESTHESIA: "Местная анестезия",
	CONSENT_PERSONAL_DATA: "Защита персональных данных",
	CONSENT_INSPECTION_1051N: "Информированное согласие (ИДС)",
	CONSENT_PEDIATRIC: "Детская стоматология (до 15 лет)",
};

