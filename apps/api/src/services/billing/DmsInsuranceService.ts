/**
 * DmsInsuranceService.ts — Сервис учета страховых полисов ДМС,
 * гарантийных писем страховых компаний и расчета доплат пациентов (Copay).
 *
 * ФУНКЦИОНАЛЬНЫЕ ВОЗМОЖНОСТИ:
 * 1. Валидация полиса ДМС:
 *    - Номер полиса (строгий формат, непустой, нормализация).
 *    - Страховая компания (наименование).
 *    - Срок действия (validFrom / validTo, проверка активности на дату приёма).
 *    - Лимит страхового покрытия в рублях (годовой/программный лимит, копеечная точность).
 *    - Перечень покрываемых услуг по прайсу (список ID услуг, категорий прайса и коэффициентов покрытия).
 *
 * 2. Учет гарантийных писем страховых компаний (ГП):
 *    - Номер гарантийного письма и дата выдачи.
 *    - Срок действия письма (validUntil).
 *    - Разрешенная (согласованная) сумма покрытия.
 *    - Перечень конкретно согласованных услуг (расширение базового покрытия полиса).
 *    - Учет расходования средств по гарантийному письму.
 *
 * 3. Расчет доплаты пациента при превышении лимита ДМС:
 *    - `computePatientCopay(serviceTotalRub, dmsCoverageLimitRub)` с копеечной точностью без IEEE-754 дрейфа.
 *
 * 4. Комплексный биллинговый расчет сметы/счета по ДМС (`processDmsClaim`):
 *    - Построчный расчет покрытия с учетом правил категорий, полиса и гарантийного письма.
 *    - Формирование счетов для страховой компании и квитанций доплаты для пациента.
 */

import { Decimal } from "decimal.js";
import { z } from "zod";

// Настройка высокой точности вычислений для финансовых операций
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const DMS_DEFAULT_CURRENCY = "RUB" as const;

/** Категории стоматологических услуг для программ ДМС */
export const DMS_SERVICE_CATEGORIES = [
	"consultation",
	"diagnostics",
	"imaging",
	"therapy",
	"surgery",
	"periodontology",
	"hygiene",
	"orthodontics",
	"prosthetics",
	"implantology",
	"anesthesia",
	"documents",
	"other",
] as const;

export type DmsServiceCategory = (typeof DMS_SERVICE_CATEGORIES)[number];

export type DmsPolicyStatus =
	| "active"
	| "expired"
	| "not_yet_valid"
	| "suspended"
	| "limit_exhausted";

export type GuaranteeLetterStatus =
	| "active"
	| "expired"
	| "exhausted"
	| "cancelled";

export type DmsBillingErrorCode =
	| "InvalidPolicy"
	| "PolicyExpired"
	| "PolicyNotYetValid"
	| "InvalidGuaranteeLetter"
	| "GuaranteeLetterExpired"
	| "GuaranteeLetterExhausted"
	| "InvalidAmount"
	| "ServiceNotCovered"
	| "ValidationError";

export class DmsBillingError extends Error {
	constructor(
		readonly code: DmsBillingErrorCode,
		message: string,
	) {
		super(message);
		this.name = "DmsBillingError";
	}
}

/**
 * Округление денежной суммы до копеек (2 знака после запятой, ROUND_HALF_UP).
 */
export function roundMoneyRub(amount: Decimal | number): number {
	const dec = amount instanceof Decimal ? amount : new Decimal(amount);
	if (!dec.isFinite()) {
		throw new DmsBillingError("InvalidAmount", "Сумма должна быть конечным числом");
	}
	return dec.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Преобразование рублей в целочисленные копейки.
 */
export function rubToKopecks(rub: number | Decimal): number {
	const dec = rub instanceof Decimal ? rub : new Decimal(rub);
	if (!dec.isFinite()) {
		throw new DmsBillingError("InvalidAmount", "Сумма в рублях должна быть конечным числом");
	}
	return dec.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * Преобразование копеек в рубли.
 */
export function kopecksToRub(kopecks: number): number {
	if (!Number.isFinite(kopecks)) {
		throw new DmsBillingError("InvalidAmount", "Сумма в копейках должна быть конечным числом");
	}
	return new Decimal(kopecks).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

// ─── ZOD СХЕМЫ ДЛЯ ВАЛИДАЦИИ ──────────────────────────────────────────────────

export const dmsPolicyInputSchema = z.object({
	id: z.string().optional(),
	organizationId: z.string().optional(),
	patientId: z.string().optional(),
	policyNumber: z.string().trim().min(1, "Номер полиса ДМС обязателен для заполнения"),
	insuranceCompany: z.string().trim().min(1, "Наименование страховой компании обязательно"),
	validFrom: z.union([z.date(), z.string().datetime(), z.string().min(8)]),
	validTo: z.union([z.date(), z.string().datetime(), z.string().min(8)]),
	coverageLimitRub: z.number().nonnegative("Лимит покрытия ДМС не может быть отрицательным").nullable().optional(),
	usedLimitRub: z.number().nonnegative("Израсходованная сумма не может быть отрицательной").default(0),
	coveredServiceIds: z.array(z.string().trim()).optional(),
	coveredCategories: z.array(z.string()).optional(),
	categoryCoveragePcts: z.record(z.string(), z.number().min(0).max(100)).optional(),
	isActive: z.boolean().default(true),
	notes: z.string().optional(),
});

export type DmsPolicyInput = z.input<typeof dmsPolicyInputSchema>;
export type ValidatedDmsPolicy = z.output<typeof dmsPolicyInputSchema>;

export const guaranteeLetterInputSchema = z.object({
	id: z.string().optional(),
	organizationId: z.string().optional(),
	patientId: z.string().optional(),
	letterNumber: z.string().trim().min(1, "Номер гарантийного письма обязателен"),
	insuranceCompany: z.string().trim().min(1, "Наименование страховой компании обязательно"),
	issueDate: z.union([z.date(), z.string().datetime(), z.string().min(8)]),
	validUntil: z.union([z.date(), z.string().datetime(), z.string().min(8)]).optional(),
	approvedAmountRub: z.number().positive("Разрешенная сумма по гарантийному письму должна быть больше 0"),
	usedAmountRub: z.number().nonnegative("Израсходованная сумма не может быть отрицательной").default(0),
	coveredServiceIds: z.array(z.string().trim()).optional(),
	approvedDiagnosisCodes: z.array(z.string().trim()).optional(),
	notes: z.string().optional(),
	isActive: z.boolean().default(true),
});

export type GuaranteeLetterInput = z.input<typeof guaranteeLetterInputSchema>;
export type ValidatedGuaranteeLetter = z.output<typeof guaranteeLetterInputSchema>;

export const dmsInvoiceItemSchema = z.object({
	serviceId: z.string().trim().min(1, "Идентификатор услуги обязателен"),
	serviceName: z.string().trim().min(1, "Наименование услуги обязательно"),
	category: z.string().default("therapy"),
	priceRub: z.number().nonnegative("Цена услуги не может быть отрицательной"),
	quantity: z.number().int().positive("Количество должно быть положительным целым числом").default(1),
	diagnosisCode: z.string().trim().optional(),
});

export type DmsInvoiceItem = z.infer<typeof dmsInvoiceItemSchema>;

// ─── РЕЗУЛЬТАТЫ ВАЛИДАЦИИ ────────────────────────────────────────────────────

export interface DmsPolicyValidationResult {
	isValid: boolean;
	status: DmsPolicyStatus;
	errors: string[];
	warnings: string[];
	policyNumber: string;
	insuranceCompany: string;
	validFrom: Date;
	validTo: Date;
	coverageLimitRub: number | null;
	usedLimitRub: number;
	remainingLimitRub: number | null;
	coveredServiceIdsCount: number;
	coveredCategories: string[];
}

export interface GuaranteeLetterValidationResult {
	isValid: boolean;
	status: GuaranteeLetterStatus;
	errors: string[];
	warnings: string[];
	letterNumber: string;
	insuranceCompany: string;
	issueDate: Date;
	validUntil: Date | null;
	approvedAmountRub: number;
	usedAmountRub: number;
	remainingAmountRub: number;
	coveredServiceIdsCount: number;
}

export interface CopayCalculationResult {
	/** Общая стоимость услуг в рублях */
	serviceTotalRub: number;
	/** Доступный лимит покрытия ДМС в рублях */
	dmsCoverageLimitRub: number;
	/** Сумма, покрываемая страховой компанией ДМС */
	coveredByDmsRub: number;
	/** Сумма доплаты пациента (Copay) */
	patientCopayRub: number;
	/** Флаг: превышен ли лимит покрытия ДМС */
	isLimitExceeded: boolean;
	/** Сумма превышения лимита (если превышен) */
	exceededByRub: number;
	/** Остаток лимита ДМС после проведения данной оплаты */
	remainingLimitRub: number;
	/** Валидационное подтверждение равенства: покрыто + доплата === итого */
	isBalanced: boolean;
}

export interface DmsServiceCoverageResult {
	isCovered: boolean;
	coveragePct: number;
	source: "guarantee_letter" | "policy_service_list" | "policy_category" | "policy_default" | "not_covered";
	reason: string;
	guaranteeLetterApproved?: boolean | undefined;
}

export interface DmsClaimItemBreakdown {
	serviceId: string;
	serviceName: string;
	category: string;
	quantity: number;
	unitPriceRub: number;
	lineTotalRub: number;
	isCovered: boolean;
	coveragePct: number;
	coverageSource: DmsServiceCoverageResult["source"];
	coveredByGuaranteeLetterRub: number;
	coveredByPolicyRub: number;
	totalCoveredRub: number;
	patientCopayRub: number;
	notes: string;
}

export interface DmsClaimCalculationResult {
	policyNumber: string;
	insuranceCompany: string;
	guaranteeLetterNumber?: string | undefined;
	totalBillRub: number;
	totalDmsCoveredRub: number;
	totalPatientCopayRub: number;
	guaranteeLetterCoveredRub: number;
	policyCoveredRub: number;
	initialPolicyLimitRub: number | null;
	remainingPolicyLimitRub: number | null;
	initialGuaranteeLetterLimitRub: number | null;
	remainingGuaranteeLetterLimitRub: number | null;
	items: DmsClaimItemBreakdown[];
	isFullyCovered: boolean;
	summaryMessageRu: string;
}

export interface DmsClaimCalculationInput {
	policy: DmsPolicyInput;
	guaranteeLetter?: GuaranteeLetterInput | null | undefined;
	items: DmsInvoiceItem[];
	targetDate?: Date | string | undefined;
}

// ─── СЕРВИС DmsInsuranceService ──────────────────────────────────────────────

export class DmsInsuranceService {
	/**
	 * Парсинг и нормализация даты.
	 */
	public static parseDate(dateInput: Date | string | number | undefined | null): Date {
		if (!dateInput) {
			return new Date();
		}
		if (dateInput instanceof Date) {
			if (Number.isNaN(dateInput.getTime())) {
				throw new DmsBillingError("ValidationError", "Передана некорректная дата");
			}
			return dateInput;
		}
		const parsed = new Date(dateInput);
		if (Number.isNaN(parsed.getTime())) {
			throw new DmsBillingError("ValidationError", `Не удалось распознать дату: "${String(dateInput)}"`);
		}
		return parsed;
	}

	/**
	 * 1. Валидация страхового полиса ДМС:
	 * - Проверка номера полиса, страховой компании
	 * - Срок действия (validFrom <= targetDate <= validTo)
	 * - Лимит покрытия в рублях (неотрицательный, расчет остатка)
	 * - Перечень покрываемых услуг и категорий
	 */
	public static validatePolicy(
		policyInput: DmsPolicyInput,
		targetDateInput?: Date | string | number | undefined,
	): DmsPolicyValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		const parseResult = dmsPolicyInputSchema.safeParse(policyInput);
		if (!parseResult.success) {
			const validationErrors = parseResult.error.issues.map((i) => i.message);
			return {
				isValid: false,
				status: "expired",
				errors: validationErrors,
				warnings: [],
				policyNumber: policyInput?.policyNumber ?? "",
				insuranceCompany: policyInput?.insuranceCompany ?? "",
				validFrom: new Date(0),
				validTo: new Date(0),
				coverageLimitRub: null,
				usedLimitRub: 0,
				remainingLimitRub: null,
				coveredServiceIdsCount: 0,
				coveredCategories: [],
			};
		}

		const policy = parseResult.data;
		const checkDate = DmsInsuranceService.parseDate(targetDateInput);

		const validFrom = DmsInsuranceService.parseDate(policy.validFrom);
		const validTo = DmsInsuranceService.parseDate(policy.validTo);

		// Устанавливаем время на начало и конец дня для корректного сравнения
		const fromStart = new Date(validFrom);
		fromStart.setHours(0, 0, 0, 0);

		const toEnd = new Date(validTo);
		toEnd.setHours(23, 59, 59, 999);

		if (fromStart.getTime() > toEnd.getTime()) {
			errors.push("Дата начала действия полиса не может быть позже даты окончания");
		}

		let status: DmsPolicyStatus = "active";

		if (!policy.isActive) {
			status = "suspended";
			errors.push("Полис ДМС помечен как неактивный или заблокирован");
		} else if (checkDate.getTime() < fromStart.getTime()) {
			status = "not_yet_valid";
			errors.push(
				`Срок действия полиса еще не начался (действует с ${fromStart.toLocaleDateString("ru-RU")}, дата проверки: ${checkDate.toLocaleDateString("ru-RU")})`,
			);
		} else if (checkDate.getTime() > toEnd.getTime()) {
			status = "expired";
			errors.push(
				`Срок действия полиса истек (${toEnd.toLocaleDateString("ru-RU")}, дата проверки: ${checkDate.toLocaleDateString("ru-RU")})`,
			);
		}

		const coverageLimit = policy.coverageLimitRub != null ? roundMoneyRub(policy.coverageLimitRub) : null;
		const usedLimit = roundMoneyRub(policy.usedLimitRub ?? 0);

		let remainingLimit: number | null = null;
		if (coverageLimit != null) {
			if (usedLimit > coverageLimit) {
				warnings.push(
					`Сумма ранее израсходованного лимита (${usedLimit} ₽) превышает установленный лимит полиса (${coverageLimit} ₽)`,
				);
				remainingLimit = 0;
				status = "limit_exhausted";
			} else {
				remainingLimit = roundMoneyRub(new Decimal(coverageLimit).minus(usedLimit));
				if (remainingLimit === 0) {
					status = "limit_exhausted";
					warnings.push("Страховой лимит по полису ДМС полностью исчерпан (остаток 0 ₽)");
				}
			}
		}

		const coveredServiceIdsCount = policy.coveredServiceIds?.length ?? 0;
		const coveredCategories = policy.coveredCategories ?? [];

		return {
			isValid: errors.length === 0,
			status,
			errors,
			warnings,
			policyNumber: policy.policyNumber.trim(),
			insuranceCompany: policy.insuranceCompany.trim(),
			validFrom,
			validTo,
			coverageLimitRub: coverageLimit,
			usedLimitRub: usedLimit,
			remainingLimitRub: remainingLimit,
			coveredServiceIdsCount,
			coveredCategories,
		};
	}

	/**
	 * 2. Учет и валидация гарантийного письма (ГП) страховой компании:
	 * - Номер письма, дата выдачи, срок действия (если указан)
	 * - Разрешенная сумма и остаток средств
	 * - Перечень согласованных услуг
	 */
	public static validateGuaranteeLetter(
		letterInput: GuaranteeLetterInput,
		targetDateInput?: Date | string | number | undefined,
	): GuaranteeLetterValidationResult {
		const errors: string[] = [];
		const warnings: string[] = [];

		const parseResult = guaranteeLetterInputSchema.safeParse(letterInput);
		if (!parseResult.success) {
			const validationErrors = parseResult.error.issues.map((i) => i.message);
			return {
				isValid: false,
				status: "expired",
				errors: validationErrors,
				warnings: [],
				letterNumber: letterInput?.letterNumber ?? "",
				insuranceCompany: letterInput?.insuranceCompany ?? "",
				issueDate: new Date(0),
				validUntil: null,
				approvedAmountRub: 0,
				usedAmountRub: 0,
				remainingAmountRub: 0,
				coveredServiceIdsCount: 0,
			};
		}

		const letter = parseResult.data;
		const checkDate = DmsInsuranceService.parseDate(targetDateInput);

		const issueDate = DmsInsuranceService.parseDate(letter.issueDate);
		const validUntil = letter.validUntil ? DmsInsuranceService.parseDate(letter.validUntil) : null;

		let status: GuaranteeLetterStatus = "active";

		if (!letter.isActive) {
			status = "cancelled";
			errors.push("Гарантийное письмо аннулировано или отозвано страховой компанией");
		}

		if (validUntil) {
			const validUntilEnd = new Date(validUntil);
			validUntilEnd.setHours(23, 59, 59, 999);

			if (checkDate.getTime() > validUntilEnd.getTime()) {
				status = "expired";
				errors.push(
					`Срок действия гарантийного письма истек (${validUntilEnd.toLocaleDateString("ru-RU")}, дата проверки: ${checkDate.toLocaleDateString("ru-RU")})`,
				);
			}
		}

		const approvedAmount = roundMoneyRub(letter.approvedAmountRub);
		const usedAmount = roundMoneyRub(letter.usedAmountRub ?? 0);

		let remainingAmount = 0;
		if (usedAmount >= approvedAmount) {
			remainingAmount = 0;
			status = "exhausted";
			if (usedAmount > approvedAmount) {
				warnings.push(
					`Израсходованная сумма (${usedAmount} ₽) превышает сумму гарантийного письма (${approvedAmount} ₽)`,
				);
			} else {
				warnings.push("Сумма гарантийного письма полностью исчерпана");
			}
		} else {
			remainingAmount = roundMoneyRub(new Decimal(approvedAmount).minus(usedAmount));
		}

		const coveredServiceIdsCount = letter.coveredServiceIds?.length ?? 0;

		return {
			isValid: errors.length === 0 && remainingAmount > 0,
			status,
			errors,
			warnings,
			letterNumber: letter.letterNumber.trim(),
			insuranceCompany: letter.insuranceCompany.trim(),
			issueDate,
			validUntil,
			approvedAmountRub: approvedAmount,
			usedAmountRub: usedAmount,
			remainingAmountRub: remainingAmount,
			coveredServiceIdsCount,
		};
	}

	/**
	 * 3. Расчет доплаты пациента при превышении лимита ДМС:
	 * `computePatientCopay(serviceTotalRub, dmsCoverageLimitRub)`
	 *
	 * Инварианты:
	 * - Копеечная точность без IEEE-754 ошибок
	 * - `coveredByDmsRub + patientCopayRub === serviceTotalRub`
	 * - Если `serviceTotal <= limit`: доплата = 0, покрыто = serviceTotal
	 * - Если `serviceTotal > limit`: доплата = serviceTotal - limit, покрыто = limit
	 */
	public static computePatientCopay(
		serviceTotalRub: number,
		dmsCoverageLimitRub: number,
	): CopayCalculationResult {
		if (!Number.isFinite(serviceTotalRub) || serviceTotalRub < 0) {
			throw new DmsBillingError(
				"InvalidAmount",
				`Стоимость услуг должна быть неотрицательным числом, получено: ${serviceTotalRub}`,
			);
		}
		if (!Number.isFinite(dmsCoverageLimitRub) || dmsCoverageLimitRub < 0) {
			throw new DmsBillingError(
				"InvalidAmount",
				`Лимит покрытия ДМС должен быть неотрицательным числом, получено: ${dmsCoverageLimitRub}`,
			);
		}

		const totalKopecks = rubToKopecks(serviceTotalRub);
		const limitKopecks = rubToKopecks(dmsCoverageLimitRub);

		let coveredKopecks = 0;
		let copayKopecks = 0;
		let remainingKopecks = 0;
		let isLimitExceeded = false;
		let exceededKopecks = 0;

		if (totalKopecks <= limitKopecks) {
			coveredKopecks = totalKopecks;
			copayKopecks = 0;
			remainingKopecks = limitKopecks - totalKopecks;
			isLimitExceeded = false;
			exceededKopecks = 0;
		} else {
			coveredKopecks = limitKopecks;
			copayKopecks = totalKopecks - limitKopecks;
			remainingKopecks = 0;
			isLimitExceeded = true;
			exceededKopecks = totalKopecks - limitKopecks;
		}

		const serviceTotal = kopecksToRub(totalKopecks);
		const dmsCoverageLimit = kopecksToRub(limitKopecks);
		const coveredByDms = kopecksToRub(coveredKopecks);
		const patientCopay = kopecksToRub(copayKopecks);
		const exceededBy = kopecksToRub(exceededKopecks);
		const remainingLimit = kopecksToRub(remainingKopecks);

		// Проверка баланса
		const isBalanced = coveredKopecks + copayKopecks === totalKopecks;

		return {
			serviceTotalRub: serviceTotal,
			dmsCoverageLimitRub: dmsCoverageLimit,
			coveredByDmsRub: coveredByDms,
			patientCopayRub: patientCopay,
			isLimitExceeded,
			exceededByRub: exceededBy,
			remainingLimitRub: remainingLimit,
			isBalanced,
		};
	}

	/**
	 * Проверка покрытия конкретной услуги полисом или гарантийным письмом.
	 */
	public static isServiceCovered(
		policy: DmsPolicyInput,
		serviceId: string,
		options?: {
			category?: string | undefined;
			guaranteeLetter?: GuaranteeLetterInput | null | undefined;
		},
	): DmsServiceCoverageResult {
		const cleanServiceId = serviceId.trim();

		// 1. Приоритетная проверка гарантийного письма: ГП может согласовывать услуги сверх полиса
		const isLetterActive = options?.guaranteeLetter ? (options.guaranteeLetter.isActive ?? true) : false;
		if (options?.guaranteeLetter && isLetterActive) {
			const letterServices = options.guaranteeLetter.coveredServiceIds;
			if (letterServices && letterServices.length > 0) {
				if (letterServices.includes(cleanServiceId)) {
					return {
						isCovered: true,
						coveragePct: 100,
						source: "guarantee_letter",
						reason: `Услуга согласована гарантийным письмом № ${options.guaranteeLetter.letterNumber}`,
						guaranteeLetterApproved: true,
					};
				}
			} else {
				// Если перечень услуг в ГП пуст, но ГП активно — оно может покрывать любые услуги в пределах суммы
				return {
					isCovered: true,
					coveragePct: 100,
					source: "guarantee_letter",
					reason: `Услуга покрывается гарантийным письмом № ${options.guaranteeLetter.letterNumber} (открытый перечень)`,
					guaranteeLetterApproved: true,
				};
			}
		}

		// 2. Проверка персонального списка услуг полиса
		if (policy.coveredServiceIds && policy.coveredServiceIds.length > 0) {
			if (policy.coveredServiceIds.includes(cleanServiceId)) {
				return {
					isCovered: true,
					coveragePct: 100,
					source: "policy_service_list",
					reason: "Услуга включена в индивидуальную спецификацию полиса ДМС",
				};
			}
		}

		// 3. Проверка по категориям прайс-листа
		const category = options?.category ?? "therapy";

		// 3.1. Явная процентная ставка по категории
		if (policy.categoryCoveragePcts && category in policy.categoryCoveragePcts) {
			const pct = policy.categoryCoveragePcts[category] ?? 0;
			if (pct > 0) {
				return {
					isCovered: true,
					coveragePct: pct,
					source: "policy_category",
					reason: `Категория «${category}» покрывается программой ДМС на ${pct}%`,
				};
			}
			return {
				isCovered: false,
				coveragePct: 0,
				source: "not_covered",
				reason: `Категория «${category}» имеет 0% покрытия по условиям договора ДМС`,
			};
		}

		// 3.2. Вхождение в список разрешенных категорий
		if (policy.coveredCategories && policy.coveredCategories.length > 0) {
			if (policy.coveredCategories.includes(category)) {
				return {
					isCovered: true,
					coveragePct: 100,
					source: "policy_category",
					reason: `Категория «${category}» включена в перечень покрываемых категорий ДМС`,
				};
			}
			return {
				isCovered: false,
				coveragePct: 0,
				source: "not_covered",
				reason: `Категория «${category}» не входит в перечень разрешенных категорий полиса ДМС`,
			};
		}

		// 4. По умолчанию для базовых категорий
		const defaultCategoryCoverage: Record<string, number> = {
			consultation: 100,
			diagnostics: 100,
			imaging: 100,
			therapy: 100,
			surgery: 80,
			hygiene: 100,
			periodontology: 80,
			orthodontics: 0,
			prosthetics: 0,
			implantology: 0,
			anesthesia: 100,
			documents: 0,
			other: 0,
		};

		const defaultPct = defaultCategoryCoverage[category] ?? 0;
		if (defaultPct > 0) {
			return {
				isCovered: true,
				coveragePct: defaultPct,
				source: "policy_default",
				reason: `Базовое покрытие категории «${category}» составляет ${defaultPct}%`,
			};
		}

		return {
			isCovered: false,
			coveragePct: 0,
			source: "not_covered",
			reason: `Услуга/категория «${category}» не покрывается базовой программой ДМС`,
		};
	}

	/**
	 * 4. Комплексный расчет сметы/счета с учетом полиса ДМС,
	 * гарантийного письма, лимитов и расчета доплаты пациента.
	 */
	public static processDmsClaim(input: DmsClaimCalculationInput): DmsClaimCalculationResult {
		const targetDate = DmsInsuranceService.parseDate(input.targetDate);

		// 1. Валидация полиса
		const policyVal = DmsInsuranceService.validatePolicy(input.policy, targetDate);
		if (!policyVal.isValid) {
			throw new DmsBillingError(
				"InvalidPolicy",
				`Полис ДМС недействителен: ${policyVal.errors.join("; ")}`,
			);
		}

		// 2. Валидация гарантийного письма (если передано)
		let guaranteeLetterVal: GuaranteeLetterValidationResult | null = null;
		if (input.guaranteeLetter) {
			guaranteeLetterVal = DmsInsuranceService.validateGuaranteeLetter(
				input.guaranteeLetter,
				targetDate,
			);
		}

		// Доступные лимиты в копейках
		let availableGuaranteeLetterKopecks = guaranteeLetterVal?.isValid
			? rubToKopecks(guaranteeLetterVal.remainingAmountRub)
			: 0;

		let availablePolicyKopecks =
			policyVal.remainingLimitRub != null ? rubToKopecks(policyVal.remainingLimitRub) : null;

		let totalBillKopecks = 0;
		let totalCoveredByLetterKopecks = 0;
		let totalCoveredByPolicyKopecks = 0;
		let totalCopayKopecks = 0;

		const breakdownItems: DmsClaimItemBreakdown[] = [];

		for (const item of input.items) {
			const unitPriceKopecks = rubToKopecks(item.priceRub);
			const lineTotalKopecks = unitPriceKopecks * item.quantity;
			totalBillKopecks += lineTotalKopecks;

			// Проверяем покрытие по гарантийному письму и базовому полису
			const letterCoverageResult = DmsInsuranceService.isServiceCovered(
				input.policy,
				item.serviceId,
				{
					category: item.category,
					guaranteeLetter: input.guaranteeLetter ?? null,
				},
			);

			const basePolicyCoverageResult = DmsInsuranceService.isServiceCovered(
				input.policy,
				item.serviceId,
				{
					category: item.category,
					guaranteeLetter: null, // проверяем только правила полиса
				},
			);

			let lineCoveredByLetterKopecks = 0;
			let lineCoveredByPolicyKopecks = 0;
			let notes = letterCoverageResult.reason;

			// 1. Если услуга одобрена по гарантийному письму, сначала расходуем лимит ГП
			let remainingLineKopecks = lineTotalKopecks;
			if (
				letterCoverageResult.guaranteeLetterApproved &&
				availableGuaranteeLetterKopecks > 0
			) {
				const approvedCoverageKopecks = Math.min(
					remainingLineKopecks,
					availableGuaranteeLetterKopecks,
				);
				lineCoveredByLetterKopecks = approvedCoverageKopecks;
				availableGuaranteeLetterKopecks -= approvedCoverageKopecks;
				remainingLineKopecks -= approvedCoverageKopecks;
			}

			// 2. Для оставшейся суммы (или всей суммы, если ГП не применялось) применяем базовый полис ДМС
			if (
				remainingLineKopecks > 0 &&
				basePolicyCoverageResult.isCovered &&
				basePolicyCoverageResult.coveragePct > 0
			) {
				const targetPolicyKopecks = Math.round(
					remainingLineKopecks * (basePolicyCoverageResult.coveragePct / 100),
				);

				if (availablePolicyKopecks != null) {
					const coveredByPolicy = Math.min(targetPolicyKopecks, availablePolicyKopecks);
					lineCoveredByPolicyKopecks = coveredByPolicy;
					availablePolicyKopecks -= coveredByPolicy;
					if (coveredByPolicy < targetPolicyKopecks) {
						notes += " (покрытие полисом ограничено исчерпанием страхового лимита)";
					}
				} else {
					// Неограниченный лимит
					lineCoveredByPolicyKopecks = targetPolicyKopecks;
				}
			}

			const totalLineCoveredKopecks =
				lineCoveredByLetterKopecks + lineCoveredByPolicyKopecks;
			const lineCopayKopecks = lineTotalKopecks - totalLineCoveredKopecks;

			totalCoveredByLetterKopecks += lineCoveredByLetterKopecks;
			totalCoveredByPolicyKopecks += lineCoveredByPolicyKopecks;
			totalCopayKopecks += lineCopayKopecks;

			const effectivePct =
				lineTotalKopecks > 0
					? Math.round((totalLineCoveredKopecks / lineTotalKopecks) * 100)
					: 0;

			breakdownItems.push({
				serviceId: item.serviceId,
				serviceName: item.serviceName,
				category: item.category,
				quantity: item.quantity,
				unitPriceRub: kopecksToRub(unitPriceKopecks),
				lineTotalRub: kopecksToRub(lineTotalKopecks),
				isCovered: totalLineCoveredKopecks > 0,
				coveragePct: effectivePct,
				coverageSource: letterCoverageResult.source,
				coveredByGuaranteeLetterRub: kopecksToRub(lineCoveredByLetterKopecks),
				coveredByPolicyRub: kopecksToRub(lineCoveredByPolicyKopecks),
				totalCoveredRub: kopecksToRub(totalLineCoveredKopecks),
				patientCopayRub: kopecksToRub(lineCopayKopecks),
				notes,
			});
		}

		const totalBillRub = kopecksToRub(totalBillKopecks);
		const guaranteeLetterCoveredRub = kopecksToRub(totalCoveredByLetterKopecks);
		const policyCoveredRub = kopecksToRub(totalCoveredByPolicyKopecks);
		const totalDmsCoveredRub = kopecksToRub(
			totalCoveredByLetterKopecks + totalCoveredByPolicyKopecks,
		);
		const totalPatientCopayRub = kopecksToRub(totalCopayKopecks);

		const remainingPolicyLimitRub =
			availablePolicyKopecks != null ? kopecksToRub(availablePolicyKopecks) : null;
		const remainingGuaranteeLetterLimitRub = guaranteeLetterVal
			? kopecksToRub(availableGuaranteeLetterKopecks)
			: null;

		const isFullyCovered = totalPatientCopayRub === 0;

		let summaryMessageRu = "";
		if (isFullyCovered) {
			summaryMessageRu = `Счет на сумму ${totalBillRub} ₽ полностью покрыт страховой компанией (${policyVal.insuranceCompany}). Доплата пациента: 0 ₽.`;
		} else {
			summaryMessageRu = `Из общей суммы ${totalBillRub} ₽ страховая компания покрывает ${totalDmsCoveredRub} ₽. Доплата пациента (Copay): ${totalPatientCopayRub} ₽.`;
		}

		return {
			policyNumber: policyVal.policyNumber,
			insuranceCompany: policyVal.insuranceCompany,
			...(input.guaranteeLetter?.letterNumber
				? { guaranteeLetterNumber: input.guaranteeLetter.letterNumber }
				: {}),
			totalBillRub,
			totalDmsCoveredRub,
			totalPatientCopayRub,
			guaranteeLetterCoveredRub,
			policyCoveredRub,
			initialPolicyLimitRub: policyVal.coverageLimitRub,
			remainingPolicyLimitRub,
			initialGuaranteeLetterLimitRub: guaranteeLetterVal
				? guaranteeLetterVal.approvedAmountRub
				: null,
			remainingGuaranteeLetterLimitRub,
			items: breakdownItems,
			isFullyCovered,
			summaryMessageRu,
		};
	}
}
