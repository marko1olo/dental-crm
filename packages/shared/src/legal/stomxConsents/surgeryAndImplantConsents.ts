import type { StomxLegalConsentTemplateMetadata } from "./types.js";

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * STOMX SURGERY & IMPLANTATION CONSENTS (LAYER 1)
 *
 * Специализированные ИДС StomX по хирургической стоматологии:
 * дентальная имплантация, синус-лифтинг, остеопластика/костная пластика,
 * удаление зубов любой сложности и седация (ЗАКС / внутривенная).
 * Нормативная база: 323-ФЗ ст. 19-23, Приказ Минздрава РФ № 1051н, ПП РФ № 736.
 * ══════════════════════════════════════════════════════════════════════════════
 */

export const STOMX_CONSENT_IMPLANTATION: StomxLegalConsentTemplateMetadata = {
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

export const STOMX_CONSENT_SINUS_LIFTING: StomxLegalConsentTemplateMetadata = {
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

export const STOMX_CONSENT_SEDATION: StomxLegalConsentTemplateMetadata = {
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

export const STOMX_CONSENT_EXTRACTION: StomxLegalConsentTemplateMetadata = {
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

export const STOMX_CONSENT_BONE_GRAFTING: StomxLegalConsentTemplateMetadata = {
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

export const STOMX_SURGERY_AND_IMPLANT_CONSENTS: readonly StomxLegalConsentTemplateMetadata[] = [
	STOMX_CONSENT_IMPLANTATION,
	STOMX_CONSENT_SINUS_LIFTING,
	STOMX_CONSENT_SEDATION,
	STOMX_CONSENT_EXTRACTION,
	STOMX_CONSENT_BONE_GRAFTING,
] as const;
