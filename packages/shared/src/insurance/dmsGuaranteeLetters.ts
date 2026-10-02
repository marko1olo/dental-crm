/**
 * DENTE Dental CRM — DMS Guarantee Letters (Гарантийные письма ДМС) & Insurer Limit Engine.
 *
 * Implements:
 * 1. Statutory Catalog of Major Russian Health Insurance Companies (СОГАЗ, АльфаСтрахование, Ингосстрах, РЕСО, ВСК, Согласие).
 * 2. Immutable Guarantee Letter Data Model with integer kopeck limits.
 * 3. Soft Warning Threshold: Triggers alert when limit usage reaches or exceeds 80% (>= 80%).
 * 4. Hard Limit Blocking & Automatic Patient Overflow:
 *    When requested insurer amount exceeds remaining limit, the surplus is automatically
 *    shifted to the patient's co-pay with exact penny conservation.
 * 5. Validity period checks (validFrom..validTo) and 804n service exclusion guards.
 * 6. Ledger transaction history for auditability and reconciliation.
 */

import { z } from "zod";
import type { Kopecks } from "../utils/money.js";
import { formatKopecksRu } from "../utils/money.js";

/**
 * Identifier of standard Russian insurance companies operating in DMS market.
 */
export type DmsInsuranceCompanyId =
	| "sogaz"
	| "alfastrakhovanie"
	| "ingosstrakh"
	| "reso_garantiya"
	| "vsk"
	| "soglasie"
	| "rosgosstrakh"
	| "kapital_life"
	| "other";

export interface DmsInsuranceCompany {
	readonly id: DmsInsuranceCompanyId;
	readonly shortNameRu: string;
	readonly fullNameRu: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly kpp: string;
	readonly phone: string;
	readonly email: string;
	readonly websiteUrl: string;
	readonly defaultFranchiseRates: readonly number[];
	readonly descriptionRu: string;
}

/**
 * Standard registry of major Russian DMS medical insurers.
 */
export const DMS_INSURANCE_COMPANIES_CATALOG: readonly DmsInsuranceCompany[] = [
	{
		id: "sogaz",
		shortNameRu: "АО «СОГАЗ»",
		fullNameRu: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		kpp: "770801001",
		phone: "8 800 333-08-88",
		email: "dms@sogaz.ru",
		websiteUrl: "https://www.sogaz.ru",
		defaultFranchiseRates: [0, 10, 20, 30],
		descriptionRu: "Крупнейший страховщик ДМС в РФ. Обслуживает корпоративные программы Газпрома, РЖД, Роснефти.",
	},
	{
		id: "alfastrakhovanie",
		shortNameRu: "АО «АльфаСтрахование»",
		fullNameRu: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834",
		ogrn: "1027739431730",
		kpp: "772501001",
		phone: "8 800 333-09-99",
		email: "medcontrol@alfastrah.ru",
		websiteUrl: "https://www.alfastrah.ru",
		defaultFranchiseRates: [0, 10, 20, 30, 50],
		descriptionRu: "Федеральный страховщик ДМС. Поддерживает цифровые гарантийные письма и мобильный кабинет застрахованного.",
	},
	{
		id: "ingosstrakh",
		shortNameRu: "СПАО «Ингосстрах»",
		fullNameRu: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		kpp: "770501001",
		phone: "8 800 100-77-55",
		email: "dms-claims@ingos.ru",
		websiteUrl: "https://www.ingos.ru",
		defaultFranchiseRates: [0, 10, 20, 50, 80],
		descriptionRu: "Один из старейших страховщиков РФ с собственной сетью клиник Будь Здоров и широким портфелем ДМС.",
	},
	{
		id: "reso_garantiya",
		shortNameRu: "СПАО «РЕСО-Гарантия»",
		fullNameRu: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520",
		ogrn: "1027700042413",
		kpp: "771001001",
		phone: "8 800 234-18-02",
		email: "dms@reso.ru",
		websiteUrl: "https://www.reso.ru",
		defaultFranchiseRates: [0, 20, 30, 50],
		descriptionRu: "Лидер розничного и корпоративного медицинского страхования с развитой экспертизой счетов 804н.",
	},
	{
		id: "vsk",
		shortNameRu: "САО «ВСК»",
		fullNameRu: "Страховое акционерное общество «ВСК»",
		inn: "7710026574",
		ogrn: "1027700186062",
		kpp: "773101001",
		phone: "8 800 775-77-51",
		email: "dms@vsk.ru",
		websiteUrl: "https://www.vsk.ru",
		defaultFranchiseRates: [0, 10, 20, 30],
		descriptionRu: "Страховой дом ВСК. Крупный федеральный оператор программ ДМС государственных и коммерческих корпораций.",
	},
	{
		id: "soglasie",
		shortNameRu: "ООО «СК «Согласие»",
		fullNameRu: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733",
		ogrn: "1027700032700",
		kpp: "772901001",
		phone: "8 800 755-00-01",
		email: "dms_expert@soglasie.ru",
		websiteUrl: "https://www.soglasie.ru",
		defaultFranchiseRates: [0, 10, 20, 50],
		descriptionRu: "Федеральная страховая компания с программами добровольного медицинского страхования и стоматологии.",
	},
	{
		id: "rosgosstrakh",
		shortNameRu: "ПАО СК «Росгосстрах»",
		fullNameRu: "Публичное акционерное общество Страховая Компания «Росгосстрах»",
		inn: "7707067683",
		ogrn: "1027739049637",
		kpp: "502701001",
		phone: "8 800 200-09-00",
		email: "dms@rgs.ru",
		websiteUrl: "https://www.rgs.ru",
		defaultFranchiseRates: [0, 20, 30],
		descriptionRu: "Старейшая страховая организация России с филиальной сетью во всех субъектах РФ.",
	},
	{
		id: "kapital_life",
		shortNameRu: "ООО «Капитал Лайф Страхование Жизни»",
		fullNameRu: "Общество с ограниченной ответственностью «Капитал Лайф Страхование Жизни»",
		inn: "7706548313",
		ogrn: "1047796614700",
		kpp: "772501001",
		phone: "8 800 200-68-86",
		email: "med@kaplife.ru",
		websiteUrl: "https://www.kaplife.ru",
		defaultFranchiseRates: [0, 10, 20],
		descriptionRu: "Специализированный страховщик жизни и здоровья с программами стоматологического ДМС.",
	},
];

/**
 * Finds insurance company by ID or returns fallback representation.
 */
export function getDmsInsuranceCompanyById(id: string): DmsInsuranceCompany | undefined {
	return DMS_INSURANCE_COMPANIES_CATALOG.find((c) => c.id === id);
}

/**
 * Finds insurance company by 10-digit INN.
 */
export function findDmsInsuranceCompanyByInn(inn: string): DmsInsuranceCompany | undefined {
	const cleaned = inn.trim().replace(/\D/g, "");
	return DMS_INSURANCE_COMPANIES_CATALOG.find((c) => c.inn === cleaned);
}

export type DmsGuaranteeLetterStatus =
	| "active"
	| "exhausted"
	| "expired"
	| "cancelled"
	| "pending_approval";

export interface DmsLetterTransaction {
	readonly id: string;
	readonly letterId: string;
	readonly dateIso: string;
	readonly transactionRef: string;
	readonly amountKopecks: Kopecks;
	readonly balanceAfterKopecks: Kopecks;
	readonly descriptionRu: string;
	readonly doctorName?: string | undefined;
}

export interface DmsGuaranteeLetter {
	readonly id: string;
	readonly letterNumber: string;
	readonly issueDate: string; // ISO YYYY-MM-DD
	readonly validFrom: string; // ISO YYYY-MM-DD
	readonly validTo: string; // ISO YYYY-MM-DD
	readonly companyId: DmsInsuranceCompanyId;
	readonly companyName: string;
	readonly policyNumber: string;
	readonly patientFullName: string;
	readonly patientBirthDate: string; // ISO YYYY-MM-DD
	readonly patientSnils?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly programNameRu?: string | undefined;
	readonly limitKopecks: Kopecks;
	readonly usedKopecks: Kopecks;
	readonly remainingLimitKopecks: Kopecks;
	readonly defaultFranchisePercent: number;
	readonly allowed804nPrefixes?: readonly string[] | undefined;
	readonly excluded804nCodes?: readonly string[] | undefined;
	readonly status: DmsGuaranteeLetterStatus;
	readonly notes?: string | undefined;
	readonly transactions?: readonly DmsLetterTransaction[] | undefined;
}

export const dmsGuaranteeLetterSchema = z.object({
	id: z.string().min(1, { message: "ID гарантийного письма обязателен" }),
	letterNumber: z.string().min(1, { message: "Номер гарантийного письма обязателен" }),
	issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата выдачи должна быть в формате YYYY-MM-DD" }),
	validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата начала действия должна быть в формате YYYY-MM-DD" }),
	validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата окончания действия должна быть в формате YYYY-MM-DD" }),
	companyId: z.enum([
		"sogaz",
		"alfastrakhovanie",
		"ingosstrakh",
		"reso_garantiya",
		"vsk",
		"soglasie",
		"rosgosstrakh",
		"kapital_life",
		"other",
	]),
	companyName: z.string().min(1, { message: "Наименование страховой компании обязательно" }),
	policyNumber: z.string().min(1, { message: "Номер полиса ДМС обязателен" }),
	patientFullName: z.string().min(1, { message: "ФИО застрахованного обязательно" }),
	patientBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Дата рождения должна быть в формате YYYY-MM-DD" }),
	patientSnils: z.string().optional(),
	patientPhone: z.string().optional(),
	programNameRu: z.string().optional(),
	limitKopecks: z.number().int().nonnegative({ message: "Лимит должен быть неотрицательным числом копеек" }),
	usedKopecks: z.number().int().nonnegative({ message: "Израсходованная сумма должна быть неотрицательной" }),
	remainingLimitKopecks: z.number().int().nonnegative({ message: "Остаток лимита должен быть неотрицательным" }),
	defaultFranchisePercent: z.number().int().min(0).max(100),
	allowed804nPrefixes: z.array(z.string()).optional(),
	excluded804nCodes: z.array(z.string()).optional(),
	status: z.enum(["active", "exhausted", "expired", "cancelled", "pending_approval"]),
	notes: z.string().optional(),
});

export type DmsCoverageEvaluationStatus =
	| "approved"
	| "partial_limit_exceeded"
	| "rejected_expired"
	| "rejected_not_yet_valid"
	| "rejected_limit_exhausted"
	| "rejected_letter_inactive"
	| "rejected_service_excluded"
	| "rejected_service_not_in_allowed_list";

export interface DmsCoverageEvaluation {
	readonly letterId: string;
	readonly status: DmsCoverageEvaluationStatus;
	readonly isApproved: boolean;
	readonly approvedInsurerKopecks: Kopecks;
	readonly overflowToPatientKopecks: Kopecks;
	readonly remainingLimitBeforeKopecks: Kopecks;
	readonly remainingLimitAfterKopecks: Kopecks;
	readonly limitUsageRatioPercent: number; // 0..100%
	readonly warning80PercentReached: boolean; // Soft warning flag
	readonly limitExceeded: boolean; // Hard limit flag
	readonly isDoctorWorkBlocked: false; // Mandates 8e & 8n: Doctor care is NEVER blocked
	readonly coverageIndicatorRu: string; // Statutory clinical status indicator
	readonly rejectionReasonRu?: string | undefined;
	readonly warningMessageRu?: string | undefined;
	readonly actionRecommendationsRu: readonly string[];
}

export interface DmsCoverageEvaluationOptions {
	readonly serviceDate?: string | undefined; // YYYY-MM-DD (defaults to today)
	readonly serviceCode804n?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly isEmergency?: boolean | undefined;
	readonly hasAcutePain?: boolean | undefined;
}

/**
 * Evaluates whether a requested insurer payment can be covered under the guarantee letter.
 *
 * Enforces:
 * 1. Date validity (validFrom <= serviceDate <= validTo).
 * 2. Letter status (must be active).
 * 3. 804n service inclusion/exclusion checks.
 * 4. Soft Warning Threshold: Flags when usage >= 80%.
 * 5. Hard Limit Handling: Exact kopeck overflow shift to patient portion.
 * 6. Clinical Mandate 8e: Acute pain and emergency care are never blocked by missing letters or limits.
 */
export function evaluateGuaranteeLetterCoverage(
	letter: DmsGuaranteeLetter,
	requestedInsurerAmountKopecks: Kopecks,
	options: DmsCoverageEvaluationOptions = {},
): DmsCoverageEvaluation {
	if (!Number.isInteger(requestedInsurerAmountKopecks) || requestedInsurerAmountKopecks < 0) {
		throw new Error(
			`Запрашиваемая сумма страховой должна быть неотрицательным целым числом копеек, получено ${requestedInsurerAmountKopecks}`,
		);
	}

	const serviceDate = options.serviceDate ?? new Date().toISOString().slice(0, 10);
	const recommendations: string[] = [];
	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);

	// 0. Emergency / Acute Pain Override (Мандат 8e: острая боль не блокируется)
	if (isUrgentCare) {
		const isExhausted = letter.remainingLimitKopecks <= 0 || letter.status === "exhausted";
		const isExpired = letter.status === "expired" || serviceDate > letter.validTo;
		const isInactive = letter.status !== "active";
		const hasDiscrepancy = isExhausted || isExpired || isInactive;

		return {
			letterId: letter.id,
			status: "approved",
			isApproved: true,
			approvedInsurerKopecks: requestedInsurerAmountKopecks,
			overflowToPatientKopecks: 0,
			remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
			remainingLimitAfterKopecks: Math.max(0, letter.remainingLimitKopecks - requestedInsurerAmountKopecks),
			limitUsageRatioPercent: letter.limitKopecks > 0
				? Math.round((letter.usedKopecks / letter.limitKopecks) * 100)
				: 100,
			warning80PercentReached: true,
			limitExceeded: requestedInsurerAmountKopecks > letter.remainingLimitKopecks,
			isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Экстренная помощь (острая боль): приём разрешен без блокировок, требуется досылка гарантийного письма ДМС",
			warningMessageRu: hasDiscrepancy
				? "Требуется досылка гарантийного письма ДМС (оказание помощи при острой боли разрешено)"
				: undefined,
			actionRecommendationsRu: [
				"Экстренная помощь (острая боль) оказана без блокировок.",
				"Требуется досылка гарантийного письма ДМС от страховой компании.",
			],
		};
	}

	// 1. Status Check
	if (letter.status !== "active") {
		const statusLabels: Record<DmsGuaranteeLetterStatus, string> = {
			active: "Действует",
			exhausted: "Лимит полностью исчерпан",
			expired: "Срок действия истек",
			cancelled: "Гарантийное письмо аннулировано",
			pending_approval: "На согласовании в страховой",
		};
		return {
			letterId: letter.id,
			status: letter.status === "exhausted" ? "rejected_limit_exhausted" : "rejected_letter_inactive",
			isApproved: false,
			approvedInsurerKopecks: 0,
			overflowToPatientKopecks: requestedInsurerAmountKopecks,
			remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
			remainingLimitAfterKopecks: letter.remainingLimitKopecks,
			limitUsageRatioPercent: letter.limitKopecks > 0
				? Math.round((letter.usedKopecks / letter.limitKopecks) * 100)
				: 100,
			warning80PercentReached: true,
			limitExceeded: true,
			isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Гарантийное письмо неактивно: ${statusLabels[letter.status]}`,
			actionRecommendationsRu: [
				"Сумма переведена в счет оплаты пациентом в кассу клиники.",
				"Запросите дополнительное гарантийное письмо у страховой компании.",
			],
		};
	}

	// 2. Date Validity Check
	if (serviceDate < letter.validFrom) {
		return {
			letterId: letter.id,
			status: "rejected_not_yet_valid",
			isApproved: false,
			approvedInsurerKopecks: 0,
			overflowToPatientKopecks: requestedInsurerAmountKopecks,
			remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
			remainingLimitAfterKopecks: letter.remainingLimitKopecks,
			limitUsageRatioPercent: letter.limitKopecks > 0
				? Math.round((letter.usedKopecks / letter.limitKopecks) * 100)
				: 0,
			warning80PercentReached: false,
			limitExceeded: false,
			isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Дата услуги (${serviceDate}) предшествует началу действия гарантийного письма (${letter.validFrom})`,
			actionRecommendationsRu: [
				"Проверьте дату визита или свяжитесь с куратором страховой компании.",
			],
		};
	}

	if (serviceDate > letter.validTo) {
		return {
			letterId: letter.id,
			status: "rejected_expired",
			isApproved: false,
			approvedInsurerKopecks: 0,
			overflowToPatientKopecks: requestedInsurerAmountKopecks,
			remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
			remainingLimitAfterKopecks: letter.remainingLimitKopecks,
			limitUsageRatioPercent: 100,
			warning80PercentReached: true,
			limitExceeded: true,
			isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Срок действия гарантийного письма истек ${letter.validTo} (дата услуги: ${serviceDate})`,
			actionRecommendationsRu: [
				"Запросите продление гарантийного письма у куратора ДМС.",
				"Вся сумма услуги переводится на оплату пациентом.",
			],
		};
	}

	// 3. Service Scope Check
	if (options.serviceCode804n) {
		const code = options.serviceCode804n.trim();

		// Check explicit exclusions
		if (letter.excluded804nCodes && letter.excluded804nCodes.includes(code)) {
			return {
				letterId: letter.id,
				status: "rejected_service_excluded",
				isApproved: false,
				approvedInsurerKopecks: 0,
				overflowToPatientKopecks: requestedInsurerAmountKopecks,
				remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
				remainingLimitAfterKopecks: letter.remainingLimitKopecks,
				limitUsageRatioPercent: letter.limitKopecks > 0
					? Math.round((letter.usedKopecks / letter.limitKopecks) * 100)
					: 0,
				warning80PercentReached: false,
				limitExceeded: false,
				isDoctorWorkBlocked: false,
				coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
				rejectionReasonRu: `Услуга ${code} (${options.serviceName ?? ""}) исключена из покрытия данным гарантийным письмом`,
				actionRecommendationsRu: [
					"Услуга не входит в программу ДМС застрахованного. Оплата производится пациентом.",
				],
			};
		}

		// Check allowed prefixes if specified
		if (letter.allowed804nPrefixes && letter.allowed804nPrefixes.length > 0) {
			const isAllowed = letter.allowed804nPrefixes.some((prefix) => code.startsWith(prefix));
			if (!isAllowed) {
				return {
					letterId: letter.id,
					status: "rejected_service_not_in_allowed_list",
					isApproved: false,
					approvedInsurerKopecks: 0,
					overflowToPatientKopecks: requestedInsurerAmountKopecks,
					remainingLimitBeforeKopecks: letter.remainingLimitKopecks,
					remainingLimitAfterKopecks: letter.remainingLimitKopecks,
					limitUsageRatioPercent: letter.limitKopecks > 0
						? Math.round((letter.usedKopecks / letter.limitKopecks) * 100)
						: 0,
					warning80PercentReached: false,
					limitExceeded: false,
					isDoctorWorkBlocked: false,
					coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
					rejectionReasonRu: `Код услуги ${code} не соответствует разрешенным разделам программы (${letter.allowed804nPrefixes.join(", ")})`,
					actionRecommendationsRu: [
						"Согласуйте расширение гарантийного письма со страховой компанией.",
					],
				};
			}
		}
	}

	// 4. Limit and Usage Evaluation
	const remaining = letter.remainingLimitKopecks;

	if (remaining <= 0) {
		return {
			letterId: letter.id,
			status: "rejected_limit_exhausted",
			isApproved: false,
			approvedInsurerKopecks: 0,
			overflowToPatientKopecks: requestedInsurerAmountKopecks,
			remainingLimitBeforeKopecks: remaining,
			remainingLimitAfterKopecks: 0,
			limitUsageRatioPercent: 100,
			warning80PercentReached: true,
			limitExceeded: true,
			isDoctorWorkBlocked: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			rejectionReasonRu: `Лимит гарантийного письма полностью исчерпан (${formatKopecksRu(letter.limitKopecks)})`,
			actionRecommendationsRu: [
				"Лимит исчерпан на 100%. Оплата визита полностью переходит на пациента.",
				"Запросите доплату или доп. согласование у страховщика.",
			],
		};
	}

	let approvedInsurer = 0;
	let overflowPatient = 0;
	let limitExceeded = false;
	let status: DmsCoverageEvaluationStatus = "approved";

	if (requestedInsurerAmountKopecks <= remaining) {
		approvedInsurer = requestedInsurerAmountKopecks;
		overflowPatient = 0;
		limitExceeded = false;
		status = "approved";
	} else {
		approvedInsurer = remaining;
		overflowPatient = requestedInsurerAmountKopecks - remaining;
		limitExceeded = true;
		status = "partial_limit_exceeded";
		recommendations.push(
			`Превышение лимита гарантийного письма на ${formatKopecksRu(overflowPatient)}. Сумма превышения переведена в счет пациента.`,
		);
	}

	const newUsed = letter.usedKopecks + approvedInsurer;
	const newRemaining = Math.max(0, letter.limitKopecks - newUsed);
	const projectedUsageRatio = letter.limitKopecks > 0 ? (newUsed / letter.limitKopecks) * 100 : 100;
	const warning80PercentReached = projectedUsageRatio >= 80;

	let warningMessage: string | undefined = undefined;
	if (warning80PercentReached && !limitExceeded) {
		warningMessage = `Внимание: лимит гарантийного письма израсходован на ${projectedUsageRatio.toFixed(1)}% (остаток: ${formatKopecksRu(newRemaining)})`;
		recommendations.push("Рекомендуется уведомить пациента и куратора ДМС о скором исчерпании лимита.");
	}

	const coverageIndicatorRu = limitExceeded
		? `Превышен лимит ДМС: ${formatKopecksRu(approvedInsurer)} покрыто, остаток ${formatKopecksRu(overflowPatient)} переведен на пациента`
		: "Покрывается ДМС в рамках гарантийного письма";

	return {
		letterId: letter.id,
		status,
		isApproved: approvedInsurer > 0,
		approvedInsurerKopecks: approvedInsurer,
		overflowToPatientKopecks: overflowPatient,
		remainingLimitBeforeKopecks: remaining,
		remainingLimitAfterKopecks: newRemaining,
		limitUsageRatioPercent: Math.round(projectedUsageRatio),
		warning80PercentReached,
		limitExceeded,
		isDoctorWorkBlocked: false,
		coverageIndicatorRu,
		warningMessageRu: warningMessage,
		actionRecommendationsRu: recommendations,
	};
}

/**
 * Deducts approved insurer amount from the guarantee letter and records an audit transaction.
 * Returns an updated immutable copy of the guarantee letter.
 * Generates deterministic transaction IDs (zero Math.random).
 */
export function applyGuaranteeLetterDeduction(
	letter: DmsGuaranteeLetter,
	amountToDeductKopecks: Kopecks,
	meta: {
		transactionRef: string;
		serviceDate: string;
		descriptionRu: string;
		doctorName?: string | undefined;
		transactionId?: string | undefined;
	},
): {
	updatedLetter: DmsGuaranteeLetter;
	actualDeductedKopecks: Kopecks;
	overflowToPatientKopecks: Kopecks;
	transaction: DmsLetterTransaction;
} {
	if (!Number.isInteger(amountToDeductKopecks) || amountToDeductKopecks < 0) {
		throw new Error(
			`Сумма списания должна быть неотрицательным целым числом копеек, получено ${amountToDeductKopecks}`,
		);
	}

	const actualDeducted = Math.min(letter.remainingLimitKopecks, amountToDeductKopecks);
	const overflow = amountToDeductKopecks - actualDeducted;

	const newUsed = letter.usedKopecks + actualDeducted;
	const newRemaining = Math.max(0, letter.limitKopecks - newUsed);
	const newStatus: DmsGuaranteeLetterStatus =
		newRemaining === 0 ? "exhausted" : letter.status;

	const txIndex = (letter.transactions?.length ?? 0) + 1;
	const sanitizedRef = meta.transactionRef.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
	const txId = meta.transactionId ?? `tx_${letter.id}_${txIndex}_${sanitizedRef}`;

	const tx: DmsLetterTransaction = {
		id: txId,
		letterId: letter.id,
		dateIso: meta.serviceDate,
		transactionRef: meta.transactionRef,
		amountKopecks: actualDeducted,
		balanceAfterKopecks: newRemaining,
		descriptionRu: meta.descriptionRu,
		doctorName: meta.doctorName,
	};

	const updatedTransactions = [...(letter.transactions ?? []), tx];

	const updatedLetter: DmsGuaranteeLetter = {
		...letter,
		usedKopecks: newUsed,
		remainingLimitKopecks: newRemaining,
		status: newStatus,
		transactions: updatedTransactions,
	};

	return {
		updatedLetter,
		actualDeductedKopecks: actualDeducted,
		overflowToPatientKopecks: overflow,
		transaction: tx,
	};
}

/**
 * Common dental services excluded from standard Russian DMS programs (СОГАЗ, Ингосстрах, АльфаСтрахование, РЕСО, ВСК).
 * These services require separate guarantee letter approval or patient out-of-pocket payment.
 */
export const STANDARD_DMS_EXCLUDED_804N_SERVICES = [
	{ code804n: "A16.07.003", nameRu: "Восстановление зуба керамическим виниром / виниринг", category: "veneers", reasonRu: "Эстетическая реставрация (виниры) исключена из стандартного покрытия ДМС" },
	{ code804n: "A16.07.003.001", nameRu: "Керамический винир (E.max, полевой шпат)", category: "veneers", reasonRu: "Керамические виниры относятся к эстетической стоматологии и не покрываются базовым полисом ДМС" },
	{ code804n: "A16.07.054", nameRu: "Внутрикостная дентальная имплантация", category: "implantology", reasonRu: "Дентальная имплантация исключена из стандартных программ ДМС (требуется спец. программа или оплата пациентом)" },
	{ code804n: "A16.07.006", nameRu: "Установка дентального имплантата (хирургический этап)", category: "implantology", reasonRu: "Хирургическая установка имплантатов исключена из базового покрытия ДМС" },
	{ code804n: "A16.07.050", nameRu: "Профессиональное отбеливание зубов", category: "whitening", reasonRu: "Косметическое отбеливание не входит в стандартный перечень страховых рисков ДМС" },
	{ code804n: "A16.07.048", nameRu: "Ортодонтическая коррекция с применением брекет-систем", category: "orthodontics", reasonRu: "Исправление прикуса и брекет-системы не покрываются стандартным полисом ДМС" },
] as const;

/**
 * Standard dental therapeutic and emergency services covered under Russian DMS programs.
 */
export const STANDARD_DMS_COVERED_804N_PREFIXES = [
	"A16.07.002", // Лечение кариеса (пломбы)
	"A16.07.030", // Эндодонтия: инструментальная обработка каналов
	"A16.07.008", // Пломбирование корневых каналов
	"A16.07.001", // Удаление зубов (хирургия)
	"A11.07.010", // Анестезия инфильтрационная
	"A11.07.011", // Анестезия проводниковая
	"A11.07.012", // Анестезия аппликационная
	"B01.003.004", // Прием врача-стоматолога
	"A06.07.003", // Прицельная рентгенография
	"A06.07.007", // Внутриротовая контактная рентгенография
	"A16.07.051", // Профессиональная гигиена полости рта
] as const;

/**
 * Result of checking an individual dental service against patient's DMS policy and guarantee letter.
 * Non-blocking by design (Mandate 8e & 8n: Doctor work is never blocked).
 */
export interface DmsServiceCheckResult {
	readonly isCovered: boolean;
	readonly coverageIndicatorRu: string;
	readonly isDoctorWorkBlocked: false;
	readonly approvedInsurerKopecks: Kopecks;
	readonly patientPortionKopecks: Kopecks;
	readonly remainingLimitAfterKopecks: Kopecks;
	readonly reasonRu: string;
	readonly recommendationRu: string;
}

/**
 * Evaluates service coverage for clinical assignment.
 * When service is not covered (e.g., ceramic veneer, implant), returns clear indicator:
 * «Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом»
 * WITHOUT blocking doctor's work (Mandate 8n Zero Dead-Ends).
 */
export function checkServiceDmsCoverage(
	letter: DmsGuaranteeLetter | null | undefined,
	service: {
		code804n: string;
		nameRu?: string | undefined;
		priceKopecks: Kopecks;
		isEmergency?: boolean | undefined;
		hasAcutePain?: boolean | undefined;
		serviceDate?: string | undefined;
	},
): DmsServiceCheckResult {
	const isUrgentCare = Boolean(service.isEmergency || service.hasAcutePain);

	if (isUrgentCare) {
		return {
			isCovered: true,
			coverageIndicatorRu: "Экстренная помощь (острая боль): приём разрешен без блокировок, требуется досылка гарантийного письма ДМС",
			isDoctorWorkBlocked: false,
			approvedInsurerKopecks: service.priceKopecks,
			patientPortionKopecks: 0,
			remainingLimitAfterKopecks: letter ? Math.max(0, letter.remainingLimitKopecks - service.priceKopecks) : 0,
			reasonRu: "Экстренная медицинская помощь при острой зубной боли",
			recommendationRu: "Окажите помощь пациенту. Запросите гарантийное письмо у страховой компании.",
		};
	}

	const normalizedCode = service.code804n.trim();
	const isKnownExcluded = STANDARD_DMS_EXCLUDED_804N_SERVICES.some(
		(ex) => normalizedCode === ex.code804n || normalizedCode.startsWith(ex.code804n),
	);

	// Case 1: No guarantee letter present
	if (!letter) {
		if (isKnownExcluded) {
			const excludedMeta = STANDARD_DMS_EXCLUDED_804N_SERVICES.find(
				(ex) => normalizedCode === ex.code804n || normalizedCode.startsWith(ex.code804n),
			);
			return {
				isCovered: false,
				coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
				isDoctorWorkBlocked: false,
				approvedInsurerKopecks: 0,
				patientPortionKopecks: service.priceKopecks,
				remainingLimitAfterKopecks: 0,
				reasonRu: excludedMeta?.reasonRu ?? `Услуга ${normalizedCode} (${service.nameRu ?? ""}) исключена из стандартного ДМС`,
				recommendationRu: "Услуга оплачивается пациентом в кассу или требуется отдельное гарантийное письмо от СМО.",
			};
		}

		// Check if it's a standard covered therapeutic service
		const isStandardCovered = STANDARD_DMS_COVERED_804N_PREFIXES.some((prefix) =>
			normalizedCode.startsWith(prefix),
		);

		if (isStandardCovered) {
			return {
				isCovered: true,
				coverageIndicatorRu: "Покрывается базовой программой ДМС",
				isDoctorWorkBlocked: false,
				approvedInsurerKopecks: service.priceKopecks,
				patientPortionKopecks: 0,
				remainingLimitAfterKopecks: 0,
				reasonRu: `Услуга ${normalizedCode} входит в базовый терапевтический стандарт ДМС`,
				recommendationRu: "Услуга направляется в реестр на возмещение страховой компанией.",
			};
		}

		return {
			isCovered: false,
			coverageIndicatorRu: "Услуга не покрывается ДМС, требуется согласование страховой или оплата пациентом",
			isDoctorWorkBlocked: false,
			approvedInsurerKopecks: 0,
			patientPortionKopecks: service.priceKopecks,
			remainingLimitAfterKopecks: 0,
			reasonRu: `Услуга ${normalizedCode} не входит в стандартный объем без гарантийного письма`,
			recommendationRu: "Услуга оплачивается пациентом либо запрашивается гарантийное письмо у страховой компании.",
		};
	}

	// Case 2: Guarantee letter provided
	const evaluation = evaluateGuaranteeLetterCoverage(letter, service.priceKopecks, {
		serviceCode804n: service.code804n,
		serviceName: service.nameRu,
		serviceDate: service.serviceDate,
		isEmergency: service.isEmergency,
		hasAcutePain: service.hasAcutePain,
	});

	return {
		isCovered: evaluation.isApproved,
		coverageIndicatorRu: evaluation.coverageIndicatorRu,
		isDoctorWorkBlocked: false,
		approvedInsurerKopecks: evaluation.approvedInsurerKopecks,
		patientPortionKopecks: evaluation.overflowToPatientKopecks,
		remainingLimitAfterKopecks: evaluation.remainingLimitAfterKopecks,
		reasonRu: evaluation.rejectionReasonRu ?? (evaluation.isApproved ? "Услуга согласована страховой компанией" : "Не согласовано"),
		recommendationRu: evaluation.actionRecommendationsRu[0] ?? "Действуйте в соответствии с регламентом ДМС.",
	};
}
