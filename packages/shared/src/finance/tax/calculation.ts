/**
 * DENTE Dental CRM — Tax Deduction Engine (Pure Calculations & Amount Formats)
 * Exact kopeck arithmetic, multi-year aggregation, refund netting, BigInt splits,
 * and Russian amount in words declension.
 */

import { ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024, ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024 } from "./constants.js";
import type {
	ExactTaxSplitKopecks,
	PlanServiceItemForTax,
	PlanTaxDeductionCalculation,
	PlanTaxItemDeduction,
	StagedPaymentScheduleBreakdown,
	TaxDeductionCalculationResult,
	TaxDeductionPaymentItem,
	TaxDeductionYearSummary,
} from "./types.js";
import { resolveTaxDeductionCategoryShared } from "./classification.js";
import { kopecksToRub, rubToKopecks } from "../../fiscal/kopecksArithmetic.js";

/**
 * Safely extracts the tax calendar year from an ISO date string (YYYY-MM-DD...)
 * completely immune to local server timezone shift bugs.
 */
export function extractTaxYearFromDate(dateIso: string): number {
	if (!dateIso || typeof dateIso !== "string") {
		return Number.NaN;
	}
	const trimmed = dateIso.trim();
	const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (match) {
		return Number.parseInt(match[1]!, 10);
	}
	const d = new Date(trimmed);
	return Number.isNaN(d.getTime()) ? Number.NaN : d.getFullYear();
}

/**
 * Checks whether a payment item represents a refund or returned funds.
 */
export function isTaxDeductionRefund(
	p: Partial<TaxDeductionPaymentItem> & {
		isRefund?: boolean | undefined;
		operationType?: string | undefined;
		isReturn?: boolean | undefined;
		status?: string | undefined;
	}
): boolean {
	if (p.isRefund === true) return true;
	if (p.isReturn === true) return true;
	if (p.operationType === "refund" || p.operationType === "return") return true;
	if (p.status === "refunded" || p.status === "returned") return true;
	if (typeof p.amountRub === "number" && p.amountRub < 0) return true;
	if (typeof p.amountKopecks === "number" && p.amountKopecks < 0) return true;
	const sName = (p.serviceName || "").toLowerCase();
	if (sName.startsWith("возврат") || sName.includes("возврат средств")) return true;
	return false;
}

/**
 * Extracts absolute integer kopecks from a payment item.
 */
export function getTaxDeductionAbsKopecks(p: TaxDeductionPaymentItem): number {
	if (typeof p.amountKopecks === "number" && Number.isFinite(p.amountKopecks)) {
		return Math.abs(Math.round(p.amountKopecks));
	}
	if (typeof p.amountRub === "number" && Number.isFinite(p.amountRub)) {
		return Math.abs(Math.round(p.amountRub * 100));
	}
	return 0;
}

/**
 * Normalizes payment items for a specific tax year by subtracting refunds from
 * corresponding Code 1 or Code 2 categories so that reported sums reflect strictly Net Paid amounts.
 */
export function normalizePaymentsForTaxCertificate(
	payments: readonly TaxDeductionPaymentItem[],
	targetYear: number
): TaxDeductionPaymentItem[] {
	// Filter strictly for the target calendar year (01.01 - 31.12) with timezone immunity
	const yearPayments = payments.filter((p) => {
		const year = extractTaxYearFromDate(p.dateIso);
		return year === targetYear;
	});

	// Partition by relationship so family member refunds don't cross-contaminate
	const partitionMap = new Map<string, TaxDeductionPaymentItem[]>();
	for (const p of yearPayments) {
		const rel = p.payerRelationship || "patient";
		const list = partitionMap.get(rel) || [];
		list.push(p);
		partitionMap.set(rel, list);
	}

	const result: TaxDeductionPaymentItem[] = [];

	for (const [, items] of partitionMap.entries()) {
		let code01RefundKop = 0;
		let code02RefundKop = 0;
		const positiveItems: TaxDeductionPaymentItem[] = [];

		for (const p of items) {
			const cat = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
			const absKop = getTaxDeductionAbsKopecks(p);
			if (isTaxDeductionRefund(p)) {
				if (cat === "2") {
					code02RefundKop += absKop;
				} else {
					code01RefundKop += absKop;
				}
			} else if (absKop > 0) {
				positiveItems.push(p);
			}
		}

		if (code01RefundKop === 0 && code02RefundKop === 0) {
			result.push(...positiveItems);
			continue;
		}

		let remainingRefund01 = code01RefundKop;
		let remainingRefund02 = code02RefundKop;

		for (const item of positiveItems) {
			const cat = item.taxCode || resolveTaxDeductionCategoryShared(item.code804n, item.serviceName);
			const itemKop = getTaxDeductionAbsKopecks(item);

			if (cat === "2") {
				if (remainingRefund02 >= itemKop) {
					remainingRefund02 -= itemKop;
					continue;
				}
				const netKop = itemKop - remainingRefund02;
				remainingRefund02 = 0;
				result.push({
					...item,
					amountKopecks: netKop,
					amountRub: kopecksToRub(netKop),
				});
			} else {
				if (remainingRefund01 >= itemKop) {
					remainingRefund01 -= itemKop;
					continue;
				}
				const netKop = itemKop - remainingRefund01;
				remainingRefund01 = 0;
				result.push({
					...item,
					amountKopecks: netKop,
					amountRub: kopecksToRub(netKop),
				});
			}
		}
	}

	return result;
}

/**
 * Расчет сумм по годам и категориям вычета (Код 01 / Код 02) с копеечной точностью и чистым учетом возвратов (Net Paid).
 */
export function calculateTaxDeductionSummary(
	payments: readonly TaxDeductionPaymentItem[]
): TaxDeductionCalculationResult {
	const yearMap = new Map<
		number,
		{
			code01PosKop: number;
			code01RefKop: number;
			code02PosKop: number;
			code02RefKop: number;
			receiptsCount: number;
		}
	>();

	for (const p of payments) {
		const year = extractTaxYearFromDate(p.dateIso);
		if (Number.isNaN(year)) continue;
		const cat = p.taxCode || resolveTaxDeductionCategoryShared(p.code804n, p.serviceName);
		const absKop = getTaxDeductionAbsKopecks(p);
		const isRefund = isTaxDeductionRefund(p);

		const current = yearMap.get(year) || {
			code01PosKop: 0,
			code01RefKop: 0,
			code02PosKop: 0,
			code02RefKop: 0,
			receiptsCount: 0,
		};

		if (isRefund) {
			if (cat === "2") {
				current.code02RefKop += absKop;
			} else {
				current.code01RefKop += absKop;
			}
		} else {
			if (cat === "2") {
				current.code02PosKop += absKop;
			} else {
				current.code01PosKop += absKop;
			}
			current.receiptsCount += 1;
		}
		yearMap.set(year, current);
	}

	const yearsSummary: TaxDeductionYearSummary[] = Array.from(yearMap.entries())
		.sort(([yA], [yB]) => yB - yA)
		.map(([taxYear, data]) => {
			const netCode01Kop = Math.max(0, data.code01PosKop - data.code01RefKop);
			const netCode02Kop = Math.max(0, data.code02PosKop - data.code02RefKop);
			const code01Rub = kopecksToRub(netCode01Kop);
			const code02Rub = kopecksToRub(netCode02Kop);
			const totalKopecks = netCode01Kop + netCode02Kop;
			const totalRub = kopecksToRub(totalKopecks);

			// Лимит социального вычета: 150 000 ₽ с 2024 года, 120 000 ₽ до 2024 года
			const statutoryLimitRub = taxYear >= 2024 ? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024 : ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;
			const statutoryLimitKopecks = statutoryLimitRub * 100;
			const code01EligibleKopecks = Math.min(netCode01Kop, statutoryLimitKopecks);
			const code01EligibleRub = kopecksToRub(code01EligibleKopecks);

			// Расчетный возврат 13% и 15% в целых копейках (по Коду 01 с лимитом, по Коду 02 без ограничений)
			const refund13EstimateKopecks = Math.round((code01EligibleKopecks * 13) / 100) + Math.round((netCode02Kop * 13) / 100);
			const refund15EstimateKopecks = Math.round((code01EligibleKopecks * 15) / 100) + Math.round((netCode02Kop * 15) / 100);
			const refund13EstimateRub = kopecksToRub(refund13EstimateKopecks);
			const refund15EstimateRub = kopecksToRub(refund15EstimateKopecks);

			return {
				taxYear,
				code01Rub,
				code01Kopecks: netCode01Kop,
				code02Rub,
				code02Kopecks: netCode02Kop,
				totalRub,
				totalKopecks,
				receiptsCount: data.receiptsCount,
				code01StatutoryLimitRub: statutoryLimitRub,
				code01StatutoryLimitKopecks: statutoryLimitKopecks,
				code01EligibleRub: code01EligibleRub,
				code01EligibleKopecks: code01EligibleKopecks,
				refund13EstimateRub: refund13EstimateRub,
				refund13EstimateKopecks: refund13EstimateKopecks,
				refund15EstimateRub: refund15EstimateRub,
				refund15EstimateKopecks: refund15EstimateKopecks,
			};
		});

	let grandTotalCode01Kopecks = 0;
	let grandTotalCode02Kopecks = 0;
	let grandTotalRefund13Kopecks = 0;
	let grandTotalRefund15Kopecks = 0;
	let totalReceiptsCount = 0;

	for (const y of yearsSummary) {
		grandTotalCode01Kopecks += y.code01Kopecks;
		grandTotalCode02Kopecks += y.code02Kopecks;
		grandTotalRefund13Kopecks += y.refund13EstimateKopecks;
		grandTotalRefund15Kopecks += y.refund15EstimateKopecks;
		totalReceiptsCount += y.receiptsCount;
	}

	const grandTotalKopecks = grandTotalCode01Kopecks + grandTotalCode02Kopecks;

	return {
		yearsSummary,
		grandTotalCode01Rub: kopecksToRub(grandTotalCode01Kopecks),
		grandTotalCode01Kopecks,
		grandTotalCode02Rub: kopecksToRub(grandTotalCode02Kopecks),
		grandTotalCode02Kopecks,
		grandTotalRub: kopecksToRub(grandTotalKopecks),
		grandTotalKopecks,
		grandTotalRefund13Rub: kopecksToRub(grandTotalRefund13Kopecks),
		grandTotalRefund13Kopecks,
		grandTotalRefund15Rub: kopecksToRub(grandTotalRefund15Kopecks),
		grandTotalRefund15Kopecks,
		totalReceiptsCount,
		totalAmountInWordsRu: amountToWordsRu(grandTotalKopecks),
	};
}

/**
 * Перевод суммы в копейках в официальную сумму прописью на русском языке.
 * Пример: 15432050 -> "Сто пятьдесят четыре тысячи триста двадцать рублей 50 копеек"
 */
export function amountToWordsRu(kopecks: number): string {
	if (kopecks <= 0 || !Number.isFinite(kopecks)) return "Ноль рублей 00 копеек";

	const rub = Math.floor(kopecks / 100);
	const kop = Math.abs(kopecks % 100);

	const unitsM = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const unitsF = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teens = [
		"десять",
		"одиннадцать",
		"двенадцать",
		"тринадцать",
		"четырнадцать",
		"пятнадцать",
		"шестнадцать",
		"семнадцать",
		"восемнадцать",
		"девятнадцать",
	];
	const tens = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
	const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

	function tripletToWords(n: number, isFemale: boolean): string {
		const h = Math.floor(n / 100);
		const rem = n % 100;
		const t = Math.floor(rem / 10);
		const u = rem % 10;

		const parts: string[] = [];
		if (h > 0) parts.push(hundreds[h]!);

		if (rem >= 10 && rem <= 19) {
			parts.push(teens[rem - 10]!);
		} else {
			if (t > 0) parts.push(tens[t]!);
			if (u > 0) parts.push(isFemale ? unitsF[u]! : unitsM[u]!);
		}

		return parts.join(" ");
	}

	function getDeclension(n: number, form1: string, form2: string, form5: string): string {
		const rem100 = Math.abs(n) % 100;
		const rem10 = rem100 % 10;
		if (rem100 >= 11 && rem100 <= 19) return form5;
		if (rem10 === 1) return form1;
		if (rem10 >= 2 && rem10 <= 4) return form2;
		return form5;
	}

	const parts: string[] = [];

	// Миллионы
	const millions = Math.floor(rub / 1000000);
	if (millions > 0) {
		const mStr = tripletToWords(millions, false);
		const decl = getDeclension(millions, "миллион", "миллиона", "миллионов");
		parts.push(`${mStr} ${decl}`);
	}

	// Тысячи
	const thousands = Math.floor((rub % 1000000) / 1000);
	if (thousands > 0) {
		const thStr = tripletToWords(thousands, true);
		const decl = getDeclension(thousands, "тысяча", "тысячи", "тысяч");
		parts.push(`${thStr} ${decl}`);
	}

	// Единицы рублей
	const unitsRub = rub % 1000;
	if (unitsRub > 0) {
		const uStr = tripletToWords(unitsRub, false);
		const decl = getDeclension(unitsRub, "рубль", "рубля", "рублей");
		parts.push(`${uStr} ${decl}`);
	} else if (parts.length === 0) {
		parts.push("ноль рублей");
	} else {
		const decl = getDeclension(rub, "рубль", "рубля", "рублей");
		parts.push(decl);
	}

	const rubText = parts.join(" ").trim();
	const capitalizedRub = rubText.charAt(0).toUpperCase() + rubText.slice(1);
	const kopStr = kop.toString().padStart(2, "0");
	const kopDecl = getDeclension(kop, "копейка", "копейки", "копеек");

	return `${capitalizedRub} ${kopStr} ${kopDecl}`;
}

/**
 * BigInt-safe ruble to kopecks converter.
 */
export function rubToKopecksBigInt(rub: number | string): bigint {
	const numeric = typeof rub === "string" ? Number.parseFloat(rub) : rub;
	if (!Number.isFinite(numeric)) {
		return 0n;
	}
	return BigInt(Math.round(numeric * 100));
}

/**
 * BigInt-safe kopecks to rubles converter.
 */
export function kopecksBigIntToRub(kopecks: bigint): number {
	return Number(kopecks) / 100;
}

/**
 * Computes exact tax deduction split for a single tax year strictly using BigInt kopecks.
 */
export function calculateExactTaxSplitKopecks(
	payments: readonly TaxDeductionPaymentItem[],
	targetYear: number,
	customLimitRub?: number,
): ExactTaxSplitKopecks {
	const summary = calculateTaxDeductionSummary(payments);
	const targetYearSummary = summary.yearsSummary.find((y) => y.taxYear === targetYear);
	const code01Kop = BigInt(targetYearSummary?.code01Kopecks ?? 0);
	const code02Kop = BigInt(targetYearSummary?.code02Kopecks ?? 0);
	const receiptsCount = targetYearSummary?.receiptsCount ?? 0;

	const statutoryLimitRub =
		customLimitRub !== undefined && customLimitRub > 0
			? customLimitRub
			: targetYear >= 2024
				? ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024
				: ANNUAL_TAX_DEDUCTION_LIMIT_RUB_PRE2024;

	const limitKop = BigInt(Math.round(statutoryLimitRub * 100));
	const isCode01Capped = code01Kop > limitKop;
	const code01EligibleKop = isCode01Capped ? limitKop : code01Kop;

	const code01Refund13Kop = (code01EligibleKop * 13n + 50n) / 100n;
	const code02Refund13Kop = (code02Kop * 13n + 50n) / 100n;
	const refund13Kop = code01Refund13Kop + code02Refund13Kop;

	const code01Refund15Kop = (code01EligibleKop * 15n + 50n) / 100n;
	const code02Refund15Kop = (code02Kop * 15n + 50n) / 100n;
	const refund15Kop = code01Refund15Kop + code02Refund15Kop;

	const totalKop = code01Kop + code02Kop;

	return {
		code01Kopecks: code01Kop,
		code01Rub: Number(code01Kop) / 100,
		code02Kopecks: code02Kop,
		code02Rub: Number(code02Kop) / 100,
		totalKopecks: totalKop,
		totalRub: Number(totalKop) / 100,
		code01StatutoryLimitKopecks: limitKop,
		code01StatutoryLimitRub: statutoryLimitRub,
		code01EligibleKopecks: code01EligibleKop,
		code01EligibleRub: Number(code01EligibleKop) / 100,
		code01Refund13Kopecks: code01Refund13Kop,
		code01Refund13Rub: Number(code01Refund13Kop) / 100,
		code02Refund13Kopecks: code02Refund13Kop,
		code02Refund13Rub: Number(code02Refund13Kop) / 100,
		refund13Kopecks: refund13Kop,
		refund13Rub: Number(refund13Kop) / 100,
		refund15Kopecks: refund15Kop,
		refund15Rub: Number(refund15Kop) / 100,
		isCode01Capped,
		receiptsCount,
	};
}

/**
 * Точный расчет возврата 13% НДФЛ по плану лечения с разделением на Код 01 (до 150 000 ₽) и Код 02 (дорогостоящее без лимита).
 */
export function calculatePlanTaxDeductionBreakdown(
	items: readonly PlanServiceItemForTax[],
	statutoryLimitRub: number = ANNUAL_TAX_DEDUCTION_LIMIT_RUB_2024,
): PlanTaxDeductionCalculation {
	let code01TotalKopecks = 0;
	let code02TotalKopecks = 0;

	const mappedItems: PlanTaxItemDeduction[] = items.map((item) => {
		const rawName = item.serviceName || item.name || "Медицинская услуга";
		const catCode = item.taxCode || resolveTaxDeductionCategoryShared(item.code804n, rawName);
		const isExp = catCode === "2";

		const qty = typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
		const unitKopecks =
			typeof item.priceKopecks === "number" && Number.isFinite(item.priceKopecks)
				? Math.max(0, Math.round(item.priceKopecks))
				: typeof item.priceRub === "number" && Number.isFinite(item.priceRub)
					? Math.max(0, rubToKopecks(item.priceRub))
					: 0;

		const lineTotalKopecks = unitKopecks * qty;
		const lineTotalRub = kopecksToRub(lineTotalKopecks);

		if (isExp) {
			code02TotalKopecks += lineTotalKopecks;
		} else {
			code01TotalKopecks += lineTotalKopecks;
		}

		const itemRefund13Kopecks = Math.round((lineTotalKopecks * 13) / 100);

		return {
			id: item.id,
			code804n: item.code804n,
			serviceName: rawName,
			categoryCode: catCode,
			isExpensive: isExp,
			totalRub: lineTotalRub,
			totalKopecks: lineTotalKopecks,
			eligibleRub: lineTotalRub,
			eligibleKopecks: lineTotalKopecks,
			refund13Rub: kopecksToRub(itemRefund13Kopecks),
			refund13Kopecks: itemRefund13Kopecks,
		};
	});

	const limitKopecks = Math.max(0, Math.round(statutoryLimitRub * 100));
	const code01EligibleKopecks = Math.min(code01TotalKopecks, limitKopecks);
	const isCode01Capped = code01TotalKopecks > limitKopecks;
	const code01Refund13Kopecks = Math.round((code01EligibleKopecks * 13) / 100);

	const code02EligibleKopecks = code02TotalKopecks;
	const code02Refund13Kopecks = Math.round((code02EligibleKopecks * 13) / 100);

	const grandTotalKopecks = code01TotalKopecks + code02TotalKopecks;
	const grandTotalRefund13Kopecks = code01Refund13Kopecks + code02Refund13Kopecks;
	const netPriceWithRefundKopecks = Math.max(0, grandTotalKopecks - grandTotalRefund13Kopecks);

	return {
		code01TotalRub: kopecksToRub(code01TotalKopecks),
		code01TotalKopecks,
		code01EligibleRub: kopecksToRub(code01EligibleKopecks),
		code01EligibleKopecks,
		code01Refund13Rub: kopecksToRub(code01Refund13Kopecks),
		code01Refund13Kopecks,
		code01StatutoryLimitRub: statutoryLimitRub,
		isCode01Capped,

		code02TotalRub: kopecksToRub(code02TotalKopecks),
		code02TotalKopecks,
		code02EligibleRub: kopecksToRub(code02EligibleKopecks),
		code02EligibleKopecks,
		code02Refund13Rub: kopecksToRub(code02Refund13Kopecks),
		code02Refund13Kopecks,

		grandTotalRub: kopecksToRub(grandTotalKopecks),
		grandTotalKopecks,
		grandTotalRefund13Rub: kopecksToRub(grandTotalRefund13Kopecks),
		grandTotalRefund13Kopecks,
		netPriceWithRefundRub: kopecksToRub(netPriceWithRefundKopecks),
		netPriceWithRefundKopecks,

		items: mappedItems,
		hasCode02ExpensiveServices: code02TotalKopecks > 0,
	};
}

/**
 * Расчет графика поэтапной оплаты (30% аванс/санация, 40% хирургия, 30% ортопедия) с точной балансировкой копеек.
 */
export function calculateStaged304030Schedule(
	totalRubOrKopecks: number,
	isKopecksInput = false,
): StagedPaymentScheduleBreakdown {
	const totalKopecks = Math.max(
		0,
		isKopecksInput
			? Math.round(totalRubOrKopecks || 0)
			: rubToKopecks(totalRubOrKopecks || 0),
	);

	if (totalKopecks === 0) {
		return {
			totalKopecks: 0,
			totalRub: 0,
			stage1AdvanceTherapyKopecks: 0,
			stage1AdvanceTherapyRub: 0,
			stage2SurgeryImplantKopecks: 0,
			stage2SurgeryImplantRub: 0,
			stage3OrthopedicsKopecks: 0,
			stage3OrthopedicsRub: 0,
			isBalanced: true,
			partsKopecks: [0, 0, 0],
		};
	}

	const stage1Kopecks = Math.round(totalKopecks * 0.3);
	const stage2Kopecks = Math.round(totalKopecks * 0.4);
	const stage3Kopecks = totalKopecks - stage1Kopecks - stage2Kopecks;

	return {
		totalKopecks,
		totalRub: kopecksToRub(totalKopecks),
		stage1AdvanceTherapyKopecks: stage1Kopecks,
		stage1AdvanceTherapyRub: kopecksToRub(stage1Kopecks),
		stage2SurgeryImplantKopecks: stage2Kopecks,
		stage2SurgeryImplantRub: kopecksToRub(stage2Kopecks),
		stage3OrthopedicsKopecks: stage3Kopecks,
		stage3OrthopedicsRub: kopecksToRub(stage3Kopecks),
		isBalanced: stage1Kopecks + stage2Kopecks + stage3Kopecks === totalKopecks,
		partsKopecks: [stage1Kopecks, stage2Kopecks, stage3Kopecks],
	};
}
