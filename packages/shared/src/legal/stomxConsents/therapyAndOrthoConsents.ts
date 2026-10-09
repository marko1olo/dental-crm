import type { StomxLegalConsentTemplateMetadata } from "./types.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * STOMX THERAPY, ORTHOPEDICS & HYGIENE CONSENTS (LAYER 1)
 *
 * Специализированные ИДС StomX по терапевтической стоматологии, лечению кариеса,
 * эндодонтии, пародонтологии, профгигиене, отбеливанию, несъемному и съемному протезированию.
 * Нормативная база: 323-ФЗ ст. 19-23, Приказ Минздрава РФ № 1051н, ПП РФ № 736.
 * ══════════════════════════════════════════════════════════════════════════════
 */

export const STOMX_CONSENT_VENEERS: StomxLegalConsentTemplateMetadata = {
	id: 58,
	systemAlias: "ids_viniry",
	name: "ИДС Виниры",
	procedureType: "veneers",
	category: "prosthetics",
	categoryLabel: "Ортопедия и эстетика",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
};

export const STOMX_CONSENT_FIXED_PROSTHETICS: StomxLegalConsentTemplateMetadata = {
	id: 63,
	systemAlias: "ids_nesemnye_ortopedicheskie",
	name: "ИДС Несъемные ортопедические конструкции",
	procedureType: "fixed_prosthetics",
	category: "prosthetics",
	categoryLabel: "Ортопедическая стоматология",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зубы", "Прием.Дата"],
};

export const STOMX_CONSENT_REMOVABLE_PROSTHETICS: StomxLegalConsentTemplateMetadata = {
	id: 74,
	systemAlias: "ids_semnye_ortopedicheskie",
	name: "ИДС Съемные ортопедические конструкции",
	procedureType: "removable_prosthetics",
	category: "prosthetics",
	categoryLabel: "Ортопедическая стоматология",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
};

export const STOMX_CONSENT_DEEP_CARIES: StomxLegalConsentTemplateMetadata = {
	id: 59,
	systemAlias: "ids_glubokiy_karies",
	name: "ИДС Глубокий кариес",
	procedureType: "deep_caries",
	category: "therapy",
	categoryLabel: "Терапия и кариес",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
};

export const STOMX_CONSENT_SUPERFICIAL_MEDIUM_CARIES: StomxLegalConsentTemplateMetadata = {
	id: 61,
	systemAlias: "ids_poverhnostnyy_sredniy_karies",
	name: "ИДС Поверхностный и средний кариес",
	procedureType: "superficial_medium_caries",
	category: "therapy",
	categoryLabel: "Терапия и кариес",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
};

export const STOMX_CONSENT_PULPITIS_ENDODONTICS: StomxLegalConsentTemplateMetadata = {
	id: 70,
	systemAlias: "ids_pulpit_endodontiya",
	name: "ИДС Пульпит и эндодонтия",
	procedureType: "pulpitis_endodontics",
	category: "therapy",
	categoryLabel: "Эндодонтия и пульпит",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
};

export const STOMX_CONSENT_PERIODONTOLOGY: StomxLegalConsentTemplateMetadata = {
	id: 68,
	systemAlias: "ids_parodontologiya",
	name: "ИДС Пародонтология",
	procedureType: "periodontology",
	category: "periodontics",
	categoryLabel: "Пародонтология",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
};

export const STOMX_CONSENT_PROFESSIONAL_HYGIENE: StomxLegalConsentTemplateMetadata = {
	id: 69,
	systemAlias: "ids_prof_gigiena",
	name: "ИДС Профессиональная гигиена",
	procedureType: "professional_hygiene",
	category: "hygiene",
	categoryLabel: "Гигиена и профилактика",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
};

export const STOMX_CONSENT_TEETH_WHITENING: StomxLegalConsentTemplateMetadata = {
	id: 67,
	systemAlias: "ids_otbelivanie",
	name: "ИДС Отбеливание зубов",
	procedureType: "teeth_whitening",
	category: "hygiene",
	categoryLabel: "Эстетика и отбеливание",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
};

export const STOMX_CONSENT_SOMATIC_HEALTH: StomxLegalConsentTemplateMetadata = {
	id: 53,
	systemAlias: "anketa_zdorovya",
	name: "Анкета общего состояния здоровья пациента",
	procedureType: "somatic_health_questionnaire",
	category: "therapy",
	categoryLabel: "Анамнез и соматика",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-22), Приказ МЗ РФ № 834н / Карта приёма",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Прием.Дата"],
};

export const STOMX_THERAPY_AND_ORTHO_CONSENTS: readonly StomxLegalConsentTemplateMetadata[] = [
	STOMX_CONSENT_VENEERS,
	STOMX_CONSENT_FIXED_PROSTHETICS,
	STOMX_CONSENT_REMOVABLE_PROSTHETICS,
	STOMX_CONSENT_DEEP_CARIES,
	STOMX_CONSENT_SUPERFICIAL_MEDIUM_CARIES,
	STOMX_CONSENT_PULPITIS_ENDODONTICS,
	STOMX_CONSENT_PERIODONTOLOGY,
	STOMX_CONSENT_PROFESSIONAL_HYGIENE,
	STOMX_CONSENT_TEETH_WHITENING,
	STOMX_CONSENT_SOMATIC_HEALTH,
] as const;
