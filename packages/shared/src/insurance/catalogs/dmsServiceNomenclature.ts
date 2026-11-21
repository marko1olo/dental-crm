/**
 * DENTE Dental CRM — DMS Clinical Service Nomenclature, ICD-10 Diagnoses & Exclusion Rules SSOT.
 * Compliant with Mandate 8b (< 400 lines) & Mandate 8x (Pure Clinical Terminology, No Bureaucratic Slang).
 */

import { STANDARD_DMS_EXCLUDED_804N_SERVICES } from "../guaranteeModules/guaranteeMatcher.js";
import type { DmsGuaranteeLetter } from "../guaranteeModules/guaranteeTypes.js";
import type { DmsBillableItem } from "../dmsFranchiseEngine.js";

export interface DmsExclusionRule {
	readonly code: string;
	readonly titleRu: string;
	readonly descriptionRu?: string | undefined;
	readonly isDefaultExcluded?: boolean | undefined;
	readonly typicalCopayPercent?: number | undefined;
	readonly matchingNomenclatureCodes?: readonly string[] | undefined;
	readonly matchingKeywords?: readonly string[] | undefined;
	readonly allowsPreAuthOverride?: boolean | undefined;
}

export interface DmsServiceNomenclatureItem {
	readonly code: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "diagnostics" | "hygiene" | "orthopedics" | "orthodontics";
	readonly categoryTitleRu: string;
	readonly defaultPriceRub: number;
	readonly standardCoveredDms: boolean;
	readonly isBaseDmsCovered?: boolean | undefined;
	readonly uet?: number | undefined;
}

/**
 * Backward compatibility alias for legacy call sites.
 * @deprecated Use DmsServiceNomenclatureItem
 */
export type Nomenclature804nItem = DmsServiceNomenclatureItem;

export const DMS_STANDARD_EXCLUSIONS: readonly DmsExclusionRule[] = [
	{ code: "orthodontics", titleRu: "Ортодонтия (брекеты, элайнеры)", descriptionRu: "Исправление прикуса не покрывается базовым полисом", isDefaultExcluded: true, typicalCopayPercent: 100, matchingNomenclatureCodes: ["A16.07.048", "A16.07.049"], matchingKeywords: ["брекет", "элайнер", "ортодонт"], allowsPreAuthOverride: false },
	{ code: "implantology", titleRu: "Имплантация и костная пластика", descriptionRu: "Установка имплантатов и синус-лифтинг", isDefaultExcluded: true, typicalCopayPercent: 100, matchingNomenclatureCodes: ["A16.07.054", "A16.07.055"], matchingKeywords: ["имплант", "синус-лифтинг"], allowsPreAuthOverride: true },
	{ code: "whitening", titleRu: "Эстетическое отбеливание", descriptionRu: "Кабинетное и домашнее отбеливание зубов", isDefaultExcluded: true, typicalCopayPercent: 100, matchingNomenclatureCodes: ["A16.07.050"], matchingKeywords: ["отбеливание", "zoom"], allowsPreAuthOverride: false },
	{ code: "veneers", titleRu: "Виниры и эстетическая реставрация", descriptionRu: "Керамические и композитные виниры", isDefaultExcluded: true, typicalCopayPercent: 100, matchingNomenclatureCodes: ["A16.07.003", "A16.07.003.001"], matchingKeywords: ["винир", "люминир"], allowsPreAuthOverride: false },
	{ code: "prosthetics_planned", titleRu: "Плановое протезирование", descriptionRu: "Ортопедическое восстановление зубов требует согласования", isDefaultExcluded: false, typicalCopayPercent: 50, matchingNomenclatureCodes: ["A16.07.004"], matchingKeywords: ["коронка", "мост"], allowsPreAuthOverride: true },
	{ code: "general_anesthesia", titleRu: "Седация и наркоз", descriptionRu: "Лечение во сне без витальных показаний", isDefaultExcluded: true, typicalCopayPercent: 100, matchingNomenclatureCodes: ["B01.003.004"], matchingKeywords: ["наркоз", "седация"], allowsPreAuthOverride: false },
];

export const STATUTORY_DMS_EXCLUSION_RULES = DMS_STANDARD_EXCLUSIONS;
export const DMS_EXCLUSION_RULES = STATUTORY_DMS_EXCLUSION_RULES;

export const DMS_SERVICE_CATALOG: readonly DmsServiceNomenclatureItem[] = [
	{ code: "A16.07.002.001", name: "Восстановление зуба пломбой (световой композит)", category: "therapy", categoryTitleRu: "Терапевтическая стоматология", defaultPriceRub: 4500, standardCoveredDms: true, isBaseDmsCovered: true, uet: 1.0 },
	{ code: "A16.07.002.002", name: "Восстановление зуба пломбой (II, III класс)", category: "therapy", categoryTitleRu: "Терапевтическая стоматология", defaultPriceRub: 5600, standardCoveredDms: true, isBaseDmsCovered: true, uet: 1.5 },
	{ code: "A16.07.030.001", name: "Обработка корневого канала (1 канал)", category: "therapy", categoryTitleRu: "Эндодонтия", defaultPriceRub: 3500, standardCoveredDms: true, isBaseDmsCovered: true, uet: 1.25 },
	{ code: "A16.07.030.002", name: "Обработка корневых каналов (2 канала)", category: "therapy", categoryTitleRu: "Эндодонтия", defaultPriceRub: 5800, standardCoveredDms: true, isBaseDmsCovered: true, uet: 2.0 },
	{ code: "A11.07.010", name: "Местная анестезия (проводниковая/инфильтрационная)", category: "therapy", categoryTitleRu: "Анестезиология", defaultPriceRub: 950, standardCoveredDms: true, isBaseDmsCovered: true, uet: 0.5 },
	{ code: "A06.07.012", name: "Внутриротовая прицельная радиовизиография", category: "diagnostics", categoryTitleRu: "Рентгенодиагностика", defaultPriceRub: 800, standardCoveredDms: true, isBaseDmsCovered: true, uet: 0.4 },
	{ code: "A16.07.051", name: "Профессиональная гигиена полости рта (Air-Flow)", category: "hygiene", categoryTitleRu: "Профилактика и гигиена", defaultPriceRub: 6500, standardCoveredDms: true, isBaseDmsCovered: true, uet: 2.0 },
	{ code: "A16.07.001.001", name: "Удаление постоянного зуба (простое)", category: "surgery", categoryTitleRu: "Хирургия", defaultPriceRub: 3800, standardCoveredDms: true, isBaseDmsCovered: true, uet: 1.0 },
	{ code: "A16.07.004", name: "Восстановление зуба коронкой металлокерамика", category: "orthopedics", categoryTitleRu: "Ортопедия", defaultPriceRub: 14500, standardCoveredDms: false, isBaseDmsCovered: false, uet: 3.5 },
	{ code: "A16.07.050", name: "Профессиональное отбеливание зубов", category: "therapy", categoryTitleRu: "Эстетика", defaultPriceRub: 26000, standardCoveredDms: false, isBaseDmsCovered: false, uet: 4.0 },
];

/** Canonical SSOT alias */
export const NOMENCLATURE_804N_CATALOG = DMS_SERVICE_CATALOG;
export const STATUTORY_804N_NOMENCLATURE = DMS_SERVICE_CATALOG;

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
	{
		id: "express_sogaz_therapy",
		insurerKey: "sogaz",
		title: "СОГАЗ Терапия и Профгигиена",
		maxCoverageRub: 35000,
		approvedServiceCodes804n: ["A16.07.002.001", "A16.07.051", "A11.07.010"],
		approvedDiagnosisMkb10: ["K02.1", "K04.0"],
	},
	{
		id: "express_ingos_complex",
		insurerKey: "ingosstrakh",
		title: "Ингосстрах Комплекс",
		maxCoverageRub: 50000,
		approvedServiceCodes804n: ["A16.07.002.001", "A16.07.030.002", "A11.07.010"],
		approvedDiagnosisMkb10: ["K02.1", "K04.4"],
	},
	{
		id: "express_alfa_therapy",
		insurerKey: "alfastrakhovanie",
		title: "АльфаСтрахование Базовый",
		maxCoverageRub: 40000,
		approvedServiceCodes804n: ["A16.07.002.001", "A16.07.051", "A11.07.010"],
		approvedDiagnosisMkb10: ["K02.1", "K05.1"],
	},
	{
		id: "express_reso_full",
		insurerKey: "reso_garantiya",
		title: "РЕСО-Гарантия Полный",
		maxCoverageRub: 75000,
		approvedServiceCodes804n: ["A16.07.002.001", "A16.07.030.002", "A16.07.051", "A11.07.010"],
		approvedDiagnosisMkb10: ["K02.1", "K04.0", "K04.4"],
	},
] as const;

export function searchDmsServices(query: string): DmsServiceNomenclatureItem[] {
	const q = (query || "").trim().toLowerCase();
	return q ? DMS_SERVICE_CATALOG.filter((i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.categoryTitleRu.toLowerCase().includes(q)) : [...DMS_SERVICE_CATALOG];
}

/** Canonical backward-compatible alias */
export const search804nServices = searchDmsServices;

export function getDmsServiceByCode(code: string): DmsServiceNomenclatureItem | undefined {
	return DMS_SERVICE_CATALOG.find((i) => i.code === code);
}

/** Canonical backward-compatible alias */
export const getNomenclature804nByCode = getDmsServiceByCode;

export function normalizeToothFdi(tooth: string | number | undefined): string {
	return tooth ? String(tooth).trim().replace(/\D/g, "") : "";
}

export function isToothApprovedByLetter(
	tooth: string | undefined,
	letter?: (DmsGuaranteeLetter & { approvedTeethFdi?: readonly (string | number)[] | undefined }) | undefined,
): boolean {
	if (!tooth || !letter?.approvedTeethFdi?.length) return true;
	const norm = normalizeToothFdi(tooth);
	return letter.approvedTeethFdi.some((t: string | number) => normalizeToothFdi(t) === norm);
}

export function isServiceCodeApprovedByLetter(
	code: string | undefined,
	letter?: (DmsGuaranteeLetter & { allowed804nPrefixes?: readonly string[] | undefined; approvedServiceCodes?: readonly string[] | undefined; approvedServiceCodes804n?: readonly string[] | undefined }) | undefined,
): boolean {
	if (!code || !letter) return true;
	const codes = letter.allowed804nPrefixes || letter.approvedServiceCodes || letter.approvedServiceCodes804n;
	return !codes?.length || codes.some((c: string) => code.startsWith(c) || c.startsWith(code));
}

export function isServiceExcludedByDmsRules(
	code: string,
	_name: string,
	_program = "base",
	context?: { lastHygieneDate?: string | undefined; currentVisitDate?: string | undefined } | undefined,
): { isExcluded: boolean; reason?: string | undefined } {
	const normCode = (code || "").trim();
	const excludedMatch = STANDARD_DMS_EXCLUDED_804N_SERVICES.find(
		(ex) => normCode === ex.code804n || normCode.startsWith(ex.code804n),
	);
	if (excludedMatch) {
		return { isExcluded: true, reason: excludedMatch.reasonRu };
	}
	if (normCode.startsWith("A16.07.051")) {
		if (context?.lastHygieneDate && context?.currentVisitDate) {
			const d1 = new Date(context.lastHygieneDate).getTime();
			const d2 = new Date(context.currentVisitDate).getTime();
			const diffDays = Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
			if (diffDays < 180) {
				return { isExcluded: true, reason: "Профессиональная гигиена полости рта по ДМС проводится не чаще 1 раза в 6 месяцев" };
			}
		}
	}
	return { isExcluded: false };
}
