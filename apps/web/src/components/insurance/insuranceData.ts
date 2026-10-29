/**
 * insuranceData.ts — Canonical SSOT for Insurance Medicine, Russian DMS & Split Billing.
 *
 * Mandates:
 * - 8e (Doctor & Staff Autonomy: no blocked buttons, instant normal values)
 * - 8n (Solo-Doctor & Small Clinic 1-3 chairs sovereignty: transparent DMS, zero bureaucracy)
 * - 8x (Human clinical language, zero bureaucratic gibberish)
 * - 8l (Pure integer kopeck math, BIGINT amountKopecks, zero floating-point drift)
 * - 8b (Healthy sweet spot 250-400 lines)
 */

export interface DmsInsurer {
	readonly id: string;
	readonly key: string;
	readonly name: string;
	readonly shortName: string;
	readonly fullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp?: string;
	readonly phone: string;
	readonly email: string;
	readonly curatorPhone: string;
	readonly curatorEmail: string;
	readonly portalUrl: string;
	readonly defaultSlaHours: number;
	readonly defaultClaimSlaHours?: number;
	readonly standardTerms: string;
	readonly supportedPrograms: readonly string[];
}

export interface DmsPolicy {
	readonly id: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly insurerId: string;
	readonly insurerName: string;
	readonly policyNumber: string;
	readonly validFrom: string;
	readonly validUntil: string;
	readonly programName: string;
	readonly annualLimitKopecks: number;
	readonly franchisePercent: number;
	readonly franchiseFixedKopecks?: number;
	readonly isActive: boolean;
	readonly curatorContact?: string;
}

export interface DmsGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly patientId?: string;
	readonly patientFullName: string;
	readonly policyNumber?: string;
	readonly patientPolicyNumber?: string;
	readonly insurerId?: string;
	readonly insurerKey?: string;
	readonly insurerName?: string;
	readonly issueDate: string;
	readonly validFrom?: string;
	readonly validUntil: string;
	readonly maxApprovedAmountKopecks?: number;
	readonly approvedAmountKopecks?: number;
	readonly maxCoverageRub?: number;
	readonly maxCoverageKopecks?: number;
	readonly usedAmountRub?: number;
	readonly usedAmountKopecks?: number;
	readonly franchisePercent?: number;
	readonly franchisePct?: number;
	readonly franchiseType?: "percent" | "fixed_rub" | "fixed_kopecks" | "fixed";
	readonly franchiseFixedRub?: number;
	readonly franchiseFixedKopecks?: number;
	readonly approvedTeethFdi?: readonly string[];
	readonly approvedServiceCodes?: readonly string[];
	readonly approvedServiceCodes804n?: readonly string[];
	readonly approvedDiagnosisCodes?: readonly string[];
	readonly programExclusions?: readonly string[];
	readonly diagnosisIcd10?: string;
	readonly curatorFullName?: string;
	readonly curatorPhone?: string;
	readonly notes?: string;
	readonly status?: "active" | "draft" | "pending_approval" | "approved" | "billed" | "paid" | "exhausted" | "expired" | "cancelled";
}

export interface DmsBillableItem {
	readonly id: string;
	readonly serviceCode: string;
	readonly serviceCode804n?: string;
	readonly serviceName: string;
	readonly toothNumber?: string;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly discountPercent?: number;
	readonly isExcluded?: boolean;
}

export interface DmsSplitLineResult {
	readonly lineItemId: string;
	readonly id?: string;
	readonly serviceCode: string;
	readonly serviceCode804n?: string;
	readonly serviceName: string;
	readonly toothNumber?: string;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalKopecks: number;
	readonly insuranceCoveredKopecks: number;
	readonly coveredByDmsKopecks?: number;
	readonly patientOutOfPocketKopecks: number;
	readonly patientTotalKopecks?: number;
	readonly insuranceCoveredRubles: number;
	readonly patientOutOfPocketRubles: number;
	readonly status: "full_dms" | "co_payment" | "patient_full";
	readonly splitReason: string;
	readonly isApprovedByLetter: boolean;
	readonly isExcludedByPolicy: boolean;
	readonly franchiseDeductionKopecks: number;
	readonly copayKopecks?: number;
}

export type PatientPaymentMethod = "cash" | "card" | "advance" | "mixed";

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

export interface DmsSplitCalculationResult {
	readonly lineItems: readonly DmsSplitLineResult[];
	readonly lines: readonly DmsSplitLineResult[];
	readonly totalBillKopecks: number;
	readonly totalInsuranceCoveredKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly totalPatientOutOfPocketKopecks: number;
	readonly patientTotalKopecks: number;
	readonly totalBillRubles: number;
	readonly totalInsuranceCoveredRubles: number;
	readonly totalPatientOutOfPocketRubles: number;
	readonly letterApprovedLimitKopecks: number;
	readonly letterRemainingLimitKopecks: number;
	readonly remainingLimitKopecks: number;
	readonly letterExcessAmountKopecks: number;
	readonly hasUnapprovedTeeth: boolean;
	readonly hasExcludedServices: boolean;
	readonly integrityInvariantHolds: boolean;
	readonly warningMessage?: string;
	readonly isEmergency?: boolean;
	readonly patientPaymentSplit?: PatientPaymentSplit;
}

export interface DmsRegistryItem {
	readonly itemIndex: number;
	readonly serviceDate: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly guaranteeLetterNumber?: string;
	readonly serviceCode: string;
	readonly serviceName: string;
	readonly toothNumber?: string;
	readonly diagnosisIcd10?: string;
	readonly quantity: number;
	readonly unitPriceRubles: number;
	readonly totalAmountRubles: number;
	readonly dmsAcceptedAmountRubles: number;
	readonly patientPaidAmountRubles: number;
	readonly taxRateVat: "exempt_149_nk_rf";
}

export interface DmsRegistryServiceRecord {
	readonly id: string;
	readonly visitId: string;
	readonly visitDate: string;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly policyNumber: string;
	readonly insurerName: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly diagnosisCodeMkb10?: string;
	readonly toothNumber?: string;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly totalPriceRub: number;
	readonly dmsCoveredRub: number;
	readonly patientPaidRub: number;
	readonly doctorFullName?: string;
	readonly isExcluded: boolean;
	readonly exclusionReason?: string;
	readonly letterNumber?: string;
}

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

// -----------------------------------------------------------------------------
// ТОП-6 (и расширенно 8) Страховых Компаний РФ по ДМС
// -----------------------------------------------------------------------------
export const RUSSIAN_DMS_INSURERS: readonly DmsInsurer[] = [
	{
		id: "sogaz",
		key: "sogaz",
		name: "АО «СОГАЗ»",
		shortName: "АО «СОГАЗ»",
		fullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		kpp: "770801001",
		phone: "8 (800) 333-08-88",
		email: "dms@sogaz.ru",
		curatorPhone: "+7 (495) 739-21-40",
		curatorEmail: "stom-curator@sogaz.ru",
		portalUrl: "https://b2b.sogaz.ru",
		defaultSlaHours: 24,
		defaultClaimSlaHours: 24,
		standardTerms: "Терапия и хирургия 100%, плановое лечение по ГП, исключена ортодонтия и имплантация.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
	},
	{
		id: "ingosstrakh",
		key: "ingosstrakh",
		name: "СПАО «Ингосстрах»",
		shortName: "СПАО «Ингосстрах»",
		fullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		kpp: "770501001",
		phone: "8 (495) 956-55-55",
		email: "med@ingos.ru",
		curatorPhone: "+7 (495) 232-32-11",
		curatorEmail: "expert-dms@ingos.ru",
		portalUrl: "https://med.ingos.ru",
		defaultSlaHours: 48,
		defaultClaimSlaHours: 48,
		standardTerms: "Покрытие по согласованию, франшиза 10-20% при расширенных опциях, строго по прайсу.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
	},
	{
		id: "reso",
		key: "reso",
		name: "СПАО «РЕСО-Гарантия»",
		shortName: "СПАО «РЕСО-Гарантия»",
		fullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520",
		ogrn: "1027700042413",
		kpp: "771001001",
		phone: "8 (800) 234-18-02",
		email: "dms-expert@reso.ru",
		curatorPhone: "+7 (495) 730-30-00",
		curatorEmail: "dms-dental@reso.ru",
		portalUrl: "https://reso.ru/dms",
		defaultSlaHours: 24,
		defaultClaimSlaHours: 24,
		standardTerms: "Кураторская экспертиза счетов, согласование гарантийных писем до 3 рабочих дней.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
	},
	{
		id: "alfastrakh",
		key: "alfastrakh",
		name: "АО «АльфаСтрахование»",
		shortName: "АО «АльфаСтрахование»",
		fullName: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834",
		ogrn: "1027739795909",
		kpp: "772501001",
		phone: "8 (800) 333-0-999",
		email: "curator_dms@alfastrah.ru",
		curatorPhone: "+7 (495) 788-0-999",
		curatorEmail: "curator_dms@alfastrah.ru",
		portalUrl: "https://alfastrah.ru/med",
		defaultSlaHours: 24,
		defaultClaimSlaHours: 24,
		standardTerms: "Цифровой шлюз согласования, исключены отбеливание, виниры и эстетика.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
	},
	{
		id: "vsk",
		key: "vsk",
		name: "САО «ВСК»",
		shortName: "САО «ВСК»",
		fullName: "Страховое акционерное общество «ВСК»",
		inn: "7710026574",
		ogrn: "1027700186062",
		kpp: "771001001",
		phone: "8 (800) 775-77-51",
		email: "dms_claims@vsk.ru",
		curatorPhone: "+7 (495) 785-27-76",
		curatorEmail: "dms_claims@vsk.ru",
		portalUrl: "https://vsk.ru/dms",
		defaultSlaHours: 48,
		defaultClaimSlaHours: 48,
		standardTerms: "Лимиты на терапию до 100 000 руб/год, обязательное указание номеров зубов и МКБ-10.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
	},
	{
		id: "soglasie",
		key: "soglasie",
		name: "ООО «СК «Согласие»",
		shortName: "ООО «СК «Согласие»",
		fullName: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733",
		ogrn: "1027700032700",
		kpp: "770601001",
		phone: "8 (800) 755-00-01",
		email: "dms-info@soglasie.ru",
		curatorPhone: "+7 (495) 739-01-01",
		curatorEmail: "dms-curator@soglasie.ru",
		portalUrl: "https://soglasie.ru/dms",
		defaultSlaHours: 24,
		defaultClaimSlaHours: 24,
		standardTerms: "Строгая проверка показаний при депульпировании, эндодонтия по гарантийным письмам.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
	},
	{
		id: "rosgosstrakh",
		key: "rosgosstrakh",
		name: "ПАО СК «Росгосстрах»",
		shortName: "ПАО СК «Росгосстрах»",
		fullName: "Публичное акционерное общество Страховая Компания «Росгосстрах»",
		inn: "7707067683",
		ogrn: "1027739049689",
		phone: "8 (800) 200-09-00",
		email: "dms@rgs.ru",
		curatorPhone: "+7 (495) 783-24-24",
		curatorEmail: "dms@rgs.ru",
		portalUrl: "https://rgs.ru/dms",
		defaultSlaHours: 48,
		defaultClaimSlaHours: 48,
		standardTerms: "Федеральная сеть, протоколы согласования планового протезирования.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией"],
	},
	{
		id: "renins",
		key: "renins",
		name: "ПАО «Группа Ренессанс Страхование»",
		shortName: "ПАО «Группа Ренессанс Страхование»",
		fullName: "Публичное акционерное общество «Группа Ренессанс Страхование»",
		inn: "7725497022",
		ogrn: "1187746796231",
		phone: "8 (800) 333-8-800",
		email: "med_expert@renins.com",
		curatorPhone: "+7 (495) 725-10-50",
		curatorEmail: "med_expert@renins.com",
		portalUrl: "https://renins.ru/med",
		defaultSlaHours: 24,
		defaultClaimSlaHours: 24,
		standardTerms: "Онлайн-авторизация приемов через API, подтверждение гарантийных писем.",
		supportedPrograms: ["Базовая терапия", "Расширенная с хирургией", "VIP Люкс"],
	},
];

export const TOP_6_DMS_INSURER_CHIPS = RUSSIAN_DMS_INSURERS.slice(0, 6);
export const STATUTORY_DMS_INSURERS = RUSSIAN_DMS_INSURERS;
export const RUSSIAN_TOP_DMS_INSURERS = RUSSIAN_DMS_INSURERS;

export const STANDARD_DMS_LIMITS_RUB = [30000, 50000, 100000, 150000] as const;

// -----------------------------------------------------------------------------
// Каталог исключений ДМС
// -----------------------------------------------------------------------------
export interface DmsExclusionRule {
	readonly code: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly isDefaultExcluded: boolean;
	readonly typicalCopayPercent: number;
}

export const DMS_STANDARD_EXCLUSIONS: readonly DmsExclusionRule[] = [
	{ code: "orthodontics", titleRu: "Ортодонтия (брекеты, элайнеры)", descriptionRu: "Исправление прикуса и установка брекет-систем не покрывается базовым ДМС", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "implantology", titleRu: "Имплантация и костная пластика", descriptionRu: "Установка дентальных имплантатов, синус-лифтинг и остеопластика", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "whitening", titleRu: "Эстетическое отбеливание", descriptionRu: "Кабинетное и домашнее отбеливание зубов по эстетическим показаниям", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "veneers", titleRu: "Виниры и эстетическая реставрация", descriptionRu: "Керамические и композитные виниры без функциональных травм", isDefaultExcluded: true, typicalCopayPercent: 100 },
	{ code: "prosthetics_planned", titleRu: "Плановое протезирование (коронки, мосты)", descriptionRu: "Ортопедическое восстановление зубов требует отдельного согласования", isDefaultExcluded: false, typicalCopayPercent: 50 },
	{ code: "general_anesthesia", titleRu: "Седация и общий наркоз", descriptionRu: "Лечение во сне без витальных показаний оплачивается пациентом", isDefaultExcluded: true, typicalCopayPercent: 100 },
];

export const STATUTORY_DMS_EXCLUSION_RULES = DMS_STANDARD_EXCLUSIONS;

// -----------------------------------------------------------------------------
// Каталог услуг стоматологии (Номенклатура 804н)
// -----------------------------------------------------------------------------
export interface Nomenclature804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "diagnostics" | "hygiene" | "orthopedics" | "orthodontics";
	readonly categoryTitleRu: string;
	readonly defaultPriceRub: number;
	readonly standardCoveredDms: boolean;
	readonly uet?: number;
}

export const NOMENCLATURE_804N_CATALOG: readonly Nomenclature804nItem[] = [
	{ code: "A16.07.002.001", name: "Восстановление зуба пломбой (I, V, VI класс по Блэку) световой композит", category: "therapy", categoryTitleRu: "Терапевтическая стоматология", defaultPriceRub: 4500, standardCoveredDms: true, uet: 1.0 },
	{ code: "A16.07.002.002", name: "Восстановление зуба пломбой (II, III класс по Блэку)", category: "therapy", categoryTitleRu: "Терапевтическая стоматология", defaultPriceRub: 5600, standardCoveredDms: true, uet: 1.5 },
	{ code: "A16.07.002.003", name: "Восстановление зуба пломбой (IV класс по Блэку, разрушение >1/2)", category: "therapy", categoryTitleRu: "Терапевтическая стоматология", defaultPriceRub: 7200, standardCoveredDms: true, uet: 2.25 },
	{ code: "A16.07.030.001", name: "Инструментальная и медикаментозная обработка корневого канала (1 канал)", category: "therapy", categoryTitleRu: "Эндодонтия", defaultPriceRub: 3500, standardCoveredDms: true, uet: 1.25 },
	{ code: "A16.07.030.002", name: "Инструментальная и медикаментозная обработка корневых каналов (2 канала)", category: "therapy", categoryTitleRu: "Эндодонтия", defaultPriceRub: 5800, standardCoveredDms: true, uet: 2.0 },
	{ code: "A16.07.030.003", name: "Инструментальная и медикаментозная обработка корневых каналов (3 канала)", category: "therapy", categoryTitleRu: "Эндодонтия", defaultPriceRub: 8200, standardCoveredDms: true, uet: 2.75 },
	{ code: "A11.07.010", name: "Местная анестезия инфильтрационная / проводниковая", category: "therapy", categoryTitleRu: "Анестезиология", defaultPriceRub: 950, standardCoveredDms: true, uet: 0.5 },
	{ code: "A06.07.012", name: "Внутриротовая прицельная визиография цифровой датчик", category: "diagnostics", categoryTitleRu: "Рентгенодиагностика", defaultPriceRub: 800, standardCoveredDms: true, uet: 0.4 },
	{ code: "A16.07.051", name: "Профессиональная гигиена полости рта (ультразвук + Air-Flow)", category: "hygiene", categoryTitleRu: "Профилактика и гигиена", defaultPriceRub: 6500, standardCoveredDms: true, uet: 2.0 },
	{ code: "A16.07.001.001", name: "Простое удаление постоянного зуба", category: "surgery", categoryTitleRu: "Хирургия", defaultPriceRub: 3800, standardCoveredDms: true, uet: 1.0 },
	{ code: "A16.07.001.002", name: "Сложное удаление зуба с разъединением корней", category: "surgery", categoryTitleRu: "Хирургия", defaultPriceRub: 6500, standardCoveredDms: true, uet: 2.0 },
	{ code: "A16.07.004", name: "Восстановление зуба металлокерамической коронкой", category: "orthopedics", categoryTitleRu: "Ортопедия", defaultPriceRub: 14500, standardCoveredDms: false, uet: 3.5 },
	{ code: "A16.07.050", name: "Профессиональное отбеливание зубов", category: "therapy", categoryTitleRu: "Эстетика", defaultPriceRub: 26000, standardCoveredDms: false, uet: 4.0 },
];

export const STATUTORY_804N_NOMENCLATURE = NOMENCLATURE_804N_CATALOG;

// -----------------------------------------------------------------------------
// Копеечная финансовая арифметика
// -----------------------------------------------------------------------------
export function rubToKopecks(rub: number): number {
	return Math.round(Number(rub || 0) * 100);
}

export function kopecksToRub(kopecks: number): number {
	return Math.round(Number(kopecks || 0)) / 100;
}

export const kopecksToRubles = kopecksToRub;
export const rublesToKopecks = rubToKopecks;

export function formatRubKopecks(rub: number): string {
	const val = Number(rub || 0);
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(val);
}

export function formatCurrencyRub(rub: number): string {
	return `${Math.round(rub).toLocaleString("ru-RU")} ₽`;
}

export function formatCurrencyKopecks(kopecks: number): string {
	return `${Math.round(kopecksToRub(kopecks)).toLocaleString("ru-RU")} ₽`;
}

export function search804nServices(query: string): Nomenclature804nItem[] {
	const q = (query || "").trim().toLowerCase();
	if (!q) return [...NOMENCLATURE_804N_CATALOG];
	return NOMENCLATURE_804N_CATALOG.filter(
		(item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.categoryTitleRu.toLowerCase().includes(q),
	);
}

export function getDmsInsurerById(id: string): DmsInsurer | undefined {
	return RUSSIAN_DMS_INSURERS.find((ins) => ins.id.toLowerCase() === (id || "").toLowerCase() || ins.key.toLowerCase() === (id || "").toLowerCase());
}

// -----------------------------------------------------------------------------
// Калькуляция сплита (DMS + Пациент) в целочисленных копейках
// -----------------------------------------------------------------------------
export interface CalculateServiceDistributionInput {
	readonly priceRub?: number;
	readonly priceKopecks?: number;
	readonly quantity: number;
	readonly isExcluded?: boolean;
	readonly isExplicitlyApproved?: boolean;
	readonly franchisePercent?: number;
	readonly franchisePct?: number;
	readonly franchiseFixedRub?: number;
	readonly availableLetterLimitRub?: number;
	readonly remainingLetterLimitRub?: number;
}

export function calculateServiceDmsDistribution(input: CalculateServiceDistributionInput): {
	readonly lineTotalRub: number;
	readonly dmsCoveredRub: number;
	readonly patientPaidRub: number;
	readonly effectiveCoveragePct: number;
	readonly reason: string;
} {
	const priceRub = input.priceRub ?? (input.priceKopecks ? kopecksToRub(input.priceKopecks) : 0);
	const qty = Math.max(1, input.quantity || 1);
	const lineTotalKopecks = rubToKopecks(priceRub * qty);

	if (input.isExcluded && !input.isExplicitlyApproved) {
		return {
			lineTotalRub: kopecksToRub(lineTotalKopecks),
			dmsCoveredRub: 0,
			patientPaidRub: kopecksToRub(lineTotalKopecks),
			effectiveCoveragePct: 0,
			reason: "Услуга не входит в программу страхования",
		};
	}

	let dmsKopecks = lineTotalKopecks;
	let reason = "Покрыто страховой компанией 100%";

	const franchisePct = input.franchisePct ?? input.franchisePercent;
	if (franchisePct && franchisePct > 0) {
		const copayFranchiseKopecks = Math.round((lineTotalKopecks * franchisePct) / 100);
		dmsKopecks = Math.max(0, lineTotalKopecks - copayFranchiseKopecks);
		reason = `Применена франшиза ${franchisePct}%`;
	}

	if (input.franchiseFixedRub && input.franchiseFixedRub > 0) {
		const fixedFranchiseKopecks = rubToKopecks(input.franchiseFixedRub);
		dmsKopecks = Math.max(0, dmsKopecks - fixedFranchiseKopecks);
		reason = `Применена фиксированная франшиза ${input.franchiseFixedRub} ₽`;
	}

	const remainingLimitRub = input.remainingLetterLimitRub ?? input.availableLetterLimitRub;
	if (remainingLimitRub !== undefined) {
		const limitKopecks = rubToKopecks(remainingLimitRub);
		if (dmsKopecks > limitKopecks) {
			dmsKopecks = Math.max(0, limitKopecks);
			reason = "Покрытие ограничено остатком гарантийного письма";
		}
	}

	const patientKopecks = lineTotalKopecks - dmsKopecks;
	const effectivePct = lineTotalKopecks > 0 ? Math.round((dmsKopecks / lineTotalKopecks) * 100) : 100;

	return {
		lineTotalRub: kopecksToRub(lineTotalKopecks),
		dmsCoveredRub: kopecksToRub(dmsKopecks),
		patientPaidRub: kopecksToRub(patientKopecks),
		effectiveCoveragePct: effectivePct,
		reason,
	};
}

export function calculateDmsCoPaymentSplit(
	lineItems: readonly DmsBillableItem[],
	options: {
		guaranteeLetter?: DmsGuaranteeLetter;
		policy?: DmsPolicy;
		franchisePercent?: number;
		previouslyUsedLetterAmountKopecks?: number;
		isEmergency?: boolean;
	} = {},
): DmsSplitCalculationResult {
	const letter = options.guaranteeLetter;
	const letterLimit = letter
		? (letter.maxApprovedAmountKopecks ??
			letter.maxCoverageKopecks ??
			(letter.maxCoverageRub !== undefined ? rubToKopecks(letter.maxCoverageRub) : Number.POSITIVE_INFINITY))
		: Number.POSITIVE_INFINITY;

	const previouslyUsed = options.previouslyUsedLetterAmountKopecks ?? (letter?.usedAmountKopecks ?? (letter?.usedAmountRub ? rubToKopecks(letter.usedAmountRub) : 0));
	let remainingLimitKopecks = Math.max(0, letterLimit - previouslyUsed);

	const franchisePct = options.franchisePercent ?? letter?.franchisePercent ?? letter?.franchisePct ?? 0;
	const splitResults: DmsSplitLineResult[] = [];
	let hasUnapprovedTeeth = false;
	let hasExcludedServices = false;

	for (const item of lineItems) {
		const totalKopecks = item.unitPriceKopecks * Math.max(1, item.quantity);
		const isExcluded = Boolean(item.isExcluded);

		if (isExcluded) hasExcludedServices = true;

		let dmsKopecks = 0;
		let franchiseDeduction = 0;

		if (!isExcluded) {
			if (franchisePct > 0) {
				franchiseDeduction = Math.round((totalKopecks * franchisePct) / 100);
				dmsKopecks = Math.max(0, totalKopecks - franchiseDeduction);
			} else {
				dmsKopecks = totalKopecks;
			}

			if (Number.isFinite(remainingLimitKopecks)) {
				dmsKopecks = Math.min(dmsKopecks, remainingLimitKopecks);
				remainingLimitKopecks = Math.max(0, remainingLimitKopecks - dmsKopecks);
			}
		}

		const patientKopecks = totalKopecks - dmsKopecks;
		const status: "full_dms" | "co_payment" | "patient_full" =
			dmsKopecks === totalKopecks ? "full_dms" : dmsKopecks > 0 ? "co_payment" : "patient_full";

		const splitReason = isExcluded
			? "Услуга не входит в программу ДМС"
			: franchiseDeduction > 0
				? `Франшиза ${franchisePct}%`
				: dmsKopecks < totalKopecks
					? "Исчерпан лимит гарантийного письма"
					: "Покрыто ДМС 100%";

		splitResults.push({
			lineItemId: item.id,
			id: item.id,
			serviceCode: item.serviceCode || item.serviceCode804n || "A16.07.002",
			serviceCode804n: item.serviceCode804n || item.serviceCode,
			serviceName: item.serviceName,
			toothNumber: item.toothNumber,
			quantity: item.quantity,
			unitPriceKopecks: item.unitPriceKopecks,
			totalKopecks,
			insuranceCoveredKopecks: dmsKopecks,
			coveredByDmsKopecks: dmsKopecks,
			patientOutOfPocketKopecks: patientKopecks,
			patientTotalKopecks: patientKopecks,
			insuranceCoveredRubles: kopecksToRub(dmsKopecks),
			patientOutOfPocketRubles: kopecksToRub(patientKopecks),
			status,
			splitReason,
			isApprovedByLetter: !isExcluded,
			isExcludedByPolicy: isExcluded,
			franchiseDeductionKopecks: franchiseDeduction,
		});
	}

	const totalBillKopecks = splitResults.reduce((acc, i) => acc + i.totalKopecks, 0);
	const totalInsuranceCoveredKopecks = splitResults.reduce((acc, i) => acc + i.insuranceCoveredKopecks, 0);
	const totalPatientOutOfPocketKopecks = splitResults.reduce((acc, i) => acc + i.patientOutOfPocketKopecks, 0);
	const letterApprovedLimitKopecks = letter ? (letter.maxApprovedAmountKopecks ?? letter.approvedAmountKopecks ?? (letter.maxCoverageRub ? rubToKopecks(letter.maxCoverageRub) : 0)) : 0;
	const letterExcessAmountKopecks = letter ? Math.max(0, totalBillKopecks - letterApprovedLimitKopecks) : 0;
	const integrityInvariantHolds = totalInsuranceCoveredKopecks + totalPatientOutOfPocketKopecks === totalBillKopecks;

	return {
		lineItems: splitResults,
		lines: splitResults,
		totalBillKopecks,
		totalInsuranceCoveredKopecks,
		dmsCoveredKopecks: totalInsuranceCoveredKopecks,
		totalPatientOutOfPocketKopecks,
		patientTotalKopecks: totalPatientOutOfPocketKopecks,
		totalBillRubles: kopecksToRub(totalBillKopecks),
		totalInsuranceCoveredRubles: kopecksToRub(totalInsuranceCoveredKopecks),
		totalPatientOutOfPocketRubles: kopecksToRub(totalPatientOutOfPocketKopecks),
		letterApprovedLimitKopecks,
		letterRemainingLimitKopecks: Number.isFinite(remainingLimitKopecks) ? remainingLimitKopecks : 0,
		remainingLimitKopecks: Number.isFinite(remainingLimitKopecks) ? remainingLimitKopecks : 0,
		letterExcessAmountKopecks,
		hasUnapprovedTeeth,
		hasExcludedServices,
		integrityInvariantHolds,
		isEmergency: options.isEmergency,
	};
}

// -----------------------------------------------------------------------------
// Сводка реестров и экспорт для страховой компании и бухгалтерии
// -----------------------------------------------------------------------------
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

	const isBalanced = Math.abs(totalAmountRub - (totalDmsCoveredRub + totalPatientPaidRub)) < 0.01;

	return {
		totalServicesCount: records.length,
		uniquePatientsCount: uniquePatients.size,
		totalAmountRub: Math.round(totalAmountRub * 100) / 100,
		totalDmsCoveredRub: Math.round(totalDmsCoveredRub * 100) / 100,
		totalPatientPaidRub: Math.round(totalPatientPaidRub * 100) / 100,
		isBalanced,
		insurerName,
		periodStart,
		periodEnd,
	};
}

export function exportRegistryToCsv(
	records: readonly DmsRegistryServiceRecord[],
	clinicInfo: { name: string; inn: string; kpp?: string },
	insurerName: string,
	periodStr: string,
): string {
	const escapeCsv = (val: string | number | null | undefined): string => {
		if (val == null) return '""';
		return `"${String(val).replace(/"/g, '""')}"`;
	};

	const headerLines: string[] = [
		`# Реестр оказанных медицинских услуг по ДМС;${escapeCsv(clinicInfo.name)};ИНН: ${escapeCsv(clinicInfo.inn)}`,
		`# Страховая компания: ${escapeCsv(insurerName)};Период: ${escapeCsv(periodStr)}`,
		`# Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`,
		"",
		[
			escapeCsv("№ п/п"), escapeCsv("Дата визита"), escapeCsv("ФИО Пациента"), escapeCsv("Номер полиса ДМС"),
			escapeCsv("№ Гар. письма"), escapeCsv("Код услуги"), escapeCsv("Наименование услуги"),
			escapeCsv("Диагноз (МКБ-10)"), escapeCsv("Зуб"), escapeCsv("Кол-во"), escapeCsv("Цена за ед. (руб)"),
			escapeCsv("Сумма всего (руб)"), escapeCsv("Покрыто ДМС (руб)"), escapeCsv("Доплата пациента (руб)"),
			escapeCsv("Врач-стоматолог"), escapeCsv("Статус/Примечание"),
		].join(";"),
	];

	const rows = records.map((r, idx) => {
		return [
			escapeCsv(idx + 1), escapeCsv(r.visitDate), escapeCsv(r.patientFullName),
			escapeCsv(r.policyNumber), escapeCsv(r.letterNumber || "—"), escapeCsv(r.serviceCode804n),
			escapeCsv(r.serviceName), escapeCsv(r.diagnosisCodeMkb10 || "—"), escapeCsv(r.toothNumber || "—"),
			escapeCsv(r.quantity), escapeCsv(r.unitPriceRub.toFixed(2)), escapeCsv(r.totalPriceRub.toFixed(2)),
			escapeCsv(r.dmsCoveredRub.toFixed(2)), escapeCsv(r.patientPaidRub.toFixed(2)),
			escapeCsv(r.doctorFullName || "—"),
			escapeCsv(r.isExcluded ? `Исключение (${r.exclusionReason || "не покрывается"})` : "Покрыто ДМС"),
		].join(";");
	});

	const totals = calculateRegistryTotals(records, insurerName, "", "");
	const totalRow = [
		escapeCsv("ИТОГО"), escapeCsv(""), escapeCsv(`Пациентов: ${totals.uniquePatientsCount}`),
		escapeCsv(""), escapeCsv(""), escapeCsv(""), escapeCsv(`Всего услуг: ${totals.totalServicesCount}`),
		escapeCsv(""), escapeCsv(""), escapeCsv(""), escapeCsv(""),
		escapeCsv(totals.totalAmountRub.toFixed(2)), escapeCsv(totals.totalDmsCoveredRub.toFixed(2)),
		escapeCsv(totals.totalPatientPaidRub.toFixed(2)), escapeCsv(""),
		escapeCsv(totals.isBalanced ? "БАЛАНС СХОДИТСЯ" : "ОШИБКА БАЛАНСА"),
	].join(";");

	return `\uFEFF${[...headerLines, ...rows, "", totalRow].join("\r\n")}`;
}

export function generateBilateralAcceptanceActHtml(params: {
	records: readonly DmsRegistryServiceRecord[];
	summary: DmsRegistrySummary;
	clinicInfo: { name: string; inn: string; ogrn?: string; address: string; chiefDoctor: string };
	insurerInfo: { name: string; inn?: string; representative: string; contractNumber: string; contractDate: string };
	actNumber: string;
	actDate: string;
}): string {
	const { records, summary, clinicInfo, insurerInfo, actNumber, actDate } = params;

	const rowsHtml = records
		.map(
			(r, i) => `
		<tr>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.visitDate}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: 600;">${r.patientFullName}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.policyNumber}</td>
			<td style="border: 1px solid #000; padding: 4px; text-align: center;">${r.letterNumber || "—"}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${r.serviceCode804n}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.serviceName} ${r.toothNumber ? `(зуб ${r.toothNumber})` : ""}</td>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.quantity}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.unitPriceRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold;">${formatRubKopecks(r.dmsCoveredRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.patientPaidRub)}</td>
		</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт сдачи-приемки оказанных медицинских услуг ДМС № ${actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #000; margin: 0; padding: 10px; }
		h1 { font-size: 14pt; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
		.subtitle { text-align: center; font-size: 11pt; margin-bottom: 16px; }
		.parties { margin-bottom: 14px; text-align: justify; }
		table.registry-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; }
		table.registry-table th { border: 1px solid #000; background: #f0f0f0; padding: 5px; text-align: center; font-weight: bold; }
		.totals-block { margin: 16px 0; font-size: 11pt; }
		.totals-block strong { font-size: 12pt; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
		.sign-box { width: 46%; border-top: 1px solid #000; padding-top: 8px; }
		.sign-title { font-weight: bold; margin-bottom: 6px; }
		.stamp-place { margin-top: 40px; font-size: 9pt; color: #555; }
		@media print { body { padding: 0; } .no-print { display: none; } }
	</style>
</head>
<body>
	<h1>АКТ СДАЧИ-ПРИЕМКИ № ${actNumber}</h1>
	<div class="subtitle">оказанных медицинских услуг по Договору ДМС № ${insurerInfo.contractNumber} от ${insurerInfo.contractDate} г.</div>
	<div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold;">
		<div>г. Москва</div><div>${actDate} г.</div>
	</div>
	<div class="parties">
		<strong>Исполнитель:</strong> ${clinicInfo.name}, ИНН ${clinicInfo.inn}, ОГРН ${clinicInfo.ogrn || "—"}, адрес: ${clinicInfo.address}, в лице Главного врача ${clinicInfo.chiefDoctor}, с одной стороны, и<br>
		<strong>Заказчик (Страховщик):</strong> ${insurerInfo.name}, ИНН ${insurerInfo.inn || "—"}, в лице ${insurerInfo.representative}, с другой стороны, составили настоящий Акт:
	</div>
	<div style="margin-bottom: 8px;">
		1. В соответствии с Договором ДМС в период с <strong>${summary.periodStart || "начало месяца"}</strong> по <strong>${summary.periodEnd || "конец месяца"}</strong> оказаны медицинские услуги:
	</div>
	<table class="registry-table">
		<thead>
			<tr>
				<th>№</th><th>Дата</th><th>Застрахованный (Пациент)</th><th>Полис ДМС</th><th>№ Гар. письма</th>
				<th>Код услуги</th><th>Наименование услуги</th><th>Кол-во</th><th>Тариф (руб)</th><th>К оплате ДМС</th><th>Доплата пациента</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #fafafa;">
				<td colspan="7" style="border: 1px solid #000; padding: 6px; text-align: right;">ИТОГО К ОПЛАТЕ СТРАХОВЩИКОМ:</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: center;">${summary.totalServicesCount}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalAmountRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000; font-size: 10.5pt;">${formatRubKopecks(summary.totalDmsCoveredRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalPatientPaidRub)}</td>
			</tr>
		</tbody>
	</table>
	<div class="totals-block">
		2. Общая стоимость услуг: <strong>${formatRubKopecks(summary.totalAmountRub)}</strong>.<br>
		3. Сумма к перечислению Страховщиком: <strong>${formatRubKopecks(summary.totalDmsCoveredRub)}</strong> (Без НДС по пп. 2 п. 2 ст. 149 НК РФ).<br>
		4. Оплачено непосредственно пациентами: <strong>${formatRubKopecks(summary.totalPatientPaidRub)}</strong>.<br>
		5. Стороны взаимных претензий по качеству и объему не имеют.
	</div>
	<div class="signatures">
		<div class="sign-box">
			<div class="sign-title">ОТ ИСПОЛНИТЕЛЯ (Клиника):</div><div>${clinicInfo.name}</div>
			<div style="margin-top: 15px;">Главный врач: ________________ / ${clinicInfo.chiefDoctor} /</div><div class="stamp-place">М.П.</div>
		</div>
		<div class="sign-box">
			<div class="sign-title">ОТ ЗАКАЗЧИКА (Страховщик):</div><div>${insurerInfo.name}</div>
			<div style="margin-top: 15px;">Представитель: ________________ / ${insurerInfo.representative} /</div><div class="stamp-place">М.П.</div>
		</div>
	</div>
</body>
</html>`;
}
