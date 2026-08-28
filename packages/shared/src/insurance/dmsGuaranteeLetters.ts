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
	readonly rejectionReasonRu?: string | undefined;
	readonly warningMessageRu?: string | undefined;
	readonly actionRecommendationsRu: readonly string[];
}

export interface DmsCoverageEvaluationOptions {
	readonly serviceDate?: string | undefined; // YYYY-MM-DD (defaults to today)
	readonly serviceCode804n?: string | undefined;
	readonly serviceName?: string | undefined;
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
		warningMessageRu: warningMessage,
		actionRecommendationsRu: recommendations,
	};
}

/**
 * Deducts approved insurer amount from the guarantee letter and records an audit transaction.
 * Returns an updated immutable copy of the guarantee letter.
 */
export function applyGuaranteeLetterDeduction(
	letter: DmsGuaranteeLetter,
	amountToDeductKopecks: Kopecks,
	meta: {
		transactionRef: string;
		serviceDate: string;
		descriptionRu: string;
		doctorName?: string | undefined;
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

	const tx: DmsLetterTransaction = {
		id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
