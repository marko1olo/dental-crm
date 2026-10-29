/**
 * dmsInsurancePresets.ts — Canonical re-export facade from insuranceData SSOT.
 */

import {
	NOMENCLATURE_804N_CATALOG,
	RUSSIAN_DMS_INSURERS,
	STATUTORY_804N_NOMENCLATURE,
	STATUTORY_DMS_EXCLUSION_RULES,
	type DmsGuaranteeLetter,
	type DmsInsurer,
	type Nomenclature804nItem,
	type DmsBillableItem,
} from "./insuranceData.js";

export * from "./insuranceData.js";

export type PatientGuaranteeLetter = DmsGuaranteeLetter;

export const COMMON_DENTAL_ICD10_DIAGNOSES = [
	{ code: "K02.1", label: "K02.1 Кариес дентина" },
	{ code: "K04.0", label: "K04.0 Пульпит" },
	{ code: "K05.1", label: "K05.1 Хронический гингивит" },
	{ code: "K04.4", label: "K04.4 Периодонтит" },
] as const;

export const FDI_ADULT_TEETH_UPPER = [
	"1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1",
	"2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8",
] as const;

export const FDI_ADULT_TEETH_LOWER = [
	"4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1",
	"3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8",
] as const;

export const DEFAULT_BILL_ITEMS_TO_SPLIT: readonly DmsBillableItem[] = [
	{ id: "def-1", serviceCode: "A16.07.002.001", serviceCode804n: "A16.07.002.001", serviceName: "Восстановление зуба пломбой", quantity: 1, unitPriceKopecks: 450000 },
	{ id: "def-2", serviceCode: "A16.07.030.002", serviceCode804n: "A16.07.030.002", serviceName: "Эндодонтическое лечение", quantity: 1, unitPriceKopecks: 580000 },
	{ id: "def-3", serviceCode: "A11.07.010", serviceCode804n: "A11.07.010", serviceName: "Анестезия проводниковая", quantity: 1, unitPriceKopecks: 95000 },
];

export const EXPRESS_GUARANTEE_LETTER_PRESETS = [
	{ id: "express_therapy_basic", title: "Терапия Базовая", maxCoverageRub: 30000 },
	{ id: "express_therapy_extended", title: "Терапия Расширенная", maxCoverageRub: 50000 },
	{ id: "express_complex_surgery", title: "Комплекс с Хирургией", maxCoverageRub: 75000 },
	{ id: "express_vip_full", title: "VIP Полное Покрытие", maxCoverageRub: 150000 },
] as const;

export const STATUTORY_DMS_PROGRAMS = [
	{ key: "base", name: "Базовая терапия", description: "Терапевтическое лечение кариеса и пульпита", coveragePercent: 100 },
	{ key: "extended", name: "Расширенная с хирургией", description: "Терапия, хирургия и профилактическая гигиена", coveragePercent: 100 },
	{ key: "vip", name: "VIP Полное покрытие", description: "Полный спектр стоматологических услуг", coveragePercent: 100 },
] as const;

export const SAMPLE_DMS_GUARANTEE_LETTERS: readonly DmsGuaranteeLetter[] = [
	{
		id: "sample-letter-1",
		letterNumber: "ГП-СОГАЗ-2026-01",
		patientFullName: "Соколова Анна Викторовна",
		issueDate: "2026-01-15",
		validUntil: "2026-12-31",
		maxApprovedAmountKopecks: 5000000,
		maxCoverageKopecks: 5000000,
		usedAmountKopecks: 1250000,
		status: "active",
		insurerId: "sogaz",
		insurerName: "АО «СОГАЗ»",
	},
];

export function getStatutoryInsurerById(id: string): DmsInsurer | undefined {
	return RUSSIAN_DMS_INSURERS.find((i) => i.id.toLowerCase() === id.toLowerCase() || i.key.toLowerCase() === id.toLowerCase());
}

export function getStatutoryProgramByKey(key: string): any {
	return STATUTORY_DMS_PROGRAMS.find((p) => p.key === key) || STATUTORY_DMS_PROGRAMS[0];
}

export function getNomenclature804nByCode(code: string): Nomenclature804nItem | undefined {
	return NOMENCLATURE_804N_CATALOG.find((n) => n.code === code);
}

export type DmsGuaranteeLetterRecord = DmsGuaranteeLetter;
export type DmsGuaranteeLetterStatus = DmsGuaranteeLetter["status"];
export type DmsInsurerId = string;
export type DmsInsurerMetadata = DmsInsurer;
export type DmsPreAuthApprovalStatus = "approved" | "pending" | "rejected";
export type DmsProgramKey = "base" | "extended" | "vip";
export type DmsProgramPolicyDefinition = any;
export type DmsNomenclature804nItem = Nomenclature804nItem;
