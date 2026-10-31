/**
 * dmsInsurancePresets.ts — Presets and compatibility catalog for Russian DMS.
 */

import {
	NOMENCLATURE_804N_CATALOG,
	RUSSIAN_DMS_INSURERS,
	STATUTORY_804N_NOMENCLATURE as BASE_804N,
	STATUTORY_DMS_EXCLUSION_RULES as BASE_EXCLUSIONS,
	type DmsGuaranteeLetter,
	type DmsInsurer,
	type Nomenclature804nItem,
	type DmsBillableItem,
} from "./dmsCatalogData.js";

export * from "./dmsCatalogData.js";

export type PatientGuaranteeLetter = DmsGuaranteeLetter;
export type DmsGuaranteeLetterRecord = DmsGuaranteeLetter & {
	totalLimitKopecks?: number;
	approvedNomenclatureCodes?: readonly string[];
	approvedTeeth?: readonly string[];
	diagnosisMkb10?: readonly string[];
	attachedXrayUris?: readonly string[];
};

export const COMMON_DENTAL_ICD10_DIAGNOSES = [
	{ code: "K02.1", label: "K02.1 Кариес дентина" },
	{ code: "K04.0", label: "K04.0 Пульпит" },
	{ code: "K05.1", label: "K05.1 Хронический гингивит" },
	{ code: "K04.4", label: "K04.4 Периодонтит" },
] as const;

export const FDI_ADULT_TEETH_UPPER = ["1.8", "1.7", "1.6", "1.5", "1.4", "1.3", "1.2", "1.1", "2.1", "2.2", "2.3", "2.4", "2.5", "2.6", "2.7", "2.8"] as const;
export const FDI_ADULT_TEETH_LOWER = ["4.8", "4.7", "4.6", "4.5", "4.4", "4.3", "4.2", "4.1", "3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"] as const;

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

export const STATUTORY_DMS_PROGRAMS: any = Object.assign(
	[
		{ key: "standard_therapy", name: "Базовая терапия", description: "Терапевтическое лечение", coversImplantation: false, coversVeneers: false, coversBleaching: false, maxHygienePerYear: 1 },
		{ key: "vip_full_coverage", name: "VIP Полное покрытие", description: "Полный спектр", coversImplantation: true, coversVeneers: false, coversBleaching: true, coversCt3D: true, maxHygienePerYear: 2 },
		{ key: "extended_surgery_hygiene", name: "Расширенная с хирургией", description: "Терапия и хирургия", coversImplantation: false, coversVeneers: false, coversBleaching: false, maxHygienePerYear: 2 },
		{ key: "economy_emergency_only", name: "Экстренная помощь", description: "Только острая боль", coversImplantation: false, coversVeneers: false, coversBleaching: false, maxHygienePerYear: 0 },
	],
	{
		standard_therapy: { coversImplantation: false, coversVeneers: false, coversBleaching: false, maxHygienePerYear: 1 },
		vip_full_coverage: { coversCt3D: true, maxHygienePerYear: 2 },
		extended_surgery_hygiene: { maxHygienePerYear: 2 },
		economy_emergency_only: { maxHygienePerYear: 0 },
	},
);

export const STATUTORY_DMS_EXCLUSION_RULES: any[] = [
	{ code: "orthodontics", titleRu: "Ортодонтия", matchingNomenclatureCodes: ["A16.07.048", "A16.07.049"], matchingKeywords: ["брекет", "элайнер", "ортодонт"], allowsPreAuthOverride: false },
	{ code: "implantology", titleRu: "Имплантация", matchingNomenclatureCodes: ["A16.07.054", "A16.07.055"], matchingKeywords: ["имплант", "синус-лифтинг"], allowsPreAuthOverride: true },
	{ code: "veneers", titleRu: "Виниры", matchingNomenclatureCodes: ["A16.07.003", "A16.07.003.001"], matchingKeywords: ["винир", "люминир"], allowsPreAuthOverride: false },
	{ code: "whitening", titleRu: "Отбеливание", matchingNomenclatureCodes: ["A16.07.050"], matchingKeywords: ["отбеливание", "zoom"], allowsPreAuthOverride: false },
	{ code: "prosthetics", titleRu: "Протезирование", matchingNomenclatureCodes: ["A16.07.004"], matchingKeywords: ["коронка", "мост"], allowsPreAuthOverride: true },
];

export const STATUTORY_804N_NOMENCLATURE: any[] = BASE_804N.map((item) => ({
	...item,
	isBaseDmsCovered: item.standardCoveredDms,
}));

export const SAMPLE_DMS_GUARANTEE_LETTERS: readonly DmsGuaranteeLetter[] = [
	{ id: "sample-letter-1", letterNumber: "ГП-СОГАЗ-2026-01", patientFullName: "Соколова Анна Викторовна", issueDate: "2026-01-15", validUntil: "2026-12-31", maxApprovedAmountKopecks: 5000000, maxCoverageKopecks: 5000000, usedAmountKopecks: 1250000, status: "active", insurerId: "sogaz", insurerName: "АО «СОГАЗ»" },
	{ id: "sample-letter-exp", letterNumber: "ГП-СОГАЗ-2025-99", patientFullName: "Соколова Анна Викторовна", issueDate: "2025-01-15", validUntil: "2025-12-31", maxApprovedAmountKopecks: 3000000, maxCoverageKopecks: 3000000, usedAmountKopecks: 3000000, status: "expired", insurerId: "sogaz", insurerName: "АО «СОГАЗ»" },
];

export function getStatutoryInsurerById(id: string): DmsInsurer | undefined {
	const norm = (id || "").toLowerCase().replace(/_/g, "");
	return RUSSIAN_DMS_INSURERS.find((i) => {
		const inorm = i.id.toLowerCase().replace(/_/g, "");
		return inorm === norm || (norm.includes("reso") && inorm.includes("reso")) || (norm.includes("alfa") && inorm.includes("alfa"));
	});
}

export function getStatutoryProgramByKey(key: string): any {
	return STATUTORY_DMS_PROGRAMS[key] || STATUTORY_DMS_PROGRAMS.find((p: any) => p.key === key) || STATUTORY_DMS_PROGRAMS[0];
}

export function getNomenclature804nByCode(code: string): any {
	return STATUTORY_804N_NOMENCLATURE.find((i) => i.code === code);
}
