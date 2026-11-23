/**
 * DENTE Dental CRM — Canonical Russian DMS Insurers & Programs Catalog.
 * Compliant with Mandate 8b (< 400 lines).
 */

import {
	DMS_INSURANCE_COMPANIES_CATALOG,
} from "../guaranteeModules/guaranteeCompanyCatalog.js";
import type { DmsGuaranteeLetter } from "../guaranteeModules/guaranteeTypes.js";
import type {
	DmsBillableItem,
	PatientPaymentMethod,
} from "../dmsFranchiseEngine.js";
import type { ClinicLegalInfo } from "../../sanpin/index.js";
import type { DmsSplitCalculationResult } from "../../schemas/dmsSplitAndScalePresetSchemas.js";

export type { ClinicLegalInfo };

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
export type DmsGuaranteeLetterRecord = DmsGuaranteeLetter | {
	readonly id: string;
	readonly letterNumber: string;
	readonly insurerId?: string | undefined;
	readonly insurerName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly programKey?: string | undefined;
	readonly issueDate: string;
	readonly validFrom?: string | undefined;
	readonly validTo?: string | undefined;
	readonly validUntil?: string | undefined;
	readonly totalLimitKopecks?: number | undefined;
	readonly usedAmountKopecks?: number | undefined;
	readonly limitKopecks?: number | undefined;
	readonly usedKopecks?: number | undefined;
	readonly remainingLimitKopecks?: number | undefined;
	readonly defaultFranchisePercent?: number | undefined;
	readonly approvedNomenclatureCodes?: readonly string[] | undefined;
	readonly approvedTeeth?: readonly string[] | undefined;
	readonly diagnosisMkb10?: readonly string[] | undefined;
	readonly curatorFullName?: string | undefined;
	readonly curatorPhone?: string | undefined;
	readonly curatorEmail?: string | undefined;
	readonly attachedXrayUris?: readonly string[] | undefined;
	readonly status: DmsGuaranteeLetter["status"];
	readonly notes?: string | undefined;
};
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

const STANDARD_THERAPY: DmsProgramDefinition = {
	key: "standard_therapy",
	id: "standard_therapy",
	name: "Базовая терапия",
	description: "Терапевтическое лечение",
	coversImplantation: false,
	coversVeneers: false,
	coversBleaching: false,
	maxHygienePerYear: 1,
	defaultLimitKopecks: 5000000,
};

const VIP_FULL_COVERAGE: DmsProgramDefinition = {
	key: "vip_full_coverage",
	id: "vip_full_coverage",
	name: "VIP Полное покрытие",
	description: "Полный спектр",
	coversImplantation: true,
	coversVeneers: false,
	coversBleaching: true,
	coversCt3D: true,
	maxHygienePerYear: 2,
	defaultLimitKopecks: 30000000,
};

const EXTENDED_SURGERY_HYGIENE: DmsProgramDefinition = {
	key: "extended_surgery_hygiene",
	id: "extended_surgery_hygiene",
	name: "Расширенная с хирургией",
	description: "Терапия и хирургия",
	coversImplantation: false,
	coversVeneers: false,
	coversBleaching: false,
	maxHygienePerYear: 2,
	defaultLimitKopecks: 10000000,
};

const ECONOMY_EMERGENCY_ONLY: DmsProgramDefinition = {
	key: "economy_emergency_only",
	id: "economy_emergency_only",
	name: "Экстренная помощь",
	description: "Только острая боль",
	coversImplantation: false,
	coversVeneers: false,
	coversBleaching: false,
	maxHygienePerYear: 0,
	defaultLimitKopecks: 2000000,
};

const BASE_PROGRAM_LIST: readonly DmsProgramDefinition[] = [
	STANDARD_THERAPY,
	VIP_FULL_COVERAGE,
	EXTENDED_SURGERY_HYGIENE,
	ECONOMY_EMERGENCY_ONLY,
];

const programsRecord: Record<string, DmsProgramDefinition> = {
	standard_therapy: STANDARD_THERAPY,
	vip_full_coverage: VIP_FULL_COVERAGE,
	extended_surgery_hygiene: EXTENDED_SURGERY_HYGIENE,
	economy_emergency_only: ECONOMY_EMERGENCY_ONLY,
};

export type StatutoryDmsProgramsMap = Record<string, DmsProgramDefinition> & readonly DmsProgramDefinition[];

export const STATUTORY_DMS_PROGRAMS: StatutoryDmsProgramsMap = Object.assign(
	[...BASE_PROGRAM_LIST],
	programsRecord,
);

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
export const DEFAULT_STATUTORY_INSURANCE_CONTRACT: StatutoryInsuranceContract = DEFAULT_STATUTORY_INSURANCE_CONTRACTS[0] ?? {
	insurerKey: "sogaz",
	insurerShortName: "АО «СОГАЗ»",
	contractNumber: "ДМС-СОГ-2026/01",
	defaultFranchisePct: 0,
	inn: "7736035485",
};

export function getDmsInsurerById(id: string): DmsInsurer | undefined {
	const norm = (id || "").toLowerCase().replace(/_/g, "");
	return RUSSIAN_DMS_INSURERS.find((i) => {
		const inorm = i.id.toLowerCase().replace(/_/g, "");
		const knorm = (i.key || "").toLowerCase().replace(/_/g, "");
		return inorm === norm || knorm === norm || (norm.includes("reso") && inorm.includes("reso")) || (norm.includes("alfa") && inorm.includes("alfa"));
	});
}

export const getStatutoryInsurerById = getDmsInsurerById;

const DEFAULT_DMS_PROGRAM_FALLBACK: DmsProgramDefinition = {
	key: "standard_therapy",
	id: "standard_therapy",
	name: "Базовая терапия",
	description: "Терапевтическое лечение",
	coversImplantation: false,
	coversVeneers: false,
	coversBleaching: false,
	maxHygienePerYear: 1,
	defaultLimitKopecks: 5000000,
};

export function getStatutoryProgramByKey(key: string): DmsProgramDefinition {
	const found = STATUTORY_DMS_PROGRAMS[key] ?? BASE_PROGRAM_LIST.find((p) => p.key === key || p.id === key);
	if (found) return found;
	return DEFAULT_DMS_PROGRAM_FALLBACK;
}

export function validateDmsPolicy(
	policy: Partial<DmsPolicy>,
	checkDateStr = new Date().toISOString().slice(0, 10),
): { isValid: boolean; errors: string[] } {
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
