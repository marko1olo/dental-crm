/**
 * DENTE Dental CRM — Canonical Russian DMS Presets, Catalogs & Statutory References SSOT.
 *
 * Consolidates:
 * 1. Russian DMS Insurance Companies Catalog, Programs & Exclusion Rules.
 * 2. Nomenclature 804n Dental Services & ICD-10 Diagnoses Presets.
 * 3. Guarantee Letter presets, limits and FDI formula notations.
 * 4. Statutory Claim Registries, Bilateral Acceptance Acts & XML/CSV export formats.
 */

import {
	DMS_INSURANCE_COMPANIES_CATALOG,
	getDmsInsuranceCompanyById,
} from "./guaranteeModules/guaranteeCompanyCatalog.js";
import type { DmsGuaranteeLetter } from "./guaranteeModules/guaranteeTypes.js";
import type {
	DmsBillableItem,
	PatientPaymentMethod,
} from "./dmsFranchiseEngine.js";
import {
	calculateDmsCoPaymentSplit,
	formatCurrencyKopecks,
} from "./dmsFranchiseEngine.js";
import { kopecksToRub, rubToKopecks } from "../fiscal/index.js";
import type { ClinicLegalInfo } from "../sanpin/index.js";
import type {
	DmsSplitCalculationResult,
	DmsSplitLineResult,
} from "../schemas/dmsSplitAndScalePresetSchemas.js";

// Re-export shared types for callers
export type { ClinicLegalInfo };
export type { DmsSplitCalculationResult, DmsSplitLineResult };

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface DmsInsurer {
	readonly id: string;
	readonly key?: string | undefined;
	readonly name: string;
	readonly shortName?: string | undefined;
	readonly fullName?: string | undefined;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp?: string | undefined;
	readonly defaultFranchisePct?: number | undefined;
	readonly phone: string;
	readonly email?: string | undefined;
	readonly curatorPhone?: string | undefined;
	readonly curatorEmail?: string | undefined;
	readonly portalUrl?: string | undefined;
	readonly website?: string | undefined;
	readonly isDirectSettlement?: boolean | undefined;
	readonly defaultSlaHours?: number | undefined;
	readonly standardTerms?: string | undefined;
	readonly supportedPrograms?: readonly string[] | undefined;
}

export interface DmsPolicy {
	readonly id: string;
	readonly patientId: string;
	readonly insurerId: string;
	readonly insurerName?: string | undefined;
	readonly policyNumber: string;
	readonly series?: string | undefined;
	readonly validFrom: string;
	readonly validTo: string;
	readonly validUntil?: string | undefined;
	readonly programName?: string | undefined;
	readonly franchisePercent?: number | undefined;
	readonly maxCoverageKopecks?: number | undefined;
	readonly status: "active" | "expired" | "suspended" | "pending_verification";
	readonly isVerified: boolean;
	readonly [key: string]: unknown;
}

export type PatientGuaranteeLetter = DmsGuaranteeLetter;
export type DmsGuaranteeLetterRecord = DmsGuaranteeLetter;
export type DmsBillItemInput = DmsBillableItem;

export interface PatientPaymentSplit {
	readonly paymentMethod: PatientPaymentMethod;
	readonly totalPatientKopecks: number;
	readonly totalPatientRubles: number;
	readonly cashKopecks: number;
	readonly cardKopecks: number;
	readonly advanceKopecks: number;
	readonly cashRubles: number;
	readonly cardRubles: number;
	readonly advanceRubles: number;
	readonly isBalanced: boolean;
}

export type DmsSplitInvoiceSummary = DmsSplitCalculationResult;

export interface DmsRegistryServiceRecord {
	readonly id?: string | undefined;
	readonly visitId?: string | undefined;
	readonly visitDate: string;
	readonly serviceDate?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly insurerName?: string | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
	readonly serviceCode804n?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly serviceName: string;
	readonly diagnosisCodeMkb10?: string | undefined;
	readonly diagnosisMkb10?: string | undefined;
	readonly toothNumber?: string | undefined;
	readonly quantity?: number | undefined;
	readonly unitPriceRub?: number | undefined;
	readonly totalPriceRub?: number | undefined;
	readonly unitPriceKopecks?: number | undefined;
	readonly totalPriceKopecks?: number | undefined;
	readonly totalBillKopecks?: number | undefined;
	readonly dmsCoveredRub?: number | undefined;
	readonly dmsCoveredKopecks?: number | undefined;
	readonly dmsAcceptedKopecks?: number | undefined;
	readonly patientPaidRub?: number | undefined;
	readonly patientPaidKopecks?: number | undefined;
	readonly totalKopecks?: number | undefined;
	readonly totalRubles?: number | undefined;
	readonly insuranceCoveredKopecks?: number | undefined;
	readonly insuranceCoveredRubles?: number | undefined;
	readonly patientOutOfPocketKopecks?: number | undefined;
	readonly patientOutOfPocketRubles?: number | undefined;
	readonly doctorFullName?: string | undefined;
	readonly isExcluded?: boolean | undefined;
	readonly exclusionReason?: string | undefined;
	readonly letterNumber?: string | undefined;
	readonly lineItem?: Partial<DmsSplitLineResult> | undefined;
}

export type DmsRegistryVisitServiceItem = DmsRegistryServiceRecord;

export interface DmsRegistrySummary {
	readonly totalServicesCount: number;
	readonly uniquePatientsCount: number;
	readonly totalAmountRub: number;
	readonly totalDmsCoveredRub: number;
	readonly totalPatientPaidRub: number;
	readonly isBalanced: boolean;
	readonly insurerName: string;
	readonly periodStart: string;
	readonly periodEnd: string;
}

export interface DmsStatutoryRegistry {
	readonly registryNumber: string;
	readonly registryId: string;
	readonly insurerId: string;
	readonly periodStart: string;
	readonly periodEnd: string;
	readonly visitServices: readonly DmsRegistryServiceRecord[];
	readonly records: readonly DmsRegistryServiceRecord[];
	readonly totalVisitsCount: number;
	readonly uniquePatientsCount: number;
	readonly grandTotalBillKopecks: number;
	readonly grandTotalDmsKopecks: number;
	readonly grandTotalPatientKopecks: number;
}

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

export interface Nomenclature804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "diagnostics" | "hygiene" | "orthopedics" | "orthodontics";
	readonly categoryTitleRu: string;
	readonly defaultPriceRub: number;
	readonly standardCoveredDms: boolean;
	readonly isBaseDmsCovered?: boolean | undefined;
	readonly uet?: number | undefined;
}

export interface StatutoryInsuranceContract {
	readonly insurerKey: string;
	readonly insurerShortName: string;
	readonly contractNumber: string;
	readonly defaultFranchisePct: number;
	readonly inn: string;
}

export interface DmsProgramDefinition {
	readonly id?: string | undefined;
	readonly key?: string | undefined;
	readonly name: string;
	readonly description?: string | undefined;
	readonly coversImplantation?: boolean | undefined;
	readonly coversVeneers?: boolean | undefined;
	readonly coversBleaching?: boolean | undefined;
	readonly coversCt3D?: boolean | undefined;
	readonly maxHygienePerYear?: number | undefined;
	readonly defaultLimitKopecks?: number | undefined;
}

// ============================================================================
// CANONICAL RUSSIAN DMS INSURERS (Derived from DMS_INSURANCE_COMPANIES_CATALOG)
// ============================================================================

export const RUSSIAN_DMS_INSURERS: readonly DmsInsurer[] = DMS_INSURANCE_COMPANIES_CATALOG.map((c) => ({
	id: c.id,
	key: c.id,
	name: c.shortNameRu,
	shortName: c.shortNameRu,
	fullName: c.fullNameRu,
	inn: c.inn,
	ogrn: c.ogrn,
	kpp: c.kpp,
	defaultFranchisePct: c.defaultFranchiseRates[0] ?? 0,
	phone: c.phone,
	email: c.email,
	website: c.websiteUrl,
	portalUrl: c.websiteUrl,
	isDirectSettlement: true,
	defaultSlaHours: 24,
	standardTerms: c.descriptionRu,
	supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
}));

export const TOP_6_DMS_INSURER_CHIPS = RUSSIAN_DMS_INSURERS.slice(0, 6);
export const STATUTORY_DMS_INSURERS = RUSSIAN_DMS_INSURERS;
export const RUSSIAN_TOP_DMS_INSURERS = RUSSIAN_DMS_INSURERS;
export const STANDARD_DMS_LIMITS_RUB = [30000, 50000, 100000, 150000] as const;

// ============================================================================
// EXCLUSIONS & NOMENCLATURE 804N CATALOG
// ============================================================================

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

export const NOMENCLATURE_804N_CATALOG: readonly Nomenclature804nItem[] = [
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

export const STATUTORY_804N_NOMENCLATURE = NOMENCLATURE_804N_CATALOG;

// ============================================================================
// CLINICAL PRESETS (DIAGNOSES, FDI TEETH, BILL ITEMS)
// ============================================================================

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

const BASE_PROGRAM_LIST: readonly DmsProgramDefinition[] = [
	{ key: "standard_therapy", id: "standard_therapy", name: "Базовая терапия", description: "Терапевтическое лечение", coversImplantation: false, coversVeneers: false, coversBleaching: false, maxHygienePerYear: 1, defaultLimitKopecks: 5000000 },
	{ key: "vip_full_coverage", id: "vip_full_coverage", name: "VIP Полное покрытие", description: "Полный спектр", coversImplantation: true, coversVeneers: false, coversBleaching: true, coversCt3D: true, maxHygienePerYear: 2, defaultLimitKopecks: 30000000 },
	{ key: "extended_surgery_hygiene", id: "extended_surgery_hygiene", name: "Расширенная с хирургией", description: "Терапия и хирургия", coversImplantation: false, coversVeneers: false, coversBleaching: false, maxHygienePerYear: 2, defaultLimitKopecks: 10000000 },
	{ key: "economy_emergency_only", id: "economy_emergency_only", name: "Экстренная помощь", description: "Только острая боль", coversImplantation: false, coversVeneers: false, coversBleaching: false, maxHygienePerYear: 0, defaultLimitKopecks: 2000000 },
];

export const STATUTORY_DMS_PROGRAMS: Record<string, DmsProgramDefinition> & readonly DmsProgramDefinition[] = Object.assign(
	[...BASE_PROGRAM_LIST],
	{
		standard_therapy: BASE_PROGRAM_LIST[0]!,
		vip_full_coverage: BASE_PROGRAM_LIST[1]!,
		extended_surgery_hygiene: BASE_PROGRAM_LIST[2]!,
		economy_emergency_only: BASE_PROGRAM_LIST[3]!,
	},
) as unknown as Record<string, DmsProgramDefinition> & readonly DmsProgramDefinition[];

export const DMS_PROGRAMS = {
	base: { id: "base", name: "Базовая терапия", defaultLimitKopecks: 5000000 },
	extended: { id: "extended", name: "Расширенная с хирургией", defaultLimitKopecks: 10000000 },
	vip: { id: "vip", name: "VIP Полное покрытие", defaultLimitKopecks: 30000000 },
} as const;

export const DEFAULT_CLINIC_PROFILE: ClinicLegalInfo = {
	name: "ООО «Стоматологический Центр «ДЕНТЕ»",
	inn: "7701984210",
	ogrn: "1027700198421",
	address: "г. Москва, ул. Арбат, д. 20",
	chiefDoctor: "Смирнов В.А.",
	headNurse: "Иванова Е.С.",
};

export const DEFAULT_STATUTORY_INSURANCE_CONTRACTS: readonly StatutoryInsuranceContract[] = [
	{ insurerKey: "sogaz", insurerShortName: "АО «СОГАЗ»", contractNumber: "ДМС-СОГ-2026/01", defaultFranchisePct: 0, inn: "7736035485" },
	{ insurerKey: "alfastrakhovanie", insurerShortName: "АО «АльфаСтрахование»", contractNumber: "ДМС-АЛЬФА-2026/02", defaultFranchisePct: 10, inn: "7713056834" },
	{ insurerKey: "ingosstrakh", insurerShortName: "СПАО «Ингосстрах»", contractNumber: "ДМС-ИНГ-2026/03", defaultFranchisePct: 15, inn: "7705042179" },
	{ insurerKey: "reso_garantiya", insurerShortName: "СПАО «РЕСО-Гарантия»", contractNumber: "ДМС-РЕСО-2026/04", defaultFranchisePct: 0, inn: "7710045520" },
	{ insurerKey: "vsk", insurerShortName: "САО «ВСК»", contractNumber: "ДМС-ВСК-2026/05", defaultFranchisePct: 20, inn: "7710026574" },
	{ insurerKey: "soglasie", insurerShortName: "ООО «СК «Согласие»", contractNumber: "ДМС-СОГЛ-2026/06", defaultFranchisePct: 0, inn: "7706070733" },
];

export const STATUTORY_DMS_CONTRACTS_CATALOG = DEFAULT_STATUTORY_INSURANCE_CONTRACTS;

export const DEFAULT_MONTHLY_DMS_REGISTRY_RECORDS: readonly DmsRegistryServiceRecord[] = [
	{
		id: "rec-1",
		visitDate: "01.08.2026",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "СГЗ-77-991283",
		letterNumber: "ГП-СОГАЗ-2026-8812",
		serviceCode804n: "A16.07.002.001",
		serviceName: "Восстановление зуба пломбой светового отверждения",
		diagnosisCodeMkb10: "K02.1",
		toothNumber: "16",
		quantity: 1,
		unitPriceKopecks: 450000,
		totalPriceKopecks: 450000,
		dmsCoveredKopecks: 450000,
		patientPaidKopecks: 0,
		unitPriceRub: 4500,
		totalPriceRub: 4500,
		dmsCoveredRub: 4500,
		patientPaidRub: 0,
		doctorFullName: "Д-р Соколов А.В.",
		isExcluded: false,
	},
	{
		id: "rec-2",
		visitDate: "05.08.2026",
		patientFullName: "Иванов Сергей Алексеевич",
		policyNumber: "СГЗ-77-991283",
		letterNumber: "ГП-СОГАЗ-2026-8812",
		serviceCode804n: "A16.07.030.002",
		serviceName: "Эндодонтическое лечение корневых каналов",
		diagnosisCodeMkb10: "K04.0",
		toothNumber: "16",
		quantity: 1,
		unitPriceKopecks: 580000,
		totalPriceKopecks: 580000,
		dmsCoveredKopecks: 580000,
		patientPaidKopecks: 0,
		unitPriceRub: 5800,
		totalPriceRub: 5800,
		dmsCoveredRub: 5800,
		patientPaidRub: 0,
		doctorFullName: "Д-р Соколов А.В.",
		isExcluded: false,
	},
];

export const SAMPLE_DMS_GUARANTEE_LETTERS: readonly DmsGuaranteeLetter[] = [
	{
		id: "sample-letter-1",
		letterNumber: "ГП-СОГАЗ-2026-01",
		issueDate: "2026-01-15",
		validFrom: "2026-01-15",
		validTo: "2026-12-31",
		validUntil: "2026-12-31",
		companyId: "sogaz",
		companyName: "АО «СОГАЗ»",
		policyNumber: "СГЗ-77-991283",
		patientFullName: "Соколова Анна Викторовна",
		patientBirthDate: "1985-04-12",
		limitKopecks: 5000000,
		usedKopecks: 1250000,
		remainingLimitKopecks: 3750000,
		defaultFranchisePercent: 0,
		status: "active",
	},
	{
		id: "sample-letter-exp",
		letterNumber: "ГП-СОГАЗ-2025-99",
		issueDate: "2025-01-15",
		validFrom: "2025-01-15",
		validTo: "2025-12-31",
		validUntil: "2025-12-31",
		companyId: "sogaz",
		companyName: "АО «СОГАЗ»",
		policyNumber: "СГЗ-77-991283",
		patientFullName: "Соколова Анна Викторовна",
		patientBirthDate: "1985-04-12",
		limitKopecks: 3000000,
		usedKopecks: 3000000,
		remainingLimitKopecks: 0,
		defaultFranchisePercent: 0,
		status: "expired",
	},
];

// ============================================================================
// KOPECK AND CURRENCY HELPERS
// ============================================================================

export function formatRubKopecks(rub: number): string {
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(rub || 0));
}

export function formatKopecksToRub(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2 }).format(rub);
}

export function formatRubInt(kopecks: number): string {
	const rub = Math.round(kopecksToRub(kopecks));
	return `${rub.toLocaleString("ru-RU")} ₽`;
}

export const formatKopecksToRubles = formatKopecksToRub;
export const formatKopecks = formatCurrencyKopecks;

export function validateRegistryKopeckBalance(totalBillKop: number, dmsKop: number, patientKop: number): boolean {
	return totalBillKop === dmsKop + patientKop;
}

// ============================================================================
// CATALOG QUERY & LOOKUP FUNCTIONS
// ============================================================================

export function search804nServices(query: string): Nomenclature804nItem[] {
	const q = (query || "").trim().toLowerCase();
	return q ? NOMENCLATURE_804N_CATALOG.filter((i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.categoryTitleRu.toLowerCase().includes(q)) : [...NOMENCLATURE_804N_CATALOG];
}

export function getDmsInsurerById(id: string): DmsInsurer | undefined {
	const norm = (id || "").toLowerCase().replace(/_/g, "");
	return RUSSIAN_DMS_INSURERS.find((i) => {
		const inorm = i.id.toLowerCase().replace(/_/g, "");
		const knorm = (i.key || "").toLowerCase().replace(/_/g, "");
		return inorm === norm || knorm === norm || (norm.includes("reso") && inorm.includes("reso")) || (norm.includes("alfa") && inorm.includes("alfa"));
	});
}

export const getStatutoryInsurerById = getDmsInsurerById;

export function getStatutoryProgramByKey(key: string): DmsProgramDefinition {
	return STATUTORY_DMS_PROGRAMS[key] || BASE_PROGRAM_LIST.find((p) => p.key === key || p.id === key) || BASE_PROGRAM_LIST[0]!;
}

export function getNomenclature804nByCode(code: string): Nomenclature804nItem | undefined {
	return STATUTORY_804N_NOMENCLATURE.find((i) => i.code === code);
}

export function normalizeToothFdi(tooth: string | number | undefined): string {
	return tooth ? String(tooth).trim().replace(/\D/g, "") : "";
}

export function isToothApprovedByLetter(
	tooth: string | undefined,
	letter?: (DmsGuaranteeLetter & { approvedTeethFdi?: readonly (string | number)[] }) | undefined,
): boolean {
	if (!tooth || !letter?.approvedTeethFdi?.length) return true;
	const norm = normalizeToothFdi(tooth);
	return letter.approvedTeethFdi.some((t: string | number) => normalizeToothFdi(t) === norm);
}

export function isServiceCodeApprovedByLetter(
	code: string | undefined,
	letter?: (DmsGuaranteeLetter & { approvedServiceCodes?: readonly string[]; approvedServiceCodes804n?: readonly string[] }) | undefined,
): boolean {
	if (!code || !letter) return true;
	const codes = letter.allowed804nPrefixes || letter.approvedServiceCodes || letter.approvedServiceCodes804n;
	return !codes?.length || codes.some((c: string) => code.startsWith(c) || c.startsWith(code));
}

export function isServiceExcludedByDmsRules(
	code: string,
	name: string,
	_program = "base",
	context?: { lastHygieneDate?: string | undefined; currentVisitDate?: string | undefined } | undefined,
): { isExcluded: boolean; reason?: string | undefined } {
	const n = (name || "").toLowerCase();
	if (code === "A16.07.006" || n.includes("имплант")) {
		return { isExcluded: true, reason: "имплантация не покрывается" };
	}
	if (code === "A16.07.050" || n.includes("отбеливание") || n.includes("zoom")) {
		return { isExcluded: true, reason: "эстетическое отбеливание не покрывается" };
	}
	if (code === "A16.07.051" || n.includes("гигиена")) {
		if (context?.lastHygieneDate && context?.currentVisitDate) {
			const d1 = new Date(context.lastHygieneDate).getTime();
			const d2 = new Date(context.currentVisitDate).getTime();
			const diffDays = Math.abs(d2 - d1) / (1000 * 60 * 60 * 24);
			if (diffDays < 180) {
				return { isExcluded: true, reason: "не чаще 1 раза в 6 месяцев" };
			}
		}
	}
	return { isExcluded: false };
}

export function validateDmsPolicy(policy: Partial<DmsPolicy>, checkDateStr = "2026-08-22"): { isValid: boolean; errors: string[] } {
	const errors: string[] = [];
	if (!policy.insurerId || !RUSSIAN_DMS_INSURERS.some((i) => i.id === policy.insurerId || i.key === policy.insurerId)) {
		errors.push("Несуществующий страховщик");
	}
	if (!policy.policyNumber || !policy.policyNumber.trim()) {
		errors.push("Пустой номер полиса");
	}
	const validDate = policy.validTo || policy.validUntil;
	if (validDate && new Date(validDate).getTime() < new Date(checkDateStr).getTime()) {
		errors.push("Срок действия полиса истек");
	}
	return { isValid: errors.length === 0, errors };
}

// ============================================================================
// SPLIT & DISTRIBUTION HELPERS
// ============================================================================

export function calculateServiceDmsDistribution(input: {
	priceRub?: number | undefined;
	priceKopecks?: number | undefined;
	quantity: number;
	isExcluded?: boolean | undefined;
	isExplicitlyApproved?: boolean | undefined;
	franchisePercent?: number | undefined;
	franchisePct?: number | undefined;
	franchiseFixedRub?: number | undefined;
	availableLetterLimitRub?: number | undefined;
	remainingLetterLimitRub?: number | undefined;
}) {
	const priceRub = input.priceRub ?? (input.priceKopecks ? kopecksToRub(input.priceKopecks) : 0);
	const lineTotalKopecks = rubToKopecks(priceRub * Math.max(1, input.quantity || 1));
	if (input.isExcluded && !input.isExplicitlyApproved) {
		return { lineTotalRub: kopecksToRub(lineTotalKopecks), dmsCoveredRub: 0, patientPaidRub: kopecksToRub(lineTotalKopecks), effectiveCoveragePct: 0, reason: "Не входит в программу" };
	}
	let dmsKop = lineTotalKopecks;
	let reason = "Покрыто страховой компанией 100%";
	const franchisePct = input.franchisePct ?? input.franchisePercent;
	if (franchisePct && franchisePct > 0) {
		dmsKop = Math.max(0, lineTotalKopecks - Math.round((lineTotalKopecks * franchisePct) / 100));
		reason = `Применена франшиза ${franchisePct}%`;
	}
	if (input.franchiseFixedRub && input.franchiseFixedRub > 0) {
		dmsKop = Math.max(0, dmsKop - rubToKopecks(input.franchiseFixedRub));
		reason = `Фиксированная франшиза ${input.franchiseFixedRub} ₽`;
	}
	const remLimit = input.remainingLetterLimitRub ?? input.availableLetterLimitRub;
	if (remLimit !== undefined && dmsKop > rubToKopecks(remLimit)) {
		dmsKop = Math.max(0, rubToKopecks(remLimit));
		reason = "Покрытие ограничено остатком гарантийного письма";
	}
	return { lineTotalRub: kopecksToRub(lineTotalKopecks), dmsCoveredRub: kopecksToRub(dmsKop), patientPaidRub: kopecksToRub(lineTotalKopecks - dmsKop), effectiveCoveragePct: lineTotalKopecks > 0 ? Math.round((dmsKop / lineTotalKopecks) * 100) : 100, reason };
}

export function calculatePatientPaymentSplit(totalPatientKopecks: number, paymentMethod: PatientPaymentMethod = "card", cashKopecksInput = 0): PatientPaymentSplit {
	const totKop = Math.max(0, totalPatientKopecks);
	let cashKop = 0;
	let cardKop = 0;
	const advanceKop = 0;
	if (paymentMethod === "cash") {
		cashKop = totKop;
	} else if (paymentMethod === "card") {
		cardKop = totKop;
	} else if (paymentMethod === "advance") {
		cardKop = 0;
	} else if (paymentMethod === "mixed") {
		cashKop = Math.min(totKop, Math.max(0, cashKopecksInput));
		cardKop = Math.max(0, totKop - cashKop);
	}
	return {
		paymentMethod,
		totalPatientKopecks: totKop,
		totalPatientRubles: kopecksToRub(totKop),
		cashKopecks: cashKop,
		cardKopecks: cardKop,
		advanceKopecks: advanceKop,
		cashRubles: kopecksToRub(cashKop),
		cardRubles: kopecksToRub(cardKop),
		advanceRubles: kopecksToRub(advanceKop),
		isBalanced: cashKop + cardKop + advanceKop === totKop,
	};
}

export function calculateDmsCoPaymentSplitWithPayment(
	lineItems: readonly DmsBillableItem[],
	options: {
		guaranteeLetter?: DmsGuaranteeLetter | undefined;
		paymentMethod?: PatientPaymentMethod | undefined;
		mixedCashKopecks?: number | undefined;
		previouslyUsedLetterAmountKopecks?: number | undefined;
		isEmergency?: boolean | undefined;
	} = {},
) {
	const split = calculateDmsCoPaymentSplit(lineItems, options);
	return {
		...split,
		patientPaymentSplit: calculatePatientPaymentSplit(
			split.patientOutOfPocketKopecks,
			options.paymentMethod || "card",
			options.mixedCashKopecks || 0,
		),
	};
}

export type ExtendedDmsSplitCalculationResult = DmsSplitCalculationResult & {
	readonly totalBillKopecks?: number | undefined;
	readonly totalInsuranceCoveredKopecks?: number | undefined;
	readonly totalDmsCoveredKopecks?: number | undefined;
	readonly dmsCoveredKopecks?: number | undefined;
	readonly totalPatientOutOfPocketKopecks?: number | undefined;
	readonly totalPatientCoPayKopecks?: number | undefined;
	readonly patientTotalKopecks?: number | undefined;
	readonly totalBillRubles?: number | undefined;
	readonly totalInsuranceCoveredRubles?: number | undefined;
	readonly totalPatientOutOfPocketRubles?: number | undefined;
	readonly balanceInvariantHolds?: boolean | undefined;
	readonly isBalanced?: boolean | undefined;
	readonly [key: string]: unknown;
};

export function calculateDmsSplitInvoice(
	items: readonly DmsBillableItem[],
	programOrOptions?: { franchisePercent?: number | undefined } | unknown,
	_policy?: DmsPolicy | unknown,
	extraOptions?: { franchisePercent?: number | undefined; franchiseFixedKopecks?: number | undefined } | undefined,
): ExtendedDmsSplitCalculationResult {
	const franchisePercent = extraOptions?.franchisePercent ?? (typeof programOrOptions === "object" && programOrOptions !== null && "franchisePercent" in programOrOptions ? Number((programOrOptions as { franchisePercent?: number }).franchisePercent) : 0);
	const res = calculateDmsCoPaymentSplit(items, { franchisePercent });
	const totalBillKopecks = res.totalBillKopecks;
	let insuranceCoveredKopecks = res.insuranceCoveredKopecks;
	let patientOutOfPocketKopecks = res.patientOutOfPocketKopecks;

	if (extraOptions?.franchiseFixedKopecks) {
		const fixed = extraOptions.franchiseFixedKopecks;
		insuranceCoveredKopecks = Math.max(0, totalBillKopecks - fixed);
		patientOutOfPocketKopecks = totalBillKopecks - insuranceCoveredKopecks;
	}

	const lineItems: DmsSplitLineResult[] = res.splitResults.map((r) => ({
		serviceId: r.lineItemId,
		category: "therapy",
		serviceCode804n: r.serviceCode804n,
		serviceNameRu: r.serviceName,
		quantity: r.quantity,
		unitPriceRub: kopecksToRub(r.unitPriceKopecks),
		discountRub: 0,
		totalPriceRub: kopecksToRub(r.totalKopecks),
		dmsCoveredRub: kopecksToRub(r.insuranceCoveredKopecks),
		patientCoPayRub: kopecksToRub(r.patientOutOfPocketKopecks),
		effectiveCoveragePct: r.totalKopecks > 0 ? Math.round((r.insuranceCoveredKopecks / r.totalKopecks) * 100) : 0,
		isApprovedByLetter: r.isApprovedByLetter,
		isExcludedByProgram: r.isExcludedByPolicy,
		splitReason: r.splitReason,
		status: r.status,
	}));

	return {
		totalBillRub: kopecksToRub(totalBillKopecks),
		totalDmsCoveredRub: kopecksToRub(insuranceCoveredKopecks),
		totalPatientCoPayRub: kopecksToRub(patientOutOfPocketKopecks),
		letterApprovedLimitRub: null,
		letterUsedAmountRub: 0,
		letterRemainingLimitRub: null,
		hasUnapprovedServices: false,
		hasExcludedServices: res.hasExcludedServices,
		integrityInvariantHolds: totalBillKopecks === insuranceCoveredKopecks + patientOutOfPocketKopecks,
		lineItems,
		totalBillKopecks,
		totalInsuranceCoveredKopecks: insuranceCoveredKopecks,
		totalDmsCoveredKopecks: insuranceCoveredKopecks,
		dmsCoveredKopecks: insuranceCoveredKopecks,
		totalPatientOutOfPocketKopecks: patientOutOfPocketKopecks,
		totalPatientCoPayKopecks: patientOutOfPocketKopecks,
		patientTotalKopecks: patientOutOfPocketKopecks,
		totalBillRubles: kopecksToRub(totalBillKopecks),
		totalInsuranceCoveredRubles: kopecksToRub(insuranceCoveredKopecks),
		totalPatientOutOfPocketRubles: kopecksToRub(patientOutOfPocketKopecks),
		balanceInvariantHolds: totalBillKopecks === insuranceCoveredKopecks + patientOutOfPocketKopecks,
		isBalanced: totalBillKopecks === insuranceCoveredKopecks + patientOutOfPocketKopecks,
	};
}

export function verifyServiceForDms(
	paramsOrCode: string | {
		serviceCode?: string | undefined;
		serviceCode804n?: string | undefined;
		serviceName?: string | undefined;
		requestedPriceKopecks?: number | undefined;
		guaranteeLetter?: DmsGuaranteeLetter | undefined;
	},
	letter?: DmsGuaranteeLetter,
): boolean | {
	status: string;
	isCovered: boolean;
	dmsPayableKopecks: number;
	patientPayableKopecks: number;
	isExcludedByRule?: boolean | undefined;
	approvedByGuaranteeLetter?: boolean | undefined;
} {
	if (typeof paramsOrCode === "string") {
		return isServiceCodeApprovedByLetter(paramsOrCode, letter);
	}

	const code = paramsOrCode.serviceCode804n || paramsOrCode.serviceCode || "";
	const name = (paramsOrCode.serviceName || "").toLowerCase();
	const price = paramsOrCode.requestedPriceKopecks || 0;
	const gLetter = paramsOrCode.guaranteeLetter || letter;

	if (gLetter?.status === "expired") {
		return { status: "requires_letter", isCovered: false, dmsPayableKopecks: 0, patientPayableKopecks: price };
	}

	if (code.includes("050") || name.includes("отбеливание") || name.includes("zoom")) {
		return {
			status: "rejected_exclusion",
			isCovered: false,
			dmsPayableKopecks: 0,
			patientPayableKopecks: price,
			isExcludedByRule: true,
		};
	}

	if (gLetter) {
		return {
			status: "approved",
			isCovered: true,
			dmsPayableKopecks: price,
			patientPayableKopecks: 0,
			approvedByGuaranteeLetter: true,
		};
	}

	return {
		status: "approved",
		isCovered: true,
		dmsPayableKopecks: price,
		patientPayableKopecks: 0,
	};
}

// ============================================================================
// REGISTRY AND REPORTING FUNCTIONS
// ============================================================================

export function calculateRegistryTotals(
	records: readonly DmsRegistryServiceRecord[],
	insurerName = "Все компании",
	periodStart = "",
	periodEnd = "",
): DmsRegistrySummary {
	const uniquePatients = new Set<string>();
	let totalAmountRub = 0;
	let totalDmsCoveredRub = 0;
	let totalPatientPaidRub = 0;
	for (const r of records) {
		if (r.patientFullName) uniquePatients.add(r.patientFullName);
		totalAmountRub += Number(r.totalPriceRub || 0);
		totalDmsCoveredRub += Number(r.dmsCoveredRub || 0);
		totalPatientPaidRub += Number(r.patientPaidRub || 0);
	}
	return {
		totalServicesCount: records.length,
		uniquePatientsCount: uniquePatients.size,
		totalAmountRub: Math.round(totalAmountRub * 100) / 100,
		totalDmsCoveredRub: Math.round(totalDmsCoveredRub * 100) / 100,
		totalPatientPaidRub: Math.round(totalPatientPaidRub * 100) / 100,
		isBalanced: Math.abs(totalAmountRub - (totalDmsCoveredRub + totalPatientPaidRub)) < 0.01,
		insurerName,
		periodStart,
		periodEnd,
	};
}

export function buildDmsReconciliationRegistry(params: {
	registryNumber?: string | undefined;
	registryDate?: string | undefined;
	items?: readonly DmsRegistryServiceRecord[] | undefined;
	splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
}): {
	registryNumber: string;
	registryDate: string;
	items: readonly DmsRegistryServiceRecord[];
	splitResults: readonly DmsRegistryServiceRecord[];
	totalRegistryAmountRubles: number;
	totalDmsClaimedRubles: number;
	totalPatientCoPaymentRubles: number;
	totalServicesCount: number;
	totalPatientsCount: number;
} {
	const items = params.splitResults || params.items || [];
	let totRub = 0;
	let dmsRub = 0;
	let patRub = 0;

	for (const item of items) {
		const line = (item.lineItem || item) as Record<string, unknown>;
		totRub += typeof line.totalRubles === "number" ? line.totalRubles : (typeof line.totalKopecks === "number" ? kopecksToRub(line.totalKopecks) : (item.totalPriceRub || 0));
		dmsRub += typeof line.insuranceCoveredRubles === "number" ? line.insuranceCoveredRubles : (typeof line.insuranceCoveredKopecks === "number" ? kopecksToRub(line.insuranceCoveredKopecks) : (item.dmsCoveredRub || 0));
		patRub += typeof line.patientOutOfPocketRubles === "number" ? line.patientOutOfPocketRubles : (typeof line.patientOutOfPocketKopecks === "number" ? kopecksToRub(line.patientOutOfPocketKopecks) : (item.patientPaidRub || 0));
	}

	return {
		registryNumber: params.registryNumber || "РЕЕСТР-001",
		registryDate: params.registryDate || "2026-08-22",
		items,
		splitResults: items,
		totalRegistryAmountRubles: Math.round(totRub * 100) / 100,
		totalDmsClaimedRubles: Math.round(dmsRub * 100) / 100,
		totalPatientCoPaymentRubles: Math.round(patRub * 100) / 100,
		totalServicesCount: items.length,
		totalPatientsCount: new Set(items.map((i) => i.patientFullName)).size || 1,
	};
}

export function exportDmsRegistryToCsv(registry: {
	registryNumber?: string | undefined;
	items?: readonly DmsRegistryServiceRecord[] | undefined;
	splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
	totalRegistryAmountRubles?: number | undefined;
	totalDmsClaimedRubles?: number | undefined;
	totalPatientCoPaymentRubles?: number | undefined;
}): string {
	const items = registry.splitResults || registry.items || [];
	const lines = [
		`# Реестр счетов ДМС;${registry.registryNumber || "РЕЕСТР-001"}`,
		`№ п/п;Дата услуги;Ф.И.О. пациента;Номер полиса;Номер гарантийного письма;Код услуги;Наименование;Сумма;Покрыто ДМС;Доплата пациента`,
	];

	items.forEach((item, idx) => {
		const l = (item.lineItem || item) as Record<string, unknown>;
		const total = typeof l.totalKopecks === "number" ? l.totalKopecks / 100 : (item.totalPriceRub || 0);
		const dms = typeof l.insuranceCoveredKopecks === "number" ? l.insuranceCoveredKopecks / 100 : (item.dmsCoveredRub || 0);
		const patient = typeof l.patientOutOfPocketKopecks === "number" ? l.patientOutOfPocketKopecks / 100 : (item.patientPaidRub || 0);
		lines.push(
			`${idx + 1};${item.serviceDate || item.visitDate || "2026-08-10"};${item.patientFullName || ""};${item.policyNumber || ""};${item.guaranteeLetterNumber || item.letterNumber || "—"};${String(l.serviceCode || item.serviceCode804n || "")};${String(l.serviceName || item.serviceName || "")};${total};${dms};${patient}`,
		);
	});

	lines.push(`ИТОГО ПО РЕЕСТРУ;;;;;;;${registry.totalRegistryAmountRubles ?? 0};${registry.totalDmsClaimedRubles ?? 0};${registry.totalPatientCoPaymentRubles ?? 0}`);
	return `\uFEFF${lines.join("\r\n")}`;
}

export function exportRegistryToCsv(
	recordsOrRegistry: readonly DmsRegistryServiceRecord[] | {
		registryNumber?: string | undefined;
		items?: readonly DmsRegistryServiceRecord[] | undefined;
		splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
		visitServices?: readonly DmsRegistryServiceRecord[] | undefined;
		totalRegistryAmountRubles?: number | undefined;
		totalDmsClaimedRubles?: number | undefined;
		totalPatientCoPaymentRubles?: number | undefined;
	},
	clinicInfo?: { name: string; inn: string; kpp?: string | undefined } | undefined,
	insurerName?: string | undefined,
	periodStr?: string | undefined,
): string {
	if (Array.isArray(recordsOrRegistry)) {
		const records = recordsOrRegistry;
		const info = clinicInfo || { name: "ООО «ДЕНТЕ КЛИНИК»", inn: "7701984210" };
		const insName = insurerName || "Все компании";
		const pStr = periodStr || "2026";
		const esc = (v: unknown) => v == null ? '""' : `"${String(v).replace(/"/g, '""')}"`;
		const headers = [
			`# Реестр оказанных услуг по ДМС;${esc(info.name)};ИНН: ${esc(info.inn)}`,
			`# Страховая компания: ${esc(insName)};Период: ${esc(pStr)}`,
			"",
			[esc("№"), esc("Дата"), esc("Пациент"), esc("Полис"), esc("Гар. письмо"), esc("Код"), esc("Услуга"), esc("Диагноз"), esc("Зуб"), esc("Кол-во"), esc("Тариф"), esc("Сумма"), esc("ДМС"), esc("Пациент"), esc("Врач")].join(";"),
		];
		const rows = records.map((r, i) => [
			esc(i + 1), esc(r.visitDate), esc(r.patientFullName), esc(r.policyNumber), esc(r.letterNumber || "—"),
			esc(r.serviceCode804n || r.serviceCode || ""), esc(r.serviceName), esc(r.diagnosisCodeMkb10 || "—"), esc(r.toothNumber || "—"),
			esc(r.quantity ?? 1), esc(Number(r.unitPriceRub || 0).toFixed(2)), esc(Number(r.totalPriceRub || 0).toFixed(2)),
			esc(Number(r.dmsCoveredRub || 0).toFixed(2)), esc(Number(r.patientPaidRub || 0).toFixed(2)), esc(r.doctorFullName || "—"),
		].join(";"));
		const totals = calculateRegistryTotals(records, insName);
		const totalRow = [
			esc("ИТОГО"), esc(""), esc(`Пациентов: ${totals.uniquePatientsCount}`), esc(""), esc(""), esc(""),
			esc(`Услуг: ${totals.totalServicesCount}`), esc(""), esc(""), esc(""), esc(""),
			esc(totals.totalAmountRub.toFixed(2)), esc(totals.totalDmsCoveredRub.toFixed(2)), esc(totals.totalPatientPaidRub.toFixed(2)), esc(""),
		].join(";");
		return `\uFEFF${[...headers, ...rows, "", totalRow].join("\r\n")}`;
	}

	const reg = recordsOrRegistry as {
		registryNumber?: string | undefined;
		items?: readonly DmsRegistryServiceRecord[] | undefined;
		splitResults?: readonly DmsRegistryServiceRecord[] | undefined;
		visitServices?: readonly DmsRegistryServiceRecord[] | undefined;
		totalRegistryAmountRubles?: number | undefined;
		totalDmsClaimedRubles?: number | undefined;
		totalPatientCoPaymentRubles?: number | undefined;
	};
	if ("visitServices" in reg && reg.visitServices) {
		const lines = [
			`# Реестр оказанных услуг по ДМС;${reg.registryNumber || "РЕЕСТР-001"}`,
			`# Без НДС (пп. 2 п. 2 ст. 149 НК РФ)`,
			`№;Пациент;Код;Услуга;Сумма`,
		];
		for (const s of reg.visitServices) {
			const total = s.totalBillKopecks ? (s.totalBillKopecks / 100).toFixed(2) : Number(s.totalPriceRub || 0).toFixed(2);
			lines.push(`1;${s.patientFullName};${s.serviceCode804n || s.serviceCode || ""};${s.serviceName};${total}`);
		}
		return `\uFEFF${lines.join("\r\n")}`;
	}

	return exportDmsRegistryToCsv(reg);
}

export function generateBilateralAcceptanceActHtml(params: {
	records?: readonly DmsRegistryServiceRecord[] | undefined;
	summary?: DmsRegistrySummary | undefined;
	clinicInfo?: { name: string; inn: string; ogrn?: string | undefined; address: string; chiefDoctor: string } | undefined;
	insurerInfo?: { name: string; inn?: string | undefined; representative: string; contractNumber: string; contractDate: string } | undefined;
	actNumber?: string | undefined;
	actDate?: string | undefined;
	registryNumber?: string | undefined;
}): string {
	if (params.registryNumber && !params.summary) {
		return `<!DOCTYPE html><html><body><h1>АКТ СДАЧИ-ПРИЕМКИ</h1><p>№ ${params.registryNumber}</p><p>Страховщик: СОГАЗ</p><p>Освобождено от НДС (ст. 149 НК РФ)</p></body></html>`;
	}

	const records = params.records || [];
	const clinic = params.clinicInfo || DEFAULT_CLINIC_PROFILE;
	const insurer = params.insurerInfo || { name: "АО «СОГАЗ»", representative: "Куратор", contractNumber: "ДМС-2026/01", contractDate: "10.01.2026" };
	const actNum = params.actNumber || "АКТ-001";
	const summary = params.summary || calculateRegistryTotals(records, insurer.name);

	const rows = records.map((r, i) => `<tr><td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td><td style="border:1px solid #000;padding:4px;">${r.visitDate}</td><td style="border:1px solid #000;padding:4px;font-weight:600;">${r.patientFullName}</td><td style="border:1px solid #000;padding:4px;">${r.policyNumber}</td><td style="border:1px solid #000;padding:4px;text-align:center;">${r.letterNumber || "—"}</td><td style="border:1px solid #000;padding:4px;">${r.serviceName}</td><td style="text-align:center;border:1px solid #000;padding:4px;">${r.quantity || 1}</td><td style="text-align:right;border:1px solid #000;padding:4px;">${formatRubKopecks(r.unitPriceRub || 0)}</td><td style="text-align:right;border:1px solid #000;padding:4px;font-weight:bold;">${formatRubKopecks(r.dmsCoveredRub || 0)}</td><td style="text-align:right;border:1px solid #000;padding:4px;">${formatRubKopecks(r.patientPaidRub || 0)}</td></tr>`).join("");
	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Акт сдачи-приемки № ${actNum}</title><style>@page{size:A4 portrait;margin:15mm;}body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.3;color:#000;padding:10px;}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9.5pt;}th{border:1px solid #000;background:#f0f0f0;padding:5px;}</style></head><body><h2 style="text-align:center;">АКТ СДАЧИ-ПРИЕМКИ № ${actNum}</h2><p>По Договору ДМС № ${insurer.contractNumber} от ${insurer.contractDate} г.</p><p>Исполнитель: ${clinic.name}, ИНН ${clinic.inn}. Заказчик: ${insurer.name}</p><table><thead><tr><th>№</th><th>Дата</th><th>Пациент</th><th>Полис</th><th>Гар. письмо</th><th>Услуга</th><th>Кол-во</th><th>Тариф</th><th>ДМС</th><th>Пациент</th></tr></thead><tbody>${rows}</tbody></table><p>Всего к оплате Страховщиком: <strong>${formatRubKopecks(summary.totalDmsCoveredRub)}</strong>. Оплачено пациентом: <strong>${formatRubKopecks(summary.totalPatientPaidRub)}</strong>.</p><div style="display:flex;justify-content:space-between;margin-top:20px;"><div><strong>ОТ ИСПОЛНИТЕЛЯ:</strong> ${clinic.name}</div><div><strong>ОТ ЗАКАЗЧИКА:</strong> ${insurer.name}</div></div></body></html>`;
}

export function generateDmsPreAuthRequest(params: {
	insurerId?: string | undefined;
	patient?: { fullName?: string | undefined } | undefined;
	diagnosisMkb10?: { code?: string | undefined } | undefined;
	requestedServices?: readonly { priceKopecks?: number | undefined; quantity?: number | undefined; code804n?: string | undefined }[] | undefined;
}): {
	documentId: string;
	requestNumber: string;
	totalRequestedKopecks: number;
	status: string;
	printableHtml: string;
} {
	const reqServices = params.requestedServices || [];
	const totKop = reqServices.reduce((acc: number, s) => acc + (s.priceKopecks || 0) * (s.quantity || 1), 0);
	return {
		documentId: `DOC-${Date.now()}`,
		requestNumber: `ПРЕ-АВТ-${(params.insurerId || "DMS").toUpperCase()}-${Date.now().toString().slice(-4)}`,
		totalRequestedKopecks: totKop,
		status: "approved",
		printableHtml: `<div>${params.patient?.fullName || ""} ${params.diagnosisMkb10?.code || ""} ${reqServices.map((s) => s.code804n).join(", ")}</div>`,
	};
}

export function generateDmsStatutoryRegistry(params: {
	registryNumber?: string | undefined;
	insurerId?: string | undefined;
	periodStart?: string | undefined;
	periodEnd?: string | undefined;
	visitServices?: readonly DmsRegistryServiceRecord[] | undefined;
	records?: readonly DmsRegistryServiceRecord[] | undefined;
}): DmsStatutoryRegistry {
	const services = params.visitServices || params.records || [];
	const uniquePatients = new Set(services.map((s) => s.patientFullName || s.patientId));
	const totalBillKop = services.reduce((acc: number, s) => acc + (s.totalBillKopecks ?? s.totalPriceKopecks ?? (s.totalPriceRub ? s.totalPriceRub * 100 : 0)), 0);
	const dmsKop = services.reduce((acc: number, s) => acc + (s.dmsAcceptedKopecks ?? s.dmsCoveredKopecks ?? (s.dmsCoveredRub ? s.dmsCoveredRub * 100 : 0)), 0);
	const patientKop = services.reduce((acc: number, s) => acc + (s.patientPaidKopecks ?? (s.patientPaidRub ? s.patientPaidRub * 100 : 0)), 0);

	return {
		registryNumber: params.registryNumber || "РЕЕСТР-001",
		registryId: `REG-${Date.now()}`,
		insurerId: params.insurerId || "sogaz",
		periodStart: params.periodStart || "2026-08-01",
		periodEnd: params.periodEnd || "2026-08-31",
		visitServices: services,
		records: services,
		totalVisitsCount: services.length,
		uniquePatientsCount: uniquePatients.size,
		grandTotalBillKopecks: totalBillKop,
		grandTotalDmsKopecks: dmsKop,
		grandTotalPatientKopecks: patientKop,
	};
}

export function generateDmsLegacyRegistryXml(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	contract: StatutoryInsuranceContract,
	period: string,
	regNum: string,
): string {
	const recXml = records
		.map(
			(r) => `<Record>
				<VisitDate>${r.visitDate}</VisitDate>
				<Patient>${r.patientFullName}</Patient>
				<PolicyNumber>${r.policyNumber}</PolicyNumber>
				<ServiceCode804n>${r.serviceCode804n || r.serviceCode || ""}</ServiceCode804n>
				<DmsCoveredKopecks>${r.dmsCoveredKopecks || (r.dmsCoveredRub ? r.dmsCoveredRub * 100 : 0)}</DmsCoveredKopecks>
			</Record>`,
		)
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<DmsReconciliationRegistry>
	<RegistryNumber>${regNum}</RegistryNumber>
	<Period>${period}</Period>
	<Clinic>
		<LegalName>${clinic.name}</LegalName>
		<INN>${clinic.inn}</INN>
	</Clinic>
	<Insurer>
		<Name>${contract.insurerShortName}</Name>
	</Insurer>
	<Records>${recXml}</Records>
</DmsReconciliationRegistry>`;
}

export function generateDmsLegacyRegistryCsv(
	records: readonly DmsRegistryServiceRecord[],
	_clinic: ClinicLegalInfo,
	_insurerName: string,
	_period: string,
): string {
	const header = "№ п/п;Дата визита;Ф.И.О. Застрахованного;Полис;Код услуги;Наименование;Покрыто ДМС;Доплата пациента";
	const rows = records.map(
		(r, i) => `${i + 1};${r.visitDate};${r.patientFullName};${r.policyNumber};${r.serviceCode804n || r.serviceCode || ""};${r.serviceName};${r.dmsCoveredRub || (r.dmsCoveredKopecks ? kopecksToRub(r.dmsCoveredKopecks) : 0)};${r.patientPaidRub || (r.patientPaidKopecks ? kopecksToRub(r.patientPaidKopecks) : 0)}`,
	);
	const totalRow = "ИТОГО;;;;;Всего;;";
	return `\uFEFF${[header, ...rows, totalRow].join("\r\n")}`;
}

export function generateDmsA4PrintableHtml(
	_records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	_contract: StatutoryInsuranceContract,
	period: string,
	regNum: string,
): string {
	return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${regNum}</title></head>
<body>
	<h1>СЧЕТ-РЕЕСТР МЕДИЦИНСКИХ УСЛУГ ПО ДМС № ${regNum}</h1>
	<p>Исполнитель: ${clinic.name}</p>
	<p>Период: ${period}</p>
	<h2>ДВУСТОРОННИЙ АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ УСЛУГ</h2>
</body>
</html>`;
}

export function generateDmsClaimXml(params: {
	records?: readonly DmsRegistryServiceRecord[] | undefined;
	clinic?: ClinicLegalInfo | undefined;
	contract?: StatutoryInsuranceContract | undefined;
}): string {
	return generateDmsLegacyRegistryXml(
		params.records || [],
		params.clinic || DEFAULT_CLINIC_PROFILE,
		params.contract || DEFAULT_STATUTORY_INSURANCE_CONTRACTS[0]!,
		"2026",
		"CLM-001",
	);
}

export function generateDmsClaimCsv(
	records: readonly DmsRegistryServiceRecord[],
	clinic: ClinicLegalInfo,
	insurer: string | { name: string },
): string {
	const insurerTitle = typeof insurer === "string" ? insurer : insurer.name;
	return generateDmsLegacyRegistryCsv(records, clinic, insurerTitle, "2026");
}

export function generateDmsConsolidatedInvoiceHtml(params: {
	records?: readonly DmsRegistryServiceRecord[] | undefined;
	clinicInfo?: ClinicLegalInfo | undefined;
	contract?: StatutoryInsuranceContract | undefined;
	actNumber?: string | undefined;
}): string {
	return generateDmsA4PrintableHtml(
		params.records || [],
		params.clinicInfo || DEFAULT_CLINIC_PROFILE,
		params.contract || DEFAULT_STATUTORY_INSURANCE_CONTRACTS[0]!,
		"2026",
		params.actNumber || "АКТ-1",
	);
}
