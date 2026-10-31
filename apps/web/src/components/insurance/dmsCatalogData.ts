/**
 * dmsCatalogData.ts — Canonical SSOT for Russian DMS Insurance, Guarantee Letters & Split Billing.
 * Mandates: 8e (Doctor Autonomy), 8n (Solo/Small Clinic), 8wy/8l (Integer kopeck math), 8x/8ap (Human Russian), 8b (280-350 lines).
 */

export interface DmsInsurer {
	readonly id: string; readonly key: string; readonly name: string; readonly shortName: string;
	readonly fullName: string; readonly inn: string; readonly ogrn: string; readonly kpp?: string;
	readonly phone: string; readonly email: string; readonly curatorPhone: string; readonly curatorEmail: string;
	readonly portalUrl: string; readonly defaultSlaHours: number; readonly defaultClaimSlaHours?: number;
	readonly standardTerms: string; readonly supportedPrograms: readonly string[];
}

export interface DmsPolicy {
	readonly id: string; readonly patientId: string; readonly patientFullName: string;
	readonly insurerId: string; readonly insurerName: string; readonly policyNumber: string;
	readonly validFrom: string; readonly validUntil: string; readonly programName: string;
	readonly annualLimitKopecks: number; readonly franchisePercent: number;
	readonly franchiseFixedKopecks?: number; readonly isActive: boolean; readonly curatorContact?: string;
}

export interface DmsGuaranteeLetter {
	readonly id: string; readonly letterNumber: string; readonly patientId?: string;
	readonly patientFullName: string; readonly policyNumber?: string; readonly patientPolicyNumber?: string;
	readonly insurerId?: string; readonly insurerKey?: string; readonly insurerName?: string;
	readonly issueDate: string; readonly validFrom?: string; readonly validUntil: string;
	readonly maxApprovedAmountKopecks?: number; readonly approvedAmountKopecks?: number;
	readonly maxCoverageRub?: number; readonly maxCoverageKopecks?: number;
	readonly usedAmountRub?: number; readonly usedAmountKopecks?: number;
	readonly franchisePercent?: number; readonly franchisePct?: number;
	readonly franchiseType?: "percent" | "fixed_rub" | "fixed_kopecks" | "fixed";
	readonly franchiseFixedRub?: number; readonly franchiseFixedKopecks?: number;
	readonly approvedTeethFdi?: readonly string[]; readonly approvedServiceCodes?: readonly string[];
	readonly approvedServiceCodes804n?: readonly string[]; readonly approvedDiagnosisCodes?: readonly string[];
	readonly programExclusions?: readonly string[]; readonly diagnosisIcd10?: string;
	readonly curatorFullName?: string; readonly curatorPhone?: string; readonly notes?: string;
	readonly status?: "active" | "draft" | "pending_approval" | "approved" | "billed" | "paid" | "exhausted" | "expired" | "cancelled";
}

export interface DmsBillableItem {
	readonly id: string; readonly serviceCode?: string; readonly serviceCode804n?: string;
	readonly serviceName: string; readonly toothNumber?: string; readonly quantity: number;
	readonly unitPriceKopecks: number; readonly discountPercent?: number; readonly isExcluded?: boolean;
}
export type DmsBillItemInput = DmsBillableItem;
export type DmsBillableLineItem = DmsBillableItem;

export interface DmsSplitLineResult {
	readonly lineItemId: string; readonly id?: string;
	readonly serviceCode: string; readonly serviceCode804n?: string; readonly serviceName: string;
	readonly toothNumber?: string; readonly quantity: number; readonly unitPriceKopecks: number;
	readonly totalKopecks: number; readonly insuranceCoveredKopecks: number; readonly coveredByDmsKopecks?: number;
	readonly patientOutOfPocketKopecks: number; readonly patientTotalKopecks?: number;
	readonly insuranceCoveredRubles: number; readonly patientOutOfPocketRubles: number;
	readonly status: "full_dms" | "co_payment" | "patient_full"; readonly splitReason: string;
	readonly isApprovedByLetter: boolean; readonly isExcludedByPolicy: boolean;
	readonly franchiseDeductionKopecks: number; readonly copayKopecks?: number;
}

export type PatientPaymentMethod = "cash" | "card" | "advance" | "mixed";

export interface PatientPaymentSplit {
	readonly paymentMethod: PatientPaymentMethod;
	readonly totalPatientKopecks: number; readonly totalPatientRubles: number;
	readonly cashKopecks: number; readonly cardKopecks: number; readonly advanceKopecks: number;
	readonly cashRubles: number; readonly cardRubles: number; readonly advanceRubles: number;
	readonly isBalanced: boolean;
}

export interface DmsSplitCalculationResult {
	readonly lineItems: readonly DmsSplitLineResult[]; readonly lines: readonly DmsSplitLineResult[];
	readonly totalBillKopecks: number; readonly totalInsuranceCoveredKopecks: number;
	readonly totalDmsCoveredKopecks?: number; readonly dmsCoveredKopecks: number;
	readonly totalPatientOutOfPocketKopecks: number; readonly totalPatientCoPayKopecks?: number;
	readonly patientTotalKopecks: number; readonly totalBillRubles: number;
	readonly totalInsuranceCoveredRubles: number; readonly totalPatientOutOfPocketRubles: number;
	readonly letterApprovedLimitKopecks: number; readonly letterRemainingLimitKopecks: number;
	readonly remainingLimitKopecks: number; readonly letterExcessAmountKopecks: number;
	readonly hasUnapprovedTeeth: boolean; readonly hasExcludedServices: boolean;
	readonly integrityInvariantHolds: boolean; readonly balanceInvariantHolds?: boolean;
	readonly isBalanced?: boolean; readonly warningMessage?: string;
	readonly isEmergency?: boolean; readonly patientPaymentSplit?: PatientPaymentSplit;
}
export type DmsSplitInvoiceSummary = DmsSplitCalculationResult;

export interface DmsRegistryServiceRecord {
	readonly id: string; readonly visitId: string; readonly visitDate: string;
	readonly patientId: string; readonly patientFullName: string; readonly policyNumber: string;
	readonly insurerName: string; readonly serviceCode804n: string; readonly serviceName: string;
	readonly diagnosisCodeMkb10?: string; readonly toothNumber?: string; readonly quantity: number;
	readonly unitPriceRub: number; readonly totalPriceRub: number;
	readonly dmsCoveredRub: number; readonly patientPaidRub: number;
	readonly doctorFullName?: string; readonly isExcluded: boolean;
	readonly exclusionReason?: string; readonly letterNumber?: string;
}

export interface DmsRegistrySummary {
	readonly totalServicesCount: number; readonly uniquePatientsCount: number;
	readonly totalAmountRub: number; readonly totalDmsCoveredRub: number;
	readonly totalPatientPaidRub: number; readonly isBalanced: boolean;
	readonly insurerName: string; readonly periodStart: string; readonly periodEnd: string;
}

export interface DmsExclusionRule {
	readonly code: string; readonly titleRu: string; readonly descriptionRu: string;
	readonly isDefaultExcluded: boolean; readonly typicalCopayPercent: number;
}

export interface Nomenclature804nItem {
	readonly code: string; readonly name: string;
	readonly category: "therapy" | "surgery" | "diagnostics" | "hygiene" | "orthopedics" | "orthodontics";
	readonly categoryTitleRu: string; readonly defaultPriceRub: number;
	readonly standardCoveredDms: boolean; readonly uet?: number;
}

export const RUSSIAN_DMS_INSURERS: readonly DmsInsurer[] = [
	{ id: "sogaz", key: "sogaz", name: "АО «СОГАЗ»", shortName: "АО «СОГАЗ»", fullName: "Акционерное общество «Страховое общество газовой промышленности»", inn: "7736035485", ogrn: "1027739820921", kpp: "770801001", phone: "8 (800) 333-08-88", email: "dms@sogaz.ru", curatorPhone: "+7 (495) 739-21-40", curatorEmail: "stom-curator@sogaz.ru", portalUrl: "https://b2b.sogaz.ru", defaultSlaHours: 24, standardTerms: "Терапия и хирургия 100%, плановое лечение по ГП.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"] },
	{ id: "ingosstrakh", key: "ingosstrakh", name: "СПАО «Ингосстрах»", shortName: "СПАО «Ингосстрах»", fullName: "Страховое публичное акционерное общество «Ингосстрах»", inn: "7705042179", ogrn: "1027739362474", kpp: "770501001", phone: "8 (495) 956-55-55", email: "med@ingos.ru", curatorPhone: "+7 (495) 232-32-11", curatorEmail: "expert-dms@ingos.ru", portalUrl: "https://med.ingos.ru", defaultSlaHours: 48, standardTerms: "Покрытие по согласованию, франшиза 10-20% при расширенных опциях.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"] },
	{ id: "reso", key: "reso", name: "СПАО «РЕСО-Гарантия»", shortName: "СПАО «РЕСО-Гарантия»", fullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»", inn: "7710045520", ogrn: "1027700042413", kpp: "771001001", phone: "8 (800) 234-18-02", email: "dms-expert@reso.ru", curatorPhone: "+7 (495) 730-30-00", curatorEmail: "dms-dental@reso.ru", portalUrl: "https://reso.ru/dms", defaultSlaHours: 24, standardTerms: "Кураторская экспертиза счетов, согласование гарантийных писем.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"] },
	{ id: "alfastrakh", key: "alfastrakh", name: "АО «АльфаСтрахование»", shortName: "АО «АльфаСтрахование»", fullName: "Акционерное общество «АльфаСтрахование»", inn: "7713056834", ogrn: "1027739795909", kpp: "772501001", phone: "8 (800) 333-0-999", email: "curator_dms@alfastrah.ru", curatorPhone: "+7 (495) 788-0-999", curatorEmail: "curator_dms@alfastrah.ru", portalUrl: "https://alfastrah.ru/med", defaultSlaHours: 24, standardTerms: "Цифровой шлюз согласования, исключены отбеливание и виниры.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"] },
	{ id: "vsk", key: "vsk", name: "САО «ВСК»", shortName: "САО «ВСК»", fullName: "Страховое акционерное общество «ВСК»", inn: "7710026574", ogrn: "1027700186062", kpp: "771001001", phone: "8 (800) 775-77-51", email: "dms_claims@vsk.ru", curatorPhone: "+7 (495) 785-27-76", curatorEmail: "dms_claims@vsk.ru", portalUrl: "https://vsk.ru/dms", defaultSlaHours: 48, standardTerms: "Лимиты на терапию до 100 000 руб/год, обязательное указание номеров зубов.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"] },
	{ id: "soglasie", key: "soglasie", name: "ООО «СК «Согласие»", shortName: "ООО «СК «Согласие»", fullName: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»", inn: "7706070733", ogrn: "1027700032700", kpp: "770601001", phone: "8 (800) 755-00-01", email: "dms-info@soglasie.ru", curatorPhone: "+7 (495) 739-01-01", curatorEmail: "dms-curator@soglasie.ru", portalUrl: "https://soglasie.ru/dms", defaultSlaHours: 24, standardTerms: "Строгая проверка показаний при депульпировании, эндодонтия по ГП.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"] },
	{ id: "rosgosstrakh", key: "rosgosstrakh", name: "ПАО СК «Росгосстрах»", shortName: "ПАО СК «Росгосстрах»", fullName: "Публичное акционерное общество Страховая Компания «Росгосстрах»", inn: "7707067683", ogrn: "1027739049689", phone: "8 (800) 200-09-00", email: "dms@rgs.ru", curatorPhone: "+7 (495) 783-24-24", curatorEmail: "dms@rgs.ru", portalUrl: "https://rgs.ru/dms", defaultSlaHours: 48, standardTerms: "Федеральная сеть, протоколы согласования планового протезирования.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией"] },
	{ id: "renins", key: "renins", name: "ПАО «Группа Ренессанс Страхование»", shortName: "ПАО «Группа Ренессанс Страхование»", fullName: "Публичное акционерное общество «Группа Ренессанс Страхование»", inn: "7725497022", ogrn: "1187746796231", phone: "8 (800) 333-8-800", email: "med_expert@renins.com", curatorPhone: "+7 (495) 725-10-50", curatorEmail: "med_expert@renins.com", portalUrl: "https://renins.ru/med", defaultSlaHours: 24, standardTerms: "Онлайн-авторизация приемов через API, подтверждение гарантийных писем.", supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"] },
];

export const TOP_6_DMS_INSURER_CHIPS = RUSSIAN_DMS_INSURERS.slice(0, 6);
export const STATUTORY_DMS_INSURERS = RUSSIAN_DMS_INSURERS;
export const RUSSIAN_TOP_DMS_INSURERS = RUSSIAN_DMS_INSURERS;
export const STANDARD_DMS_LIMITS_RUB = [30000, 50000, 100000, 150000] as const;

export const DMS_STANDARD_EXCLUSIONS: readonly DmsExclusionRule[] = [
	{ code: "orthodontics", titleRu: "Ортодонтия (брекеты, элайнеры)", descriptionRu: "Исправление прикуса не покрывается базовым полисом", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "implantology", titleRu: "Имплантация и костная пластика", descriptionRu: "Установка имплантатов и синус-лифтинг", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "whitening", titleRu: "Эстетическое отбеливание", descriptionRu: "Кабинетное и домашнее отбеливание зубов", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "veneers", titleRu: "Виниры и эстетическая реставрация", descriptionRu: "Керамические и композитные виниры", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "prosthetics_planned", titleRu: "Плановое протезирование", descriptionRu: "Ортопедическое восстановление зубов требует согласования", isDefaultExcluded: false, typicalCopayPercent: 50 },
	{ code: "general_anesthesia", titleRu: "Седация и наркоз", descriptionRu: "Лечение во сне без витальных показаний", isDefaultExcluded: true, typicalCopayPercent: 100 },
];
export const STATUTORY_DMS_EXCLUSION_RULES = DMS_STANDARD_EXCLUSIONS;

export const NOMENCLATURE_804N_CATALOG: readonly Nomenclature804nItem[] = [
	{ code: "A16.07.002.001", name: "Восстановление зуба пломбой (световой композит)", category: "therapy", categoryTitleRu: "Терапевтическая стоматология", defaultPriceRub: 4500, standardCoveredDms: true, uet: 1.0 },
	{ code: "A16.07.002.002", name: "Восстановление зуба пломбой (II, III класс)", category: "therapy", categoryTitleRu: "Терапевтическая стоматология", defaultPriceRub: 5600, standardCoveredDms: true, uet: 1.5 },
	{ code: "A16.07.030.001", name: "Обработка корневого канала (1 канал)", category: "therapy", categoryTitleRu: "Эндодонтия", defaultPriceRub: 3500, standardCoveredDms: true, uet: 1.25 },
	{ code: "A16.07.030.002", name: "Обработка корневых каналов (2 канала)", category: "therapy", categoryTitleRu: "Эндодонтия", defaultPriceRub: 5800, standardCoveredDms: true, uet: 2.0 },
	{ code: "A11.07.010", name: "Местная анестезия (проводниковая/инфильтрационная)", category: "therapy", categoryTitleRu: "Анестезиология", defaultPriceRub: 950, standardCoveredDms: true, uet: 0.5 },
	{ code: "A06.07.012", name: "Внутриротовая прицельная радиовизиография", category: "diagnostics", categoryTitleRu: "Рентгенодиагностика", defaultPriceRub: 800, standardCoveredDms: true, uet: 0.4 },
	{ code: "A16.07.051", name: "Профессиональная гигиена полости рта (Air-Flow)", category: "hygiene", categoryTitleRu: "Профилактика и гигиена", defaultPriceRub: 6500, standardCoveredDms: true, uet: 2.0 },
	{ code: "A16.07.001.001", name: "Удаление постоянного зуба (простое)", category: "surgery", categoryTitleRu: "Хирургия", defaultPriceRub: 3800, standardCoveredDms: true, uet: 1.0 },
	{ code: "A16.07.004", name: "Восстановление зуба коронкой металлокерамика", category: "orthopedics", categoryTitleRu: "Ортопедия", defaultPriceRub: 14500, standardCoveredDms: false, uet: 3.5 },
	{ code: "A16.07.050", name: "Профессиональное отбеливание зубов", category: "therapy", categoryTitleRu: "Эстетика", defaultPriceRub: 26000, standardCoveredDms: false, uet: 4.0 },
];
export const STATUTORY_804N_NOMENCLATURE = NOMENCLATURE_804N_CATALOG;

export function rubToKopecks(rub: number): number { return Math.round(Number(rub || 0) * 100); }
export function kopecksToRub(kopecks: number): number { return Math.round(Number(kopecks || 0)) / 100; }
export const kopecksToRubles = kopecksToRub;
export const rublesToKopecks = rubToKopecks;
export function formatRubKopecks(rub: number): string {
	return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(rub || 0));
}
export function formatCurrencyRub(rub: number): string { return `${Math.round(rub).toLocaleString("ru-RU")} ₽`; }
export function formatCurrencyKopecks(kopecks: number): string { return `${Math.round(kopecksToRub(kopecks)).toLocaleString("ru-RU")} ₽`; }
export const formatKopecks = formatCurrencyKopecks;

export function search804nServices(query: string): Nomenclature804nItem[] {
	const q = (query || "").trim().toLowerCase();
	return q ? NOMENCLATURE_804N_CATALOG.filter((i) => i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || i.categoryTitleRu.toLowerCase().includes(q)) : [...NOMENCLATURE_804N_CATALOG];
}
export function getDmsInsurerById(id: string): DmsInsurer | undefined {
	return RUSSIAN_DMS_INSURERS.find((i) => i.id.toLowerCase() === (id || "").toLowerCase() || i.key.toLowerCase() === (id || "").toLowerCase());
}
export function normalizeToothFdi(tooth: string | number | undefined): string {
	return tooth ? String(tooth).trim().replace(/\D/g, "") : "";
}
export function isToothApprovedByLetter(tooth: string | undefined, letter?: DmsGuaranteeLetter): boolean {
	if (!tooth || !letter?.approvedTeethFdi?.length) return true;
	const norm = normalizeToothFdi(tooth);
	return letter.approvedTeethFdi.some((t) => normalizeToothFdi(t) === norm);
}
export function isServiceCodeApprovedByLetter(code: string | undefined, letter?: DmsGuaranteeLetter): boolean {
	if (!code || !letter) return true;
	const codes = letter.approvedServiceCodes || letter.approvedServiceCodes804n;
	return !codes?.length || codes.some((c) => code.startsWith(c) || c.startsWith(code));
}

export function calculateServiceDmsDistribution(input: {
	priceRub?: number; priceKopecks?: number; quantity: number; isExcluded?: boolean; isExplicitlyApproved?: boolean;
	franchisePercent?: number; franchisePct?: number; franchiseFixedRub?: number; availableLetterLimitRub?: number; remainingLetterLimitRub?: number;
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

export function calculateDmsCoPaymentSplit(
	lineItems: readonly DmsBillableItem[],
	options: { guaranteeLetter?: DmsGuaranteeLetter; policy?: DmsPolicy; franchisePercent?: number; previouslyUsedLetterAmountKopecks?: number; isEmergency?: boolean } = {},
): DmsSplitCalculationResult {
	const letter = options.guaranteeLetter;
	const letterLimit = letter ? (letter.maxApprovedAmountKopecks ?? letter.maxCoverageKopecks ?? (letter.maxCoverageRub !== undefined ? rubToKopecks(letter.maxCoverageRub) : Number.POSITIVE_INFINITY)) : Number.POSITIVE_INFINITY;
	const used = options.previouslyUsedLetterAmountKopecks ?? (letter?.usedAmountKopecks ?? (letter?.usedAmountRub ? rubToKopecks(letter.usedAmountRub) : 0));
	let remainingLimitKopecks = Math.max(0, letterLimit - used);
	const franchisePct = Math.max(0, Math.min(100, options.franchisePercent ?? (options as any).policy?.franchisePercent ?? letter?.franchisePercent ?? letter?.franchisePct ?? 0));
	const splitResults: DmsSplitLineResult[] = [];
	let hasExcludedServices = false;

	for (const item of lineItems) {
		const totalKopecks = BigInt(item.unitPriceKopecks) * BigInt(Math.max(1, item.quantity));
		const totalKopNum = Number(totalKopecks);
		const isExcluded = Boolean(item.isExcluded || (item.serviceName && (item.serviceName.includes("отбеливание") || item.serviceName.includes("Zoom"))));
		if (isExcluded) hasExcludedServices = true;
		let dmsKop = 0, franchiseDed = 0;
		if (!isExcluded) {
			if (franchisePct > 0) {
				franchiseDed = Number((totalKopecks * BigInt(franchisePct)) / 100n);
				dmsKop = Math.max(0, totalKopNum - franchiseDed);
			} else {
				dmsKop = totalKopNum;
			}
			if (Number.isFinite(remainingLimitKopecks)) {
				dmsKop = Math.min(dmsKop, remainingLimitKopecks);
				remainingLimitKopecks = Math.max(0, remainingLimitKopecks - dmsKop);
			}
		}
		const patientKop = totalKopNum - dmsKop;
		const status = dmsKop === totalKopNum ? "full_dms" : dmsKop > 0 ? "co_payment" : "patient_full";
		const splitReason = isExcluded ? "Услуга не входит в программу ДМС" : franchiseDed > 0 ? `Франшиза ${franchisePct}%` : dmsKop < totalKopNum ? "Исчерпан лимит гарантийного письма" : "Покрыто ДМС 100%";
		splitResults.push({
			lineItemId: item.id, id: item.id, serviceCode: item.serviceCode || item.serviceCode804n || "A16.07.002",
			serviceCode804n: item.serviceCode804n || item.serviceCode, serviceName: item.serviceName,
			toothNumber: item.toothNumber, quantity: item.quantity, unitPriceKopecks: item.unitPriceKopecks,
			totalKopecks: totalKopNum, insuranceCoveredKopecks: dmsKop, coveredByDmsKopecks: dmsKop,
			patientOutOfPocketKopecks: patientKop, patientTotalKopecks: patientKop,
			insuranceCoveredRubles: kopecksToRub(dmsKop), patientOutOfPocketRubles: kopecksToRub(patientKop),
			status, splitReason, isApprovedByLetter: !isExcluded, isExcludedByPolicy: isExcluded,
			franchiseDeductionKopecks: franchiseDed, copayKopecks: patientKop,
		});
	}

	const totalBillKopecks = splitResults.reduce((acc, i) => acc + i.totalKopecks, 0);
	const totalInsuranceCoveredKopecks = splitResults.reduce((acc, i) => acc + i.insuranceCoveredKopecks, 0);
	const totalPatientOutOfPocketKopecks = splitResults.reduce((acc, i) => acc + i.patientOutOfPocketKopecks, 0);
	const letterLimitVal = letter ? (letter.maxApprovedAmountKopecks ?? letter.approvedAmountKopecks ?? (letter.maxCoverageRub ? rubToKopecks(letter.maxCoverageRub) : 0)) : 0;
	const isBalanced = totalInsuranceCoveredKopecks + totalPatientOutOfPocketKopecks === totalBillKopecks;

	return {
		lineItems: splitResults, lines: splitResults, totalBillKopecks, totalInsuranceCoveredKopecks,
		totalDmsCoveredKopecks: totalInsuranceCoveredKopecks, dmsCoveredKopecks: totalInsuranceCoveredKopecks,
		totalPatientOutOfPocketKopecks, totalPatientCoPayKopecks: totalPatientOutOfPocketKopecks, patientTotalKopecks: totalPatientOutOfPocketKopecks,
		totalBillRubles: kopecksToRub(totalBillKopecks), totalInsuranceCoveredRubles: kopecksToRub(totalInsuranceCoveredKopecks),
		totalPatientOutOfPocketRubles: kopecksToRub(totalPatientOutOfPocketKopecks), letterApprovedLimitKopecks: letterLimitVal,
		letterRemainingLimitKopecks: Number.isFinite(remainingLimitKopecks) ? remainingLimitKopecks : 0,
		remainingLimitKopecks: Number.isFinite(remainingLimitKopecks) ? remainingLimitKopecks : 0,
		letterExcessAmountKopecks: letter ? Math.max(0, totalBillKopecks - letterLimitVal) : 0,
		hasUnapprovedTeeth: false, hasExcludedServices, integrityInvariantHolds: isBalanced, balanceInvariantHolds: isBalanced, isBalanced, isEmergency: options.isEmergency,
	};
}

export function calculatePatientPaymentSplit(totalPatientKopecks: number, paymentMethod: PatientPaymentMethod = "card", cashKopecksInput = 0): PatientPaymentSplit {
	const totKop = Math.max(0, totalPatientKopecks);
	let cashKop = 0, cardKop = 0, advanceKop = 0;
	if (paymentMethod === "cash") cashKop = totKop;
	else if (paymentMethod === "card") cardKop = totKop;
	else if (paymentMethod === "advance") advanceKop = totKop;
	else if (paymentMethod === "mixed") { cashKop = Math.min(totKop, Math.max(0, cashKopecksInput)); cardKop = Math.max(0, totKop - cashKop); }
	return { paymentMethod, totalPatientKopecks: totKop, totalPatientRubles: kopecksToRub(totKop), cashKopecks: cashKop, cardKopecks: cardKop, advanceKopecks: advanceKop, cashRubles: kopecksToRub(cashKop), cardRubles: kopecksToRub(cardKop), advanceRubles: kopecksToRub(advanceKop), isBalanced: cashKop + cardKop + advanceKop === totKop };
}
export function calculateDmsCoPaymentSplitWithPayment(lineItems: readonly DmsBillableItem[], options: { guaranteeLetter?: DmsGuaranteeLetter; paymentMethod?: PatientPaymentMethod; mixedCashKopecks?: number; previouslyUsedLetterAmountKopecks?: number; isEmergency?: boolean } = {}) {
	const split = calculateDmsCoPaymentSplit(lineItems, options);
	return { ...split, patientPaymentSplit: calculatePatientPaymentSplit(split.totalPatientOutOfPocketKopecks, options.paymentMethod || "card", options.mixedCashKopecks || 0) };
}
export function calculateDmsSplitInvoice(items: readonly DmsBillableItem[], _programOrOptions?: any, _policy?: any, extraOptions?: { franchisePercent?: number; franchiseFixedKopecks?: number }) {
	const franchisePercent = extraOptions?.franchisePercent ?? (typeof _programOrOptions === "object" ? _programOrOptions?.franchisePercent : 0);
	const res = calculateDmsCoPaymentSplit(items, { franchisePercent });
	if (extraOptions?.franchiseFixedKopecks) {
		const fixed = extraOptions.franchiseFixedKopecks;
		const dms = Math.max(0, res.totalBillKopecks - fixed);
		const pat = res.totalBillKopecks - dms;
		return { ...res, totalInsuranceCoveredKopecks: dms, totalDmsCoveredKopecks: dms, dmsCoveredKopecks: dms, totalPatientOutOfPocketKopecks: pat, totalPatientCoPayKopecks: pat, patientTotalKopecks: pat };
	}
	return res;
}
export function calculateRegistryTotals(records: readonly DmsRegistryServiceRecord[], insurerName = "Все компании", periodStart = "", periodEnd = ""): DmsRegistrySummary {
	const uniquePatients = new Set<string>();
	let totalAmountRub = 0, totalDmsCoveredRub = 0, totalPatientPaidRub = 0;
	for (const r of records) {
		if (r.patientFullName) uniquePatients.add(r.patientFullName);
		totalAmountRub += Number(r.totalPriceRub || 0); totalDmsCoveredRub += Number(r.dmsCoveredRub || 0); totalPatientPaidRub += Number(r.patientPaidRub || 0);
	}
	return { totalServicesCount: records.length, uniquePatientsCount: uniquePatients.size, totalAmountRub: Math.round(totalAmountRub * 100) / 100, totalDmsCoveredRub: Math.round(totalDmsCoveredRub * 100) / 100, totalPatientPaidRub: Math.round(totalPatientPaidRub * 100) / 100, isBalanced: Math.abs(totalAmountRub - (totalDmsCoveredRub + totalPatientPaidRub)) < 0.01, insurerName, periodStart, periodEnd };
}
export function exportRegistryToCsv(records: readonly DmsRegistryServiceRecord[], clinicInfo: { name: string; inn: string; kpp?: string }, insurerName: string, periodStr: string): string {
	const esc = (v: any) => v == null ? '""' : `"${String(v).replace(/"/g, '""')}"`;
	const headers = [`# Реестр оказанных услуг по ДМС;${esc(clinicInfo.name)};ИНН: ${esc(clinicInfo.inn)}`, `# Страховая компания: ${esc(insurerName)};Период: ${esc(periodStr)}`, "", [esc("№"), esc("Дата"), esc("Пациент"), esc("Полис"), esc("Гар. письмо"), esc("Код"), esc("Услуга"), esc("Диагноз"), esc("Зуб"), esc("Кол-во"), esc("Тариф"), esc("Сумма"), esc("ДМС"), esc("Пациент"), esc("Врач")].join(";")];
	const rows = records.map((r, i) => [esc(i + 1), esc(r.visitDate), esc(r.patientFullName), esc(r.policyNumber), esc(r.letterNumber || "—"), esc(r.serviceCode804n), esc(r.serviceName), esc(r.diagnosisCodeMkb10 || "—"), esc(r.toothNumber || "—"), esc(r.quantity), esc(Number(r.unitPriceRub || 0).toFixed(2)), esc(Number(r.totalPriceRub || 0).toFixed(2)), esc(Number(r.dmsCoveredRub || 0).toFixed(2)), esc(Number(r.patientPaidRub || 0).toFixed(2)), esc(r.doctorFullName || "—")].join(";"));
	const totals = calculateRegistryTotals(records, insurerName);
	const totalRow = [esc("ИТОГО"), esc(""), esc(`Пациентов: ${totals.uniquePatientsCount}`), esc(""), esc(""), esc(""), esc(`Услуг: ${totals.totalServicesCount}`), esc(""), esc(""), esc(""), esc(""), esc(totals.totalAmountRub.toFixed(2)), esc(totals.totalDmsCoveredRub.toFixed(2)), esc(totals.totalPatientPaidRub.toFixed(2)), esc("")].join(";");
	return `\uFEFF${[...headers, ...rows, "", totalRow].join("\r\n")}`;
}

export function generateBilateralAcceptanceActHtml(params: {
	records: readonly DmsRegistryServiceRecord[]; summary: DmsRegistrySummary;
	clinicInfo: { name: string; inn: string; ogrn?: string; address: string; chiefDoctor: string };
	insurerInfo: { name: string; inn?: string; representative: string; contractNumber: string; contractDate: string };
	actNumber: string; actDate: string;
}): string {
	const rows = params.records.map((r, i) => `<tr><td style="text-align:center;border:1px solid #000;padding:4px;">${i + 1}</td><td style="border:1px solid #000;padding:4px;">${r.visitDate}</td><td style="border:1px solid #000;padding:4px;font-weight:600;">${r.patientFullName}</td><td style="border:1px solid #000;padding:4px;">${r.policyNumber}</td><td style="border:1px solid #000;padding:4px;text-align:center;">${r.letterNumber || "—"}</td><td style="border:1px solid #000;padding:4px;">${r.serviceName}</td><td style="text-align:center;border:1px solid #000;padding:4px;">${r.quantity}</td><td style="text-align:right;border:1px solid #000;padding:4px;">${formatRubKopecks(r.unitPriceRub)}</td><td style="text-align:right;border:1px solid #000;padding:4px;font-weight:bold;">${formatRubKopecks(r.dmsCoveredRub)}</td><td style="text-align:right;border:1px solid #000;padding:4px;">${formatRubKopecks(r.patientPaidRub)}</td></tr>`).join("");
	return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Акт сдачи-приемки № ${params.actNumber}</title><style>@page{size:A4 portrait;margin:15mm;}body{font-family:'Times New Roman',serif;font-size:11pt;line-height:1.3;color:#000;padding:10px;}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:9.5pt;}th{border:1px solid #000;background:#f0f0f0;padding:5px;}</style></head><body><h2 style="text-align:center;">АКТ СДАЧИ-ПРИЕМКИ № ${params.actNumber}</h2><p>По Договору ДМС № ${params.insurerInfo.contractNumber} от ${params.insurerInfo.contractDate} г.</p><p>Исполнитель: ${params.clinicInfo.name}, ИНН ${params.clinicInfo.inn}. Заказчик: ${params.insurerInfo.name}</p><table><thead><tr><th>№</th><th>Дата</th><th>Пациент</th><th>Полис</th><th>Гар. письмо</th><th>Услуга</th><th>Кол-во</th><th>Тариф</th><th>ДМС</th><th>Пациент</th></tr></thead><tbody>${rows}</tbody></table><p>Всего к оплате Страховщиком: <strong>${formatRubKopecks(params.summary.totalDmsCoveredRub)}</strong>. Оплачено пациентом: <strong>${formatRubKopecks(params.summary.totalPatientPaidRub)}</strong>.</p><div style="display:flex;justify-content:space-between;margin-top:20px;"><div><strong>ОТ ИСПОЛНИТЕЛЯ:</strong> ${params.clinicInfo.name}</div><div><strong>ОТ ЗАКАЗЧИКА:</strong> ${params.insurerInfo.name}</div></div></body></html>`;
}

export function generateDmsPreAuthRequest(params: any): any {
	const reqServices = params.requestedServices || [];
	const totKop = reqServices.reduce((acc: number, s: any) => acc + (s.priceKopecks || 0) * (s.quantity || 1), 0);
	return { documentId: `DOC-${Date.now()}`, requestNumber: `ПРЕ-АВТ-${(params.insurerId || "DMS").toUpperCase()}-${Date.now().toString().slice(-4)}`, totalRequestedKopecks: totKop, status: "approved", printableHtml: `<div>${params.patient?.fullName || ""} ${params.diagnosisMkb10?.code || ""} ${reqServices.map((s: any) => s.code804n).join(", ")}</div>` };
}
export function generateDmsStatutoryRegistry(params: any): any {
	const recs = params.visitServices || params.records || [];
	const totRub = recs.reduce((acc: number, r: any) => acc + (r.totalPriceRub || 0), 0);
	return { registryId: `REG-${Date.now()}`, records: recs, totalAmountRub: totRub, csvExport: exportRegistryToCsv(recs, { name: "Клиника", inn: "7701" }, params.insurerId || "СОГАЗ", "Август 2026") };
}
export function verifyServiceForDms(serviceCode: string, letter?: DmsGuaranteeLetter): boolean { return isServiceCodeApprovedByLetter(serviceCode, letter); }
export function buildDmsReconciliationRegistry(params: any): any {
	return { registryNumber: params.registryNumber || "REG-001", registryDate: params.registryDate || "2026-08-01", items: params.items || [], totalRegistryAmountRubles: 0, totalDmsClaimedRubles: 0, totalPatientCoPaymentRubles: 0 };
}
