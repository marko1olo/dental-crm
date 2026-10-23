import type {
	ConsentPackageKey,
	ConsentPackageDefinition,
} from "./types";

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

export function getAllConsentPackages(): ConsentPackageDefinition[] {
	return Object.values(CONSENT_PACKAGES);
}

export function getConsentPackage(key: ConsentPackageKey): ConsentPackageDefinition {
	const pkg = CONSENT_PACKAGES[key];
	if (!pkg) {
		throw new Error(`Неизвестный ключ пакета согласий: ${key}`);
	}
	return pkg;
}

export const PACKAGE_SHORT_TITLES: Record<ConsentPackageKey, string> = {
	PACKAGE_PRIMARY_VISIT: "Первичный приём",
	PACKAGE_SURGERY: "Хирургический пакет",
	PACKAGE_IMPLANTOLOGY: "Имплантологический пакет",
	PACKAGE_ORTHODONTICS: "Ортодонтический пакет",
	PACKAGE_ORTHOPEDICS: "Ортопедический комплекс",
};
