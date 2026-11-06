import type {
	ClinicalLegalConsentTemplateMetadata,
	StomxLegalConsentTemplateMetadata,
} from "./types.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CLINICAL SURGERY & IMPLANTATION CONSENTS (LAYER 1)
 *
 * Специализированные ИДС клиники DENTE по хирургической стоматологии:
 * дентальная имплантация, синус-лифтинг, остеопластика/костная пластика,
 * удаление зубов любой сложности и седация (ЗАКС / внутривенная).
 * Нормативная база: 323-ФЗ ст. 19-23, Приказ Минздрава РФ № 1051н, ПП РФ № 736.
 * Мандаты 8x и 8ap: суверенная терминология без брендов конкурентов.
 * ══════════════════════════════════════════════════════════════════════════════
 */

export const CLINICAL_CONSENT_IMPLANTATION: ClinicalLegalConsentTemplateMetadata = {
	id: 60,
	systemAlias: "ids_implant",
	name: "ИДС Имплантация",
	procedureType: "implantation",
	category: "surgery",
	categoryLabel: "Хирургия и имплантация",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
};
/** @deprecated Use CLINICAL_CONSENT_IMPLANTATION (Mandate 8x/8ap) */
export const STOMX_CONSENT_IMPLANTATION = CLINICAL_CONSENT_IMPLANTATION;

export const CLINICAL_CONSENT_SINUS_LIFTING: ClinicalLegalConsentTemplateMetadata = {
	id: 73,
	systemAlias: "ids_sinus_lifting",
	name: "ИДС Синус-лифтинг",
	procedureType: "sinus_lifting",
	category: "surgery",
	categoryLabel: "Хирургия и имплантация",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
};
/** @deprecated Use CLINICAL_CONSENT_SINUS_LIFTING (Mandate 8x/8ap) */
export const STOMX_CONSENT_SINUS_LIFTING = CLINICAL_CONSENT_SINUS_LIFTING;

export const CLINICAL_CONSENT_SEDATION: ClinicalLegalConsentTemplateMetadata = {
	id: 72,
	systemAlias: "ids_sedaciya",
	name: "ИДС Седация (ЗАКС / в/в)",
	procedureType: "sedation",
	category: "surgery",
	categoryLabel: "Анестезиология и седация",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Дата"],
};
/** @deprecated Use CLINICAL_CONSENT_SEDATION (Mandate 8x/8ap) */
export const STOMX_CONSENT_SEDATION = CLINICAL_CONSENT_SEDATION;

export const CLINICAL_CONSENT_EXTRACTION: ClinicalLegalConsentTemplateMetadata = {
	id: 76,
	systemAlias: "ids_udalenie_zuba",
	name: "ИДС Удаление зуба",
	procedureType: "surgery_extraction",
	category: "surgery",
	categoryLabel: "Хирургия и удаление",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зуб", "Прием.Дата"],
};
/** @deprecated Use CLINICAL_CONSENT_EXTRACTION (Mandate 8x/8ap) */
export const STOMX_CONSENT_EXTRACTION = CLINICAL_CONSENT_EXTRACTION;

export const CLINICAL_CONSENT_BONE_GRAFTING: ClinicalLegalConsentTemplateMetadata = {
	id: 78,
	systemAlias: "ids_bone_grafting",
	name: "ИДС Костная пластика и остеопластика",
	procedureType: "bone_grafting",
	category: "surgery",
	categoryLabel: "Хирургия и имплантация",
	statutoryBasis: "ФЗ № 323-ФЗ (ст. 19-23), Приказ МЗ РФ № 1051н, ПП РФ № 736",
	isEgisz: false,
	esiaRequired: false,
	isXrayIds: false,
	keyVariables: ["Пациент.ФИО", "Клиника.Название", "Врач.ФИО", "Прием.Зубы", "Прием.Дата"],
};
/** @deprecated Use CLINICAL_CONSENT_BONE_GRAFTING (Mandate 8x/8ap) */
export const STOMX_CONSENT_BONE_GRAFTING = CLINICAL_CONSENT_BONE_GRAFTING;

export const CLINICAL_SURGERY_AND_IMPLANT_CONSENTS: readonly ClinicalLegalConsentTemplateMetadata[] = [
	CLINICAL_CONSENT_IMPLANTATION,
	CLINICAL_CONSENT_SINUS_LIFTING,
	CLINICAL_CONSENT_SEDATION,
	CLINICAL_CONSENT_EXTRACTION,
	CLINICAL_CONSENT_BONE_GRAFTING,
] as const;

/** @deprecated Use CLINICAL_SURGERY_AND_IMPLANT_CONSENTS (Mandate 8x/8ap) */
export const STOMX_SURGERY_AND_IMPLANT_CONSENTS = CLINICAL_SURGERY_AND_IMPLANT_CONSENTS;
