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
  CONSENT_SURGERY_EXTRACTION,
  CONSENT_IMPLANTOLOGY,
  CONSENT_SINUS_LIFT,
  CONSENT_OSTEOINTEGRATION_RISKS,
  CONSENT_ORTHO_HYGIENE,
} from './clinicalTemplates';
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
  CONSENT_PAID_CONTRACT,
} from './statutoryTemplates';

/**
 * Словарь всех стандартных согласий (9 базовых статутных + расширенные клинические)
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
	CONSENT_EGISZ_REFUSAL,
	CONSENT_TREATMENT_REFUSAL,
	CONSENT_WARRANTY_PASSPORT,
	CONSENT_WARRANTY_POLICY,
	CONSENT_SEDATION,
	CONSENT_PHOTOPROTOCOL,
	CONSENT_HEALTH_QUESTIONNAIRE,
	CONSENT_PAID_CONTRACT,
	CONSENT_SURGERY_EXTRACTION,
	CONSENT_IMPLANTOLOGY,
	CONSENT_SINUS_LIFT,
	CONSENT_OSTEOINTEGRATION_RISKS,
	CONSENT_ORTHO_HYGIENE,
};

/**
 * ============================================================================
 * ПАКЕТЫ СОГЛАСИЙ ИДС (1-КЛИК ПАКЕТНОЕ ПОДПИСАНИЕ И ПЕЧАТЬ — МАНДАТЫ 8e, 8k, 8n)
 * Ликвидация бюрократического трения: одна подпись пациента / 1 код SMS OTP
 * подтверждает весь комплекс документов при первичном приеме или операции!
 * 4 канонических пакета:
 * 1. Первичный стоматологический (Договор ПП РФ № 736 + 152-ФЗ + ИДС 1051н)
 * 2. Хирургический (ИДС на удаление зуба + Местная анестезия)
 * 3. Имплантологический (Дентальная имплантация + Синус-лифтинг + Риски остеоинтеграции)
 * 4. Ортодонтический (Брекеты/элайнеры + Регламент гигиены и диеты)
 * ============================================================================
 */

export const CONSENT_PACKAGES: Record<ConsentPackageKey, ConsentPackageDefinition> = {
	PACKAGE_PRIMARY_VISIT: {
		key: "PACKAGE_PRIMARY_VISIT",
		code: "ПАКЕТ-ПЕРВИЧНЫЙ",
		title: "Пакет первичного приёма",
		shortTitle: "Первичный приём",
		subtitle: "Согласие на медицинское вмешательство + Персональные данные + Местная анестезия",
		templateKeys: [
			"CONSENT_INSPECTION_1051N",
			"CONSENT_PERSONAL_DATA",
			"CONSENT_ANESTHESIA",
		],
		description: "Единый первичный комплект при первом визите пациента в клинику (3 документа за 1 подпись)",
	},
	PACKAGE_SURGERY: {
		key: "PACKAGE_SURGERY",
		code: "ПАКЕТ-ХИРУРГИЯ",
		title: "Хирургический пакет",
		shortTitle: "Хирургический пакет",
		subtitle: "ИДС на удаление зуба + ИДС на местную анестезию",
		templateKeys: [
			"CONSENT_SURGERY_EXTRACTION",
			"CONSENT_ANESTHESIA",
		],
		description: "Хирургический комплекс перед операциями простого и сложного удаления зубов (2 документа за 1 подпись)",
	},
	PACKAGE_IMPLANTOLOGY: {
		key: "PACKAGE_IMPLANTOLOGY",
		code: "ПАКЕТ-ИМПЛАНТАЦИЯ",
		title: "Имплантологический пакет",
		shortTitle: "Имплантологический пакет",
		subtitle: "ИДС на дентальную имплантацию + синус-лифтинг + согласие с рисками остеоинтеграции",
		templateKeys: [
			"CONSENT_IMPLANTOLOGY",
			"CONSENT_SINUS_LIFT",
			"CONSENT_OSTEOINTEGRATION_RISKS",
		],
		description: "Комплекс хирургической имплантации, аугментации и остеоинтеграции (3 документа за 1 подпись)",
	},
	PACKAGE_ORTHODONTICS: {
		key: "PACKAGE_ORTHODONTICS",
		code: "ПАКЕТ-ОРТОДОНТИЯ",
		title: "Ортодонтический пакет",
		shortTitle: "Ортодонтический пакет",
		subtitle: "ИДС на ортодонтическое лечение (брекеты/элайнеры) + Регламент гигиены и диеты",
		templateKeys: [
			"CONSENT_ORTHODONTICS",
			"CONSENT_ORTHO_HYGIENE",
		],
		description: "Ортодонтический комплекс перед установкой брекетов или выдачей элайнеров (2 документа за 1 подпись)",
	},
	PACKAGE_ORTHOPEDICS: {
		key: "PACKAGE_ORTHOPEDICS",
		code: "ПАКЕТ-ОРТОПЕДИЯ",
		title: "Ортопедический комплекс ИДС",
		shortTitle: "Ортопедический комплекс",
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

export const PACKAGE_SHORT_TITLES: Record<ConsentPackageKey, string> = {
	PACKAGE_PRIMARY_VISIT: "Первичный приём",
	PACKAGE_SURGERY: "Хирургический пакет",
	PACKAGE_IMPLANTOLOGY: "Имплантологический пакет",
	PACKAGE_ORTHODONTICS: "Ортодонтический пакет",
	PACKAGE_ORTHOPEDICS: "Ортопедический комплекс",
};

export const TEMPLATE_SHORT_TITLES: Record<ConsentTemplateKey, string> = {
	CONSENT_THERAPY: "Терапия и Эндодонтия",
	CONSENT_SURGERY_IMPLANT: "Хирургия / Имплантация",
	CONSENT_ORTHODONTICS: "Ортодонтия (Брекеты)",
	CONSENT_ORTHOPEDICS: "Ортопедия (Коронки)",
	CONSENT_HYGIENE_BLEACHING: "Профгигиена и отбеливание",
	CONSENT_ANESTHESIA: "Местная анестезия",
	CONSENT_PERSONAL_DATA: "Согласие на обработку данных",
	CONSENT_INSPECTION_1051N: "Согласие на осмотр и рентген",
	CONSENT_PEDIATRIC: "Детская стоматология (до 15 лет)",
	CONSENT_EGISZ_REFUSAL: "Отказ от передачи в ЕГИСЗ",
	CONSENT_TREATMENT_REFUSAL: "Отказ от медицинского вмешательства",
	CONSENT_WARRANTY_PASSPORT: "Гарантийный паспорт",
	CONSENT_WARRANTY_POLICY: "Положение о гарантиях",
	CONSENT_SEDATION: "Седация (ЗАКС / в/в)",
	CONSENT_PHOTOPROTOCOL: "Фотопротокол лечения",
	CONSENT_HEALTH_QUESTIONNAIRE: "Анкета здоровья (анамнез)",
	CONSENT_PAID_CONTRACT: "Договор платных услуг (№ 736)",
	CONSENT_SURGERY_EXTRACTION: "Удаление зуба (хирургия)",
	CONSENT_IMPLANTOLOGY: "Дентальная имплантация",
	CONSENT_SINUS_LIFT: "Синус-лифтинг и НКР",
	CONSENT_OSTEOINTEGRATION_RISKS: "Риски остеоинтеграции",
	CONSENT_ORTHO_HYGIENE: "Ортодонтическая гигиена",
};

