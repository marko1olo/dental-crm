/**
 * DENTE Dental CRM — Strict Mathematical DMS & Franchise Billing Engine.
 *
 * Implements:
 * 1. Integer Kopeck Arithmetic (type Kopecks = number) with ZERO floating-point rounding errors.
 * 2. Statutory Russian DMS Franchise Split (Сплитование чека):
 *      patientKopecks = Math.round((totalKopecks * franchisePercent) / 100)
 *      insurerKopecks = totalKopecks - patientKopecks
 *    Guarantee: patientKopecks + insurerKopecks === totalKopecks (to the exact kopeck).
 * 3. Standard Russian corporate franchise tiers: 0%, 10%, 20%, 30%, 50%, 80%.
 * 4. Multi-item invoice breakdown with per-item franchise overrides and non-covered service exclusions.
 * 5. Guarantee letter limit overflow handling: insurer share above remaining limit automatically
 *    converts to patient portion with penny-exact balance preservation.
 */

import { z } from "zod";
import type { Kopecks } from "../money.js";
import { formatKopecksRu, formatKopecksToRub, kopecksToRubles, rublesToKopecks } from "../money.js";
import { STANDARD_DMS_EXCLUDED_804N_SERVICES } from "./guaranteeModules/guaranteeMatcher.js";
import {
	type DmsGuaranteeLetter,
	dmsSplitCalculationItemSchema,
	type InsuranceContract,
} from "../schemas/documentChainAndDmsSchemas.js";

/**
 * Standard Russian DMS franchise rates applied by corporate health insurers (СОГАЗ, Ингосстрах, АльфаСтрахование, РЕСО).
 */
export const STANDARD_DMS_FRANCHISE_RATES = [0, 10, 20, 30, 50, 80] as const;
export type StandardDmsFranchiseRate = (typeof STANDARD_DMS_FRANCHISE_RATES)[number];

export interface DmsFranchisePreset {
	readonly ratePercent: number;
	readonly labelRu: string;
	readonly titleRu: string;
	readonly descriptionRu: string;
	readonly isCommonRussianCorporateRate: boolean;
}

export const DMS_FRANCHISE_PRESETS: readonly DmsFranchisePreset[] = [
	{
		ratePercent: 0,
		labelRu: "0% (Полный ДМС)",
		titleRu: "100% покрытие страховой компанией",
		descriptionRu: "Без франшизы. Страховая компания полностью оплачивает все покрываемые договором медицинские услуги.",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 10,
		labelRu: "10% (Минимальная франшиза)",
		titleRu: "90% страховая / 10% пациент",
		descriptionRu: "Корпоративный тариф с символическим участием пациента (10% от стоимости приема оплачивает застрахованный).",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 20,
		labelRu: "20% (Стандартная франшиза)",
		titleRu: "80% страховая / 20% пациент",
		descriptionRu: "Наиболее распространенный тариф ДМС в РФ. 80% счета покрывает страховая, 20% удерживается в кассе клиники с пациента.",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 30,
		labelRu: "30% (Расширенная франшиза)",
		titleRu: "70% страховая / 30% пациент",
		descriptionRu: "Корпоративная программа с повышенным софинансированием сотрудника (30% оплачивает пациент, 70% страховая).",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 50,
		labelRu: "50% (Паритетная сооплата)",
		titleRu: "50% страховая / 50% пациент",
		descriptionRu: "Паритетное разделение расходов (50/50) между страховой компанией и пациентом.",
		isCommonRussianCorporateRate: true,
	},
	{
		ratePercent: 80,
		labelRu: "80% (Высокая франшиза)",
		titleRu: "20% страховая / 80% пациент",
		descriptionRu: "Программа с минимальным участием страховой (20% покрывает полис ДМС, 80% оплачивает пациент).",
		isCommonRussianCorporateRate: true,
	},
];

/**
 * Validates whether the given franchise rate is a valid percentage (integer 0..100).
 */
export function isValidFranchiseRate(rate: number): boolean {
	return Number.isInteger(rate) && rate >= 0 && rate <= 100;
}

/**
 * Zod schema for DMS franchise percentage (0..100 integer).
 */
export const dmsFranchiseRateSchema = z
	.number()
	.int({ message: "Процент франшизы должен быть целым числом" })
	.min(0, { message: "Процент франшизы не может быть меньше 0%" })
	.max(100, { message: "Процент франшизы не может превышать 100%" });

/**
 * Input item for DMS invoice / billing split.
 */
export interface DmsInvoiceItem {
	readonly id: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumberFdi?: number | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly franchisePercentOverride?: number | undefined;
	readonly isCoveredByDms?: boolean | undefined; // default true
	readonly guaranteeLetterId?: string | undefined;
}

export const dmsInvoiceItemSchema = z.object({
	id: z.string().min(1, { message: "Идентификатор позиции обязателен" }),
	serviceCode804n: z.string().min(1, { message: "Код услуги по Номенклатуре 804н обязателен" }),
	serviceName: z.string().min(1, { message: "Наименование услуги обязательно" }),
	toothNumberFdi: z.number().int().min(0).max(85).optional(),
	quantity: z.number().int().positive({ message: "Количество должно быть положительным целым" }),
	unitPriceKopecks: z.number().int().nonnegative({ message: "Цена за единицу должна быть неотрицательной" }),
	totalKopecks: z.number().int().nonnegative({ message: "Сумма позиции должна быть неотрицательной" }),
	franchisePercentOverride: dmsFranchiseRateSchema.optional(),
	isCoveredByDms: z.boolean().optional(),
	guaranteeLetterId: z.string().optional(),
});

/**
 * Result of splitting a single service line between Patient and Insurer.
 */
export interface DmsSplitItemResult {
	readonly itemId: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumberFdi?: number | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly effectiveFranchisePercent: number;
	readonly isCoveredByDms: boolean;
	readonly patientKopecks: Kopecks;
	readonly insurerKopecks: Kopecks;
}

export const dmsSplitItemResultSchema = z.object({
	itemId: z.string(),
	serviceCode804n: z.string(),
	serviceName: z.string(),
	toothNumberFdi: z.number().int().optional(),
	quantity: z.number().int().positive(),
	unitPriceKopecks: z.number().int().nonnegative(),
	totalKopecks: z.number().int().nonnegative(),
	effectiveFranchisePercent: dmsFranchiseRateSchema,
	isCoveredByDms: z.boolean(),
	patientKopecks: z.number().int().nonnegative(),
	insurerKopecks: z.number().int().nonnegative(),
});

/**
 * Input for splitting an entire medical invoice or treatment plan.
 */
export interface DmsInvoiceSplitInput {
	readonly items: readonly DmsInvoiceItem[];
	readonly defaultFranchisePercent: number;
	readonly guaranteeLetterRemainingLimitKopecks?: Kopecks | undefined;
}

export const dmsInvoiceSplitInputSchema = z.object({
	items: z.array(dmsInvoiceItemSchema),
	defaultFranchisePercent: dmsFranchiseRateSchema,
	guaranteeLetterRemainingLimitKopecks: z.number().int().nonnegative().optional(),
});

/**
 * Summary breakdown of an invoice split between Patient and Insurer.
 */
export interface DmsInvoiceSplitSummary {
	readonly items: readonly DmsSplitItemResult[];
	readonly totalGrossKopecks: Kopecks;
	readonly calculatedPatientKopecks: Kopecks;
	readonly calculatedInsurerKopecks: Kopecks;
	readonly guaranteeLetterRemainingLimitKopecks?: Kopecks | undefined;
	readonly limitExceeded: boolean;
	readonly limitOverflowKopecks: Kopecks;
	readonly finalPatientKopecks: Kopecks;
	readonly finalInsurerKopecks: Kopecks;
	readonly formattedTotalGrossRu: string;
	readonly formattedFinalPatientRu: string;
	readonly formattedFinalInsurerRu: string;
}

export const dmsInvoiceSplitSummarySchema = z.object({
	items: z.array(dmsSplitItemResultSchema),
	totalGrossKopecks: z.number().int().nonnegative(),
	calculatedPatientKopecks: z.number().int().nonnegative(),
	calculatedInsurerKopecks: z.number().int().nonnegative(),
	guaranteeLetterRemainingLimitKopecks: z.number().int().nonnegative().optional(),
	limitExceeded: z.boolean(),
	limitOverflowKopecks: z.number().int().nonnegative(),
	finalPatientKopecks: z.number().int().nonnegative(),
	finalInsurerKopecks: z.number().int().nonnegative(),
	formattedTotalGrossRu: z.string(),
	formattedFinalPatientRu: z.string(),
	formattedFinalInsurerRu: z.string(),
});

/**
 * Calculates the exact kopeck split for a single service line based on franchise percentage.
 *
 * Mathematical Invariant:
 *   patientKopecks = Math.round((totalKopecks * franchisePercent) / 100)
 *   insurerKopecks = totalKopecks - patientKopecks
 *   patientKopecks + insurerKopecks === totalKopecks
 */
export function calculateItemDmsSplit(
	totalKopecks: Kopecks,
	franchisePercent: number,
	isCoveredByDms = true,
): { patientKopecks: Kopecks; insurerKopecks: Kopecks } {
	if (!Number.isInteger(totalKopecks)) {
		throw new Error(
			`Сумма позиции должна быть целым числом копеек, получено ${totalKopecks}`,
		);
	}
	if (!isValidFranchiseRate(franchisePercent)) {
		throw new Error(
			`Процент франшизы должен быть целым числом от 0 до 100, получено ${franchisePercent}`,
		);
	}

	// If the service is not covered by DMS, 100% goes to the patient
	if (!isCoveredByDms || franchisePercent === 100) {
		return {
			patientKopecks: totalKopecks,
			insurerKopecks: 0,
		};
	}

	// If 0% franchise (full DMS coverage), insurer pays 100%
	if (franchisePercent === 0) {
		return {
			patientKopecks: 0,
			insurerKopecks: totalKopecks,
		};
	}

	const patientKopecks = Math.round((totalKopecks * franchisePercent) / 100);
	const insurerKopecks = totalKopecks - patientKopecks;

	return {
		patientKopecks,
		insurerKopecks,
	};
}

export type DmsSplitCalculationItem = z.infer<typeof dmsSplitCalculationItemSchema>;

export const dmsSplitLineResultSchema = z.object({
	serviceId: z.string(),
	serviceCode: z.string().optional(),
	serviceName: z.string().optional(),
	category: z.string(),
	toothNumber: z.string().optional(),
	quantity: z.number(),
	unitPriceRub: z.number(),
	discountRub: z.number(),
	totalPriceRub: z.number(),
	dmsCoveredRub: z.number(),
	patientCoPayRub: z.number(),
	unitPriceKopecks: z.number().int().optional(),
	discountKopecks: z.number().int().optional(),
	totalPriceKopecks: z.number().int().optional(),
	dmsCoveredKopecks: z.number().int().optional(),
	patientCoPayKopecks: z.number().int().optional(),
	effectiveCoveragePct: z.number(),
	isApprovedByLetter: z.boolean(),
	isExcludedByProgram: z.boolean(),
	splitReason: z.string(),
	status: z.enum(["full_dms", "co_payment", "patient_full"]),
});

export type DmsSplitLineResult = z.infer<typeof dmsSplitLineResultSchema>;

export const dmsSplitCalculationResultSchema = z.object({
	totalBillRub: z.number(),
	totalDmsCoveredRub: z.number(),
	totalPatientCoPayRub: z.number(),
	letterApprovedLimitRub: z.number().nullable(),
	letterUsedAmountRub: z.number(),
	letterRemainingLimitRub: z.number().nullable(),
	totalBillKopecks: z.number().int().optional(),
	totalDmsCoveredKopecks: z.number().int().optional(),
	totalPatientCoPayKopecks: z.number().int().optional(),
	letterApprovedLimitKopecks: z.number().int().nullable().optional(),
	letterUsedAmountKopecks: z.number().int().optional(),
	letterRemainingLimitKopecks: z.number().int().nullable().optional(),
	hasUnapprovedServices: z.boolean(),
	hasExcludedServices: z.boolean(),
	integrityInvariantHolds: z.boolean(),
	warningMessage: z.string().optional(),
	isEmergency: z.boolean().optional(),
	lineItems: z.array(dmsSplitLineResultSchema),
});

export type DmsSplitCalculationResult = z.infer<typeof dmsSplitCalculationResultSchema>;

/**
 * Канонический расчет сплитования счетов ДМС, франшизы, согласований и гарантийных писем.
 * Единственный SSOT для DmsStudio, Fastify роутов и биллинговых интеграций DENTE CRM.
 */
export function calculateDmsGuaranteeSplit(
	letter: Partial<DmsGuaranteeLetter> | null | undefined,
	items: readonly DmsSplitCalculationItem[],
	options: {
		visitDate?: string | undefined;
		contract?: Pick<
			InsuranceContract,
			| "coverageTherapyPct"
			| "coverageSurgeryPct"
			| "coverageOrthoPct"
			| "coverageHygienePct"
			| "annualLimitRub"
		> | null | undefined;
		isEmergency?: boolean | undefined;
		hasAcutePain?: boolean | undefined;
	} = {},
): DmsSplitCalculationResult {
	const lineResults: DmsSplitLineResult[] = [];
	let totalBillKop = 0;
	let totalCoveredKop = 0;
	let totalCoPayKop = 0;

	let hasUnapproved = false;
	let hasExcluded = false;
	const isUrgentCare = Boolean(options.isEmergency || options.hasAcutePain);

	const letterMaxKop = letter != null
		? (typeof (letter as Record<string, unknown>).remainingLimitKopecks === "number" && typeof (letter as Record<string, unknown>).usedKopecks === "number"
			? Number((letter as Record<string, unknown>).remainingLimitKopecks) + Number((letter as Record<string, unknown>).usedKopecks)
			: typeof (letter as Record<string, unknown>).limitKopecks === "number"
			? Number((letter as Record<string, unknown>).limitKopecks)
			: typeof (letter as Record<string, unknown>).maxCoverageKopecks === "number"
			? Number((letter as Record<string, unknown>).maxCoverageKopecks)
			: typeof (letter as Record<string, unknown>).maxApprovedAmountKopecks === "number"
			? Number((letter as Record<string, unknown>).maxApprovedAmountKopecks)
			: letter.maxCoverageRub != null
			? rublesToKopecks(letter.maxCoverageRub)
			: null)
		: null;

	const letterUsedKop = letter != null
		? (typeof (letter as Record<string, unknown>).usedKopecks === "number"
			? Number((letter as Record<string, unknown>).usedKopecks)
			: typeof (letter as Record<string, unknown>).usedAmountKopecks === "number"
			? Number((letter as Record<string, unknown>).usedAmountKopecks)
			: letter.usedAmountRub != null
			? Math.max(0, rublesToKopecks(letter.usedAmountRub))
			: 0)
		: 0;

	let remainingLetterKop = letter != null
		? (typeof (letter as Record<string, unknown>).remainingLimitKopecks === "number"
			? Number((letter as Record<string, unknown>).remainingLimitKopecks)
			: letterMaxKop != null
			? Math.max(0, letterMaxKop - letterUsedKop)
			: null)
		: null;

	const maxCoverageRub = letterMaxKop != null ? kopecksToRubles(letterMaxKop) : (letter ? letter.maxCoverageRub : null);
	const usedAmountRub = kopecksToRubles(letterUsedKop);

	const isPendingCurator = letter ? (letter.status === "pending_approval" || letter.status === "pending_letter") : false;
	const isLetterActive = letter
		? (letter.status === "active" ||
		   letter.status === "approved" ||
		   letter.status === "pending_approval" ||
		   letter.status === "pending_letter" ||
		   letter.status === "billed")
		: false;
	const isExpired = letter && options.visitDate && letter.validUntil
		? options.visitDate > letter.validUntil
		: false;
	const isNotStarted = letter && options.visitDate && letter.validFrom
		? options.visitDate < letter.validFrom
		: false;

	for (const it of items) {
		const unitPriceKop = typeof it.unitPriceKopecks === "number"
			? it.unitPriceKopecks
			: rublesToKopecks(it.priceRub);
		const qty = Math.max(1, it.quantity);
		const discountKop = typeof it.discountKopecks === "number"
			? it.discountKopecks
			: rublesToKopecks(it.discountRub ?? 0);
		const grossLineKop = unitPriceKop * qty;
		const lineTotalKop = Math.max(0, grossLineKop - discountKop);
		totalBillKop += lineTotalKop;

		if (lineTotalKop === 0) {
			lineResults.push({
				serviceId: it.serviceId,
				serviceCode: it.serviceCode,
				serviceName: it.serviceName,
				category: it.category,
				toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
				quantity: qty,
				unitPriceRub: it.priceRub,
				discountRub: it.discountRub ?? 0,
				totalPriceRub: 0,
				dmsCoveredRub: 0,
				patientCoPayRub: 0,
				unitPriceKopecks: unitPriceKop,
				discountKopecks: discountKop,
				totalPriceKopecks: 0,
				dmsCoveredKopecks: 0,
				patientCoPayKopecks: 0,
				effectiveCoveragePct: 0,
				isApprovedByLetter: true,
				isExcludedByProgram: false,
				splitReason: "Нулевая стоимость услуги",
				status: "full_dms",
			});
			continue;
		}

		// 1. Проверка исключений
		let isExcluded = Boolean(it.isExcluded);
		if (letter?.programExclusions?.length && it.category) {
			if (letter.programExclusions.includes(it.category)) {
				isExcluded = true;
			}
		}
		if (isExcluded && !it.isExplicitlyApproved) {
			if (isUrgentCare) {
				// Мандат 8e: при острой боли оказание помощи не блокируется
				const candidateCoveredKop = lineTotalKop;
				totalCoveredKop += candidateCoveredKop;
				lineResults.push({
					serviceId: it.serviceId,
					serviceCode: it.serviceCode,
					serviceName: it.serviceName,
					category: it.category,
					toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
					quantity: qty,
					unitPriceRub: it.priceRub,
					discountRub: it.discountRub ?? 0,
					totalPriceRub: kopecksToRubles(lineTotalKop),
					dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
					patientCoPayRub: 0,
					unitPriceKopecks: unitPriceKop,
					discountKopecks: discountKop,
					totalPriceKopecks: lineTotalKop,
					dmsCoveredKopecks: candidateCoveredKop,
					patientCoPayKopecks: 0,
					effectiveCoveragePct: 100,
					isApprovedByLetter: true,
					isExcludedByProgram: true,
					splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
					status: "full_dms",
				});
				continue;
			}

			hasExcluded = true;
			const coPayKop = lineTotalKop;
			totalCoPayKop += coPayKop;
			lineResults.push({
				serviceId: it.serviceId,
				serviceCode: it.serviceCode,
				serviceName: it.serviceName,
				category: it.category,
				toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
				quantity: qty,
				unitPriceRub: it.priceRub,
				discountRub: it.discountRub ?? 0,
				totalPriceRub: kopecksToRubles(lineTotalKop),
				dmsCoveredRub: 0,
				patientCoPayRub: kopecksToRubles(coPayKop),
				unitPriceKopecks: unitPriceKop,
				discountKopecks: discountKop,
				totalPriceKopecks: lineTotalKop,
				dmsCoveredKopecks: 0,
				patientCoPayKopecks: coPayKop,
				effectiveCoveragePct: 0,
				isApprovedByLetter: false,
				isExcludedByProgram: true,
				splitReason: "Исключение из программы ДМС (100% доплата пациентом)",
				status: "patient_full",
			});
			continue;
		}

		// 2. Проверка активности и сроков гарантийного письма
		if (letter) {
			if (!isLetterActive || isExpired || isNotStarted) {
				if (isUrgentCare) {
					// Мандат 8e: просроченное или неактивное письмо не блокирует острую боль
					const candidateCoveredKop = lineTotalKop;
					totalCoveredKop += candidateCoveredKop;
					lineResults.push({
						serviceId: it.serviceId,
						serviceCode: it.serviceCode,
						serviceName: it.serviceName,
						category: it.category,
						toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
						quantity: qty,
						unitPriceRub: it.priceRub,
						discountRub: it.discountRub ?? 0,
						totalPriceRub: kopecksToRubles(lineTotalKop),
						dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
						patientCoPayRub: 0,
						unitPriceKopecks: unitPriceKop,
						discountKopecks: discountKop,
						totalPriceKopecks: lineTotalKop,
						dmsCoveredKopecks: candidateCoveredKop,
						patientCoPayKopecks: 0,
						effectiveCoveragePct: 100,
						isApprovedByLetter: true,
						isExcludedByProgram: false,
						splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
						status: "full_dms",
					});
					continue;
				}

				hasUnapproved = true;
				const reason = !isLetterActive
					? `Гарантийное письмо № ${letter.letterNumber} неактивно (${letter.status})`
					: isExpired
					? `Срок действия гарантийного письма № ${letter.letterNumber} истек (${letter.validUntil})`
					: `Гарантийное письмо № ${letter.letterNumber} вступает в силу с ${letter.validFrom}`;
				const coPayKop = lineTotalKop;
				totalCoPayKop += coPayKop;
				lineResults.push({
					serviceId: it.serviceId,
					serviceCode: it.serviceCode,
					serviceName: it.serviceName,
					category: it.category,
					toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
					quantity: qty,
					unitPriceRub: it.priceRub,
					discountRub: it.discountRub ?? 0,
					totalPriceRub: kopecksToRubles(lineTotalKop),
					dmsCoveredRub: 0,
					patientCoPayRub: kopecksToRubles(coPayKop),
					unitPriceKopecks: unitPriceKop,
					discountKopecks: discountKop,
					totalPriceKopecks: lineTotalKop,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: coPayKop,
					effectiveCoveragePct: 0,
					isApprovedByLetter: false,
					isExcludedByProgram: false,
					splitReason: reason,
					status: "patient_full",
				});
				continue;
			}

			// 3. Проверка согласования услуги по 804н
			let isServiceApproved = true;
			if (letter.approvedServiceCodes && letter.approvedServiceCodes.length > 0) {
				const sCode = (it.serviceCode || "").trim().toUpperCase();
				isServiceApproved = letter.approvedServiceCodes.some((approved) => {
					const app = approved.trim().toUpperCase();
					return sCode === app || (sCode.length > 0 && sCode.startsWith(app));
				});
			}

			// 4. Проверка согласования зуба (FDI)
			let isToothApproved = true;
			if (letter.approvedTeethFdi && letter.approvedTeethFdi.length > 0 && it.toothNumber) {
				const tStr = String(it.toothNumber).replace(/[^0-9]/g, "");
				isToothApproved = letter.approvedTeethFdi.some((approved) => {
					const app = String(approved).replace(/[^0-9]/g, "");
					return tStr === app;
				});
			}

			if (!isServiceApproved || !isToothApproved) {
				if (isUrgentCare) {
					// Мандат 8e: несогласованный зуб/услуга при острой боли покрываются экстренно
					const candidateCoveredKop = lineTotalKop;
					totalCoveredKop += candidateCoveredKop;
					lineResults.push({
						serviceId: it.serviceId,
						serviceCode: it.serviceCode,
						serviceName: it.serviceName,
						category: it.category,
						toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
						quantity: qty,
						unitPriceRub: it.priceRub,
						discountRub: it.discountRub ?? 0,
						totalPriceRub: kopecksToRubles(lineTotalKop),
						dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
						patientCoPayRub: 0,
						unitPriceKopecks: unitPriceKop,
						discountKopecks: discountKop,
						totalPriceKopecks: lineTotalKop,
						dmsCoveredKopecks: candidateCoveredKop,
						patientCoPayKopecks: 0,
						effectiveCoveragePct: 100,
						isApprovedByLetter: true,
						isExcludedByProgram: false,
						splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
						status: "full_dms",
					});
					continue;
				}

				hasUnapproved = true;
				const reason = !isServiceApproved
					? `Услуга ${it.serviceCode || it.serviceName || ""} не входит в согласованный перечень процедур гарантийного письма № ${letter.letterNumber}`
					: `Зуб ${it.toothNumber} не согласован гарантийным письмом № ${letter.letterNumber}`;
				const coPayKop = lineTotalKop;
				totalCoPayKop += coPayKop;
				lineResults.push({
					serviceId: it.serviceId,
					serviceCode: it.serviceCode,
					serviceName: it.serviceName,
					category: it.category,
					toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
					quantity: qty,
					unitPriceRub: it.priceRub,
					discountRub: it.discountRub ?? 0,
					totalPriceRub: kopecksToRubles(lineTotalKop),
					dmsCoveredRub: 0,
					patientCoPayRub: kopecksToRubles(coPayKop),
					unitPriceKopecks: unitPriceKop,
					discountKopecks: discountKop,
					totalPriceKopecks: lineTotalKop,
					dmsCoveredKopecks: 0,
					patientCoPayKopecks: coPayKop,
					effectiveCoveragePct: 0,
					isApprovedByLetter: false,
					isExcludedByProgram: false,
					splitReason: reason,
					status: "patient_full",
				});
				continue;
			}
		} else if (isUrgentCare && !options.contract) {
			// Случай: гарантийного письма нет, но приём экстренный (острая боль)
			const candidateCoveredKop = lineTotalKop;
			totalCoveredKop += candidateCoveredKop;
			lineResults.push({
				serviceId: it.serviceId,
				serviceCode: it.serviceCode,
				serviceName: it.serviceName,
				category: it.category,
				toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
				quantity: qty,
				unitPriceRub: it.priceRub,
				discountRub: it.discountRub ?? 0,
				totalPriceRub: kopecksToRubles(lineTotalKop),
				dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
				patientCoPayRub: 0,
				unitPriceKopecks: unitPriceKop,
				discountKopecks: discountKop,
				totalPriceKopecks: lineTotalKop,
				dmsCoveredKopecks: candidateCoveredKop,
				patientCoPayKopecks: 0,
				effectiveCoveragePct: 100,
				isApprovedByLetter: true,
				isExcludedByProgram: false,
				splitReason: "Экстренная помощь (острая боль). Требуется досылка гарантийного письма ДМС",
				status: "full_dms",
			});
			continue;
		}

		// 5. Расчет базового процента покрытия
		let pct = 100;
		if (options.contract) {
			switch (it.category) {
				case "therapy":
					pct = Number(options.contract.coverageTherapyPct) || 0;
					break;
				case "surgery":
					pct = Number(options.contract.coverageSurgeryPct) || 0;
					break;
				case "orthodontics":
				case "prosthetics":
					pct = Number(options.contract.coverageOrthoPct) || 0;
					break;
				case "hygiene":
				case "periodontology":
					pct = Number(options.contract.coverageHygienePct) || 0;
					break;
				case "consultation":
				case "imaging":
					pct = 100;
					break;
				case "documents":
				case "other":
				default:
					pct = 0;
					break;
			}
			pct = Math.min(100, Math.max(0, pct));
		}

		// 6. Франшиза гарантийного письма через канонический dmsFranchiseEngine
		let franchiseDeductionKop = 0;
		if (letter) {
			const franchisePctVal = typeof (letter as Record<string, unknown>).defaultFranchisePercent === "number"
				? Number((letter as Record<string, unknown>).defaultFranchisePercent)
				: (letter.franchisePct || 0);
			if ((letter.franchiseType === "percent" || !letter.franchiseType || letter.franchiseType === "none") && franchisePctVal > 0) {
				const clampedPct = Math.min(100, Math.max(0, franchisePctVal));
				const splitItem = calculateItemDmsSplit(lineTotalKop, clampedPct, true);
				franchiseDeductionKop = splitItem.patientKopecks;
			} else if (letter.franchiseType === "fixed_rub" && (letter.franchiseFixedRub ?? 0) > 0) {
				const fixedKop = rublesToKopecks(letter.franchiseFixedRub ?? 0);
				franchiseDeductionKop = Math.min(lineTotalKop, fixedKop);
			}
		}

		let candidateCoveredKop = Math.max(
			0,
			Math.round((lineTotalKop * pct) / 100) - franchiseDeductionKop,
		);

		// 7. Ограничение лимитом письма
		let splitReason = isPendingCurator
			? "Согласование куратором ДМС (отложенная проводка бэк-офиса)"
			: "100% покрытие по условиям программы ДМС";
		let status: "full_dms" | "co_payment" | "patient_full" = "full_dms";

		if (remainingLetterKop != null) {
			if (candidateCoveredKop <= remainingLetterKop) {
				remainingLetterKop -= candidateCoveredKop;
				if (franchiseDeductionKop > 0 || pct < 100) {
					status = "co_payment";
					splitReason = franchiseDeductionKop > 0
						? `Сооплата франшизы (${kopecksToRubles(franchiseDeductionKop)} ₽)`
						: `Частичное покрытие по тарифу (${pct}%)`;
				}
			} else if (remainingLetterKop > 0) {
				const excessKop = candidateCoveredKop - remainingLetterKop;
				if (isUrgentCare) {
					// При острой боли остаток ГП используется, а превышение покрывается экстренно
					candidateCoveredKop = candidateCoveredKop;
					remainingLetterKop = 0;
					status = "full_dms";
					splitReason = `Экстренная помощь (острая боль) сверх лимита на ${kopecksToRubles(excessKop)} ₽. Требуется досылка гарантийного письма ДМС`;
				} else {
					candidateCoveredKop = remainingLetterKop;
					remainingLetterKop = 0;
					status = "co_payment";
					splitReason = `Превышен остаток лимита ГП на ${kopecksToRubles(excessKop)} ₽ (доплата пациентом)`;
				}
			} else {
				if (isUrgentCare) {
					// При острой боли исчерпание лимита не блокирует экстренную помощь
					candidateCoveredKop = Math.round((lineTotalKop * pct) / 100);
					status = "full_dms";
					splitReason = "Экстренная помощь (острая боль) при исчерпанном лимите ГП. Требуется досылка гарантийного письма ДМС";
				} else {
					candidateCoveredKop = 0;
					status = "patient_full";
					splitReason = "Лимит гарантийного письма полностью исчерпан";
				}
			}
		} else if (franchiseDeductionKop > 0 || pct < 100) {
			status = "co_payment";
			splitReason = franchiseDeductionKop > 0
				? `Сооплата франшизы (${kopecksToRubles(franchiseDeductionKop)} ₽)`
				: `Частичное покрытие по тарифу (${pct}%)`;
		}

		if (isPendingCurator && !splitReason.includes("отложенная проводка")) {
			splitReason = `${splitReason} (отложенная проводка бэк-офиса)`;
		}

		const itemCoPayKop = lineTotalKop - candidateCoveredKop;
		totalCoveredKop += candidateCoveredKop;
		totalCoPayKop += itemCoPayKop;

		const effPct = lineTotalKop > 0 ? Math.round((candidateCoveredKop / lineTotalKop) * 100) : 0;

		lineResults.push({
			serviceId: it.serviceId,
			serviceCode: it.serviceCode,
			serviceName: it.serviceName,
			category: it.category,
			toothNumber: it.toothNumber !== undefined ? String(it.toothNumber) : undefined,
			quantity: qty,
			unitPriceRub: it.priceRub,
			discountRub: it.discountRub ?? 0,
			totalPriceRub: kopecksToRubles(lineTotalKop),
			dmsCoveredRub: kopecksToRubles(candidateCoveredKop),
			patientCoPayRub: kopecksToRubles(itemCoPayKop),
			unitPriceKopecks: unitPriceKop,
			discountKopecks: discountKop,
			totalPriceKopecks: lineTotalKop,
			dmsCoveredKopecks: candidateCoveredKop,
			patientCoPayKopecks: itemCoPayKop,
			effectiveCoveragePct: effPct,
			isApprovedByLetter: true,
			isExcludedByProgram: false,
			splitReason,
			status,
		});
	}

	const integrityInvariantHolds = totalCoveredKop + totalCoPayKop === totalBillKop;

	let warningMessage: string | undefined = undefined;
	if (isUrgentCare || !letter || hasUnapproved || isExpired || (remainingLetterKop !== null && remainingLetterKop === 0)) {
		warningMessage = "Требуется досылка гарантийного письма ДМС";
	} else if (isPendingCurator) {
		warningMessage = "Ожидается ответ куратора ДМС (отложенная проводка бэк-офиса)";
	}

	return {
		totalBillRub: kopecksToRubles(totalBillKop),
		totalDmsCoveredRub: kopecksToRubles(totalCoveredKop),
		totalPatientCoPayRub: kopecksToRubles(totalCoPayKop),
		letterApprovedLimitRub: maxCoverageRub ?? null,
		letterUsedAmountRub: usedAmountRub,
		letterRemainingLimitRub: remainingLetterKop != null ? kopecksToRubles(remainingLetterKop) : null,
		totalBillKopecks: totalBillKop,
		totalDmsCoveredKopecks: totalCoveredKop,
		totalPatientCoPayKopecks: totalCoPayKop,
		letterApprovedLimitKopecks: letterMaxKop,
		letterUsedAmountKopecks: letterUsedKop,
		letterRemainingLimitKopecks: remainingLetterKop,
		hasUnapprovedServices: hasUnapproved,
		hasExcludedServices: hasExcluded,
		integrityInvariantHolds,
		warningMessage,
		isEmergency: isUrgentCare,
		lineItems: lineResults,
	};
}

/**
 * Billable line item for DMS invoice splitting and co-payment calculation.
 */
export interface DmsBillableItem {
	readonly id?: string | undefined;
	readonly serviceCode?: string | undefined;
	readonly serviceCode804n?: string | undefined;
	readonly serviceName?: string | undefined;
	readonly toothNumber?: string | number | undefined;
	readonly quantity?: number | undefined;
	readonly unitPriceKopecks?: number | undefined;
	readonly unitPriceRub?: number | undefined;
	readonly discountPercent?: number | undefined;
	readonly isExcluded?: boolean | undefined;
}

export interface DmsCoPaymentGuaranteeLetterInput {
	readonly maxApprovedAmountKopecks?: number | undefined;
	readonly maxCoverageKopecks?: number | undefined;
	readonly limitKopecks?: number | undefined;
	readonly maxCoverageRub?: number | undefined;
	readonly usedKopecks?: number | undefined;
	readonly usedAmountKopecks?: number | undefined;
	readonly usedAmountRub?: number | undefined;
	readonly remainingLimitKopecks?: number | undefined;
	readonly defaultFranchisePercent?: number | undefined;
	readonly franchisePct?: number | undefined;
	readonly franchisePercent?: number | undefined;
}

/**
 * Method used by patient to pay their co-payment portion at the clinic cash desk.
 */
export type PatientPaymentMethod = "cash" | "card" | "advance" | "mixed";

/**
 * Formats integer kopecks to Russian currency string with rubles ("1 500 ₽").
 */
export function formatCurrencyKopecks(kopecks: number | null | undefined): string {
	return formatKopecksToRub(kopecks);
}

export interface DmsCoPaymentSplitItemResult {
	readonly lineItemId: string;
	readonly id: string;
	readonly serviceCode: string;
	readonly serviceCode804n: string;
	readonly serviceName: string;
	readonly toothNumber?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly totalKopecks: number;
	readonly insuranceCoveredKopecks: number;
	readonly coveredByDmsKopecks: number;
	readonly patientOutOfPocketKopecks: number;
	readonly patientTotalKopecks: number;
	readonly insuranceCoveredRubles: number;
	readonly patientOutOfPocketRubles: number;
	readonly status: "full_dms" | "co_payment" | "patient_full";
	readonly splitReason: string;
	readonly isApprovedByLetter: boolean;
	readonly isExcludedByPolicy: boolean;
	readonly franchiseDeductionKopecks: number;
	readonly copayKopecks: number;
}

export interface DmsCoPaymentSplitResult {
	readonly totalBillKopecks: number;
	readonly dmsCoveredKopecks: number;
	readonly patientCoPayKopecks: number;
	readonly lineItems: readonly DmsCoPaymentSplitItemResult[];
	readonly isFullyCovered: boolean;
	readonly hasExcludedServices: boolean;
	readonly remainingLetterLimitKopecks: number | null;
	readonly remainingLimitKopecks: number;

	// Backward compatibility aliases (deprecated)
	/** @deprecated Use lineItems */
	readonly splitResults?: readonly DmsCoPaymentSplitItemResult[] | undefined;
	/** @deprecated Use lineItems */
	readonly items?: readonly DmsCoPaymentSplitItemResult[] | undefined;
	/** @deprecated Use lineItems */
	readonly lines?: readonly DmsCoPaymentSplitItemResult[] | undefined;
	/** @deprecated Use totalBillKopecks */
	readonly totalKopecks?: number | undefined;
	/** @deprecated Use totalBillKopecks */
	readonly totalAmountKopecks?: number | undefined;
	/** @deprecated Use dmsCoveredKopecks */
	readonly insuranceCoveredKopecks?: number | undefined;
	/** @deprecated Use dmsCoveredKopecks */
	readonly totalCoveredByDmsKopecks?: number | undefined;
	/** @deprecated Use dmsCoveredKopecks */
	readonly totalInsuranceCoveredKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly patientOutOfPocketKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly totalPatientOutOfPocketKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly totalPatientCoPayKopecks?: number | undefined;
	/** @deprecated Use patientCoPayKopecks */
	readonly patientTotalKopecks?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly totalBillRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly insuranceCoveredRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly totalInsuranceCoveredRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly patientOutOfPocketRubles?: number | undefined;
	/** @deprecated Format via formatKopecksToRub */
	readonly totalPatientOutOfPocketRubles?: number | undefined;
}

