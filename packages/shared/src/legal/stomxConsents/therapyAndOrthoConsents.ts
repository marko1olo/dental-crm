import type {
	ClinicalLegalConsentTemplateMetadata,
	StomxLegalConsentTemplateMetadata,
} from "./types.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CLINICAL THERAPY, ORTHOPEDICS & HYGIENE CONSENTS (LAYER 1)
 *
 * Специализированные ИДС клиники DENTE по терапевтической стоматологии, лечению кариеса,
 * эндодонтии, пародонтологии, профгигиене, отбеливанию, несъемному и съемному протезированию.
 * Нормативная база: 323-ФЗ ст. 19-23, Приказ Минздрава РФ № 1051н, ПП РФ № 736.
 * Мандаты 8x и 8ap: суверенный бренд DENTE.
 * ══════════════════════════════════════════════════════════════════════════════
 */

export const CLINICAL_CONSENT_VENEERS: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_VENEERS (Mandate 8x/8ap) */
export const STOMX_CONSENT_VENEERS = CLINICAL_CONSENT_VENEERS;

export const CLINICAL_CONSENT_FIXED_PROSTHETICS: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_FIXED_PROSTHETICS (Mandate 8x/8ap) */
export const STOMX_CONSENT_FIXED_PROSTHETICS = CLINICAL_CONSENT_FIXED_PROSTHETICS;

export const CLINICAL_CONSENT_REMOVABLE_PROSTHETICS: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_REMOVABLE_PROSTHETICS (Mandate 8x/8ap) */
export const STOMX_CONSENT_REMOVABLE_PROSTHETICS = CLINICAL_CONSENT_REMOVABLE_PROSTHETICS;

export const CLINICAL_CONSENT_DEEP_CARIES: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_DEEP_CARIES (Mandate 8x/8ap) */
export const STOMX_CONSENT_DEEP_CARIES = CLINICAL_CONSENT_DEEP_CARIES;

export const CLINICAL_CONSENT_SUPERFICIAL_MEDIUM_CARIES: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_SUPERFICIAL_MEDIUM_CARIES (Mandate 8x/8ap) */
export const STOMX_CONSENT_SUPERFICIAL_MEDIUM_CARIES = CLINICAL_CONSENT_SUPERFICIAL_MEDIUM_CARIES;

export const CLINICAL_CONSENT_PULPITIS_ENDODONTICS: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_PULPITIS_ENDODONTICS (Mandate 8x/8ap) */
export const STOMX_CONSENT_PULPITIS_ENDODONTICS = CLINICAL_CONSENT_PULPITIS_ENDODONTICS;

export const CLINICAL_CONSENT_PERIODONTOLOGY: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_PERIODONTOLOGY (Mandate 8x/8ap) */
export const STOMX_CONSENT_PERIODONTOLOGY = CLINICAL_CONSENT_PERIODONTOLOGY;

export const CLINICAL_CONSENT_PROFESSIONAL_HYGIENE: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_PROFESSIONAL_HYGIENE (Mandate 8x/8ap) */
export const STOMX_CONSENT_PROFESSIONAL_HYGIENE = CLINICAL_CONSENT_PROFESSIONAL_HYGIENE;

export const CLINICAL_CONSENT_TEETH_WHITENING: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_TEETH_WHITENING (Mandate 8x/8ap) */
export const STOMX_CONSENT_TEETH_WHITENING = CLINICAL_CONSENT_TEETH_WHITENING;

export const CLINICAL_CONSENT_SOMATIC_HEALTH: ClinicalLegalConsentTemplateMetadata = {
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
/** @deprecated Use CLINICAL_CONSENT_SOMATIC_HEALTH (Mandate 8x/8ap) */
export const STOMX_CONSENT_SOMATIC_HEALTH = CLINICAL_CONSENT_SOMATIC_HEALTH;

export const CLINICAL_THERAPY_AND_ORTHO_CONSENTS: readonly ClinicalLegalConsentTemplateMetadata[] = [
	CLINICAL_CONSENT_VENEERS,
	CLINICAL_CONSENT_FIXED_PROSTHETICS,
	CLINICAL_CONSENT_REMOVABLE_PROSTHETICS,
	CLINICAL_CONSENT_DEEP_CARIES,
	CLINICAL_CONSENT_SUPERFICIAL_MEDIUM_CARIES,
	CLINICAL_CONSENT_PULPITIS_ENDODONTICS,
	CLINICAL_CONSENT_PERIODONTOLOGY,
	CLINICAL_CONSENT_PROFESSIONAL_HYGIENE,
	CLINICAL_CONSENT_TEETH_WHITENING,
	CLINICAL_CONSENT_SOMATIC_HEALTH,
] as const;

/** @deprecated Use CLINICAL_THERAPY_AND_ORTHO_CONSENTS (Mandate 8x/8ap) */
export const STOMX_THERAPY_AND_ORTHO_CONSENTS = CLINICAL_THERAPY_AND_ORTHO_CONSENTS;
