/**
 * m11Calculators.ts — Pure Mathematical & Kopeck-Exact Calculators for Form M-11.
 *
 * Statutory reference: Form M-11 (OKUD 0315003 / 0315006).
 * Invariants:
 * 1. Integer kopeck arithmetic (zero floating-point precision drift).
 * 2. Verbal Russian statutory currency transcription ("Сумма прописью").
 * 3. Exact Discrepancy & VAT calculations.
 */

import type { Kopecks } from "../../utils/money.js";
import { kopecksToRub } from "../../fiscal/kopecksArithmetic.js";
import type { TransferM11Item } from "./types.js";

// ─── 1. NUMBER TO WORDS CONVERTER IN RUSSIAN (СУММА ПРОПИСЬЮ) ─────────────────

const UNITS_MASC = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const UNITS_FEM = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = [
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
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = [
	"",
	"сто",
	"двести",
	"триста",
	"четыреста",
	"пятьсот",
	"шестьсот",
	"семьсот",
	"восемьсот",
	"девятьсот",
];

function plural(n: number, one: string, two: string, five: string): string {
	const num = Math.abs(n) % 100;
	const n1 = num % 10;
	if (num > 10 && num < 20) return five;
	if (n1 > 1 && n1 < 5) return two;
	if (n1 === 1) return one;
	return five;
}

function tripletToWords(num: number, isFem = false): string {
	const h = Math.floor(num / 100);
	const t = Math.floor((num % 100) / 10);
	const u = num % 10;
	const words: string[] = [];

	if (h > 0) words.push(HUNDREDS[h]!);
	if (t === 1) {
		words.push(TEENS[u]!);
	} else {
		if (t > 1) words.push(TENS[t]!);
		if (u > 0) words.push(isFem ? UNITS_FEM[u]! : UNITS_MASC[u]!);
	}
	return words.join(" ");
}

/**
 * Formats monetary amount in kopecks to Russian statutory verbal string ("Сумма прописью").
 * Example: 1542050 kop -> "Пятнадцать тысяч четыреста двадцать рублей 50 копеек"
 */
export function numberToWordsRuKopecks(kopecks: Kopecks): string {
	if (!Number.isFinite(kopecks) || kopecks === 0) {
		return "Ноль рублей 00 копеек";
	}

	const isNegative = kopecks < 0;
	const absKopecks = Math.abs(kopecks);
	const rubles = Math.floor(absKopecks / 100);
	const kopRemainder = absKopecks % 100;
	const kopStr = String(kopRemainder).padStart(2, "0");

	if (rubles === 0) {
		return `${isNegative ? "Минус " : ""}ноль рублей ${kopStr} ${plural(kopRemainder, "копейка", "копейки", "копеек")}`;
	}

	const billions = Math.floor(rubles / 1_000_000_000);
	const millions = Math.floor((rubles % 1_000_000_000) / 1_000_000);
	const thousands = Math.floor((rubles % 1_000_000) / 1_000);
	const ones = rubles % 1_000;

	const parts: string[] = [];

	if (billions > 0) {
		parts.push(tripletToWords(billions, false));
		parts.push(plural(billions, "миллиард", "миллиарда", "миллиардов"));
	}
	if (millions > 0) {
		parts.push(tripletToWords(millions, false));
		parts.push(plural(millions, "миллион", "миллиона", "миллионов"));
	}
	if (thousands > 0) {
		parts.push(tripletToWords(thousands, true));
		parts.push(plural(thousands, "тысяча", "тысячи", "тысяч"));
	}
	if (ones > 0) {
		parts.push(tripletToWords(ones, false));
	}

	const rubleNoun = plural(rubles, "рубль", "рубля", "рублей");
	const wordsText = parts.filter(Boolean).join(" ");
	const capitalized = wordsText.charAt(0).toUpperCase() + wordsText.slice(1);

	return `${isNegative ? "Минус " : ""}${capitalized} ${rubleNoun} ${kopStr} ${plural(kopRemainder, "копейка", "копейки", "копеек")}`;
}

// ─── 2. KOPECK-EXACT ITEM & AGGREGATE CALCULATORS ───────────────────────────────

/**
 * Calculates dispatched cost in integer kopecks.
 */
export function calculateM11ItemDispatchedCost(quantityDispatched: number, unitCostKopecks: Kopecks): Kopecks {
	if (quantityDispatched <= 0 || unitCostKopecks <= 0) return 0;
	return Math.round(quantityDispatched * unitCostKopecks);
}

/**
 * Calculates accepted cost in integer kopecks.
 */
export function calculateM11ItemAcceptedCost(quantityAccepted: number, unitCostKopecks: Kopecks): Kopecks {
	if (quantityAccepted <= 0 || unitCostKopecks <= 0) return 0;
	return Math.round(quantityAccepted * unitCostKopecks);
}

/**
 * Computes discrepancy quantity and cost for a single item.
 */
export function calculateM11ItemDiscrepancy(
	quantityAccepted: number,
	quantityDispatched: number,
	unitCostKopecks: Kopecks,
): { discrepancyQuantity: number; discrepancyCostKopecks: Kopecks } {
	const discrepancyQuantity = quantityAccepted - quantityDispatched;
	const discrepancyCostKopecks = Math.round(discrepancyQuantity * unitCostKopecks);
	return { discrepancyQuantity, discrepancyCostKopecks };
}

/**
 * Aggregates all totals for M-11 document items without floating point inaccuracies.
 */
export function aggregateM11DocumentTotals(items: TransferM11Item[]): {
	totalItemsCount: number;
	totalQuantityRequested: number;
	totalQuantityDispatched: number;
	totalQuantityAccepted: number;
	totalCostDispatchedKopecks: Kopecks;
	totalCostAcceptedKopecks: Kopecks;
	totalDiscrepancyCostKopecks: Kopecks;
	hasDiscrepancies: boolean;
} {
	let totalQtyReq = 0;
	let totalQtyDisp = 0;
	let totalQtyAcc = 0;
	let totalCostDisp = 0;
	let totalCostAcc = 0;
	let totalDiscrepancyCost = 0;
	let hasDiscrepancies = false;

	for (const item of items) {
		totalQtyReq += item.quantityRequested;
		totalQtyDisp += item.quantityDispatched;
		totalQtyAcc += item.quantityAccepted;
		totalCostDisp += item.totalCostDispatchedKopecks;
		totalCostAcc += item.totalCostAcceptedKopecks;
		totalDiscrepancyCost += item.discrepancyCostKopecks;
		if (item.discrepancyQuantity !== 0) {
			hasDiscrepancies = true;
		}
	}

	return {
		totalItemsCount: items.length,
		totalQuantityRequested: totalQtyReq,
		totalQuantityDispatched: totalQtyDisp,
		totalQuantityAccepted: totalQtyAcc,
		totalCostDispatchedKopecks: totalCostDisp,
		totalCostAcceptedKopecks: totalCostAcc,
		totalDiscrepancyCostKopecks: totalDiscrepancyCost,
		hasDiscrepancies,
	};
}

// ─── 3. STATUTORY VAT CALCULATION (НДС РАСЧЕТ) ──────────────────────────────────

export type M11VatRate = "20" | "10" | "0" | "EXEMPT";

/**
 * Calculates VAT amount from gross amount or net amount in kopecks.
 * Note: Internal warehouse transfers between branches of the same legal entity (organizationId)
 * are exempt from VAT under Art. 39 & Art. 146 Tax Code of the Russian Federation.
 * For inter-company transfers or resale, standard Russian VAT rules apply.
 */
export function calculateM11Vat(
	totalCostKopecks: Kopecks,
	vatRate: M11VatRate,
	isInclusive = true,
): { netCostKopecks: Kopecks; vatAmountKopecks: Kopecks; grossCostKopecks: Kopecks } {
	if (vatRate === "EXEMPT" || vatRate === "0" || totalCostKopecks <= 0) {
		return {
			netCostKopecks: totalCostKopecks,
			vatAmountKopecks: 0,
			grossCostKopecks: totalCostKopecks,
		};
	}

	const ratePercent = vatRate === "20" ? 20 : 10;

	if (isInclusive) {
		// Gross is given, extract VAT: VAT = Gross * (Rate / (100 + Rate))
		const vatAmountKopecks = Math.round((totalCostKopecks * ratePercent) / (100 + ratePercent));
		const netCostKopecks = totalCostKopecks - vatAmountKopecks;
		return {
			netCostKopecks,
			vatAmountKopecks,
			grossCostKopecks: totalCostKopecks,
		};
	} else {
		// Net is given, calculate VAT on top: VAT = Net * Rate / 100
		const vatAmountKopecks = Math.round((totalCostKopecks * ratePercent) / 100);
		const grossCostKopecks = totalCostKopecks + vatAmountKopecks;
		return {
			netCostKopecks: totalCostKopecks,
			vatAmountKopecks,
			grossCostKopecks,
		};
	}
}
