/**
 * DENTE Dental CRM — Statutory Currency Formatting & Ruble Financial Interfaces
 * Compacted per Mandates 8s, 8i, 8k (Russian outpatient 100% 54-FZ Ruble settlement).
 */

import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

export type SupportedCurrency = "RUB" | "USD" | "EUR" | "KZT" | "BYN" | "CNY" | "AED" | "GEL" | "AMD" | "UZS";

export interface CurrencyMetadata {
	readonly code: SupportedCurrency;
	readonly symbol: string;
	readonly nameRu: string;
	readonly nameEn: string;
	readonly nominal: number;
	readonly cbrRateRub: number;
	readonly minorUnitRatio: number;
	readonly minorUnitNameRu: string;
}

const cbr = (code: SupportedCurrency, symbol: string, nameRu: string, nameEn: string, nominal: number, cbrRateRub: number, minorUnitNameRu: string): CurrencyMetadata =>
	({ code, symbol, nameRu, nameEn, nominal, cbrRateRub, minorUnitRatio: 100, minorUnitNameRu });

export const CBR_CURRENCIES: Record<SupportedCurrency, CurrencyMetadata> = {
	RUB: cbr("RUB", "₽", "Российский рубль", "Russian Ruble", 1, 1.0, "копейка"),
	USD: cbr("USD", "$", "Доллар США", "US Dollar", 1, 91.5, "цент"),
	EUR: cbr("EUR", "€", "Евро", "Euro", 1, 99.8, "цент"),
	KZT: cbr("KZT", "₸", "Казахстанский тенге", "Kazakhstani Tenge", 100, 19.5, "тиын"),
	BYN: cbr("BYN", "Br", "Белорусский рубль", "Belarusian Ruble", 1, 28.2, "копейка"),
	CNY: cbr("CNY", "¥", "Китайский юань", "Chinese Yuan", 1, 12.8, "фынь"),
	AED: cbr("AED", "AED", "Дирхам ОАЭ", "UAE Dirham", 1, 24.9, "филс"),
	GEL: cbr("GEL", "₾", "Грузинский лари", "Georgian Lari", 1, 34.1, "тетри"),
	AMD: cbr("AMD", "֏", "Армянский драм", "Armenian Dram", 100, 23.4, "лума"),
	UZS: cbr("UZS", "so'm", "Узбекский сум", "Uzbek Som", 10000, 72.5, "тийин"),
};

export interface CurrencyConversionInput {
	readonly amountRubKopecks: number;
	readonly targetCurrency: SupportedCurrency;
	readonly customRateRub?: number | undefined;
	readonly bankSpreadPercent?: number | undefined;
}

export interface CurrencyConversionResult {
	readonly sourceRubKopecks: number;
	readonly sourceRubFormatted: string;
	readonly targetCurrency: SupportedCurrency;
	readonly targetSymbol: string;
	readonly nominal: number;
	readonly officialCbrRateRub: number;
	readonly effectiveRateRub: number;
	readonly bankSpreadPercent: number;
	readonly targetAmountMinor: number;
	readonly targetAmountDecimal: number;
	readonly targetFormatted: string;
}

export interface MedicalTourismQuoteItem {
	readonly serviceNameRu: string;
	readonly serviceNameEn: string;
	readonly code804n?: string | undefined;
	readonly quantity: number;
	readonly priceRub: number;
}

export interface MedicalTourismQuoteInput {
	readonly patientFullName: string;
	readonly countryRu: string;
	readonly countryEn: string;
	readonly targetCurrency: SupportedCurrency;
	readonly items: readonly MedicalTourismQuoteItem[];
	readonly discountRub?: number | undefined;
	readonly bankSpreadPercent?: number | undefined;
	readonly validDays?: number | undefined;
	readonly clinicNameRu?: string | undefined;
	readonly clinicNameEn?: string | undefined;
}

export interface MedicalTourismQuoteResult {
	readonly quoteNumber: string;
	readonly patientFullName: string;
	readonly dateIso: string;
	readonly validUntilIso: string;
	readonly targetCurrency: SupportedCurrency;
	readonly targetSymbol: string;
	readonly officialCbrRate: number;
	readonly effectiveRate: number;
	readonly totalGrossRub: number;
	readonly totalGrossRubKopecks: number;
	readonly discountRub: number;
	readonly totalNetRub: number;
	readonly totalNetRubKopecks: number;
	readonly totalNetForeignDecimal: number;
	readonly totalNetForeignFormatted: string;
	readonly items: readonly { readonly serviceNameRu: string; readonly serviceNameEn: string; readonly quantity: number; readonly priceRub: number; readonly totalRub: number; readonly totalForeignDecimal: number; readonly totalForeignFormatted: string }[];
	readonly recommendedPaymentChannelsRu: readonly string[];
	readonly recommendedPaymentChannelsEn: readonly string[];
}

export function formatCurrencyAmount(amount: number, currency: SupportedCurrency, isMinorUnit = false): string {
	const meta = CBR_CURRENCIES[currency] ?? CBR_CURRENCIES.RUB;
	const num = (isMinorUnit ? amount / meta.minorUnitRatio : amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
	const symMap: Record<string, string> = { RUB: `${num.replace(/,/g, " ")} ₽`, USD: `$${num}`, EUR: `€${num}`, KZT: `${num.replace(/,/g, " ")} ₸`, BYN: `${num.replace(/,/g, " ")} Br`, CNY: `¥${num}`, AED: `${num} AED`, GEL: `${num} ₾`, AMD: `${num.replace(/,/g, " ")} ֏`, UZS: `${num.replace(/,/g, " ")} so'm` };
	return symMap[currency] ?? `${num} ${currency}`;
}

export function convertRubToForeignCurrency(input: CurrencyConversionInput): CurrencyConversionResult {
	const rubKop = Math.max(0, Math.round(input.amountRubKopecks));
	const meta = CBR_CURRENCIES[input.targetCurrency] ?? CBR_CURRENCIES.RUB;
	if (meta.code === "RUB") {
		const f = formatCurrencyAmount(kopecksToRub(rubKop), "RUB");
		return { sourceRubKopecks: rubKop, sourceRubFormatted: f, targetCurrency: "RUB", targetSymbol: "₽", nominal: 1, officialCbrRateRub: 1, effectiveRateRub: 1, bankSpreadPercent: 0, targetAmountMinor: rubKop, targetAmountDecimal: kopecksToRub(rubKop), targetFormatted: f };
	}
	const spread = Math.max(0, input.bankSpreadPercent ?? 0);
	const effRate = (input.customRateRub ?? meta.cbrRateRub) * (1 + spread / 100);
	const targetMinor = Math.round(((rubKop / 100) / (effRate / meta.nominal)) * meta.minorUnitRatio);
	const targetDec = targetMinor / meta.minorUnitRatio;
	return {
		sourceRubKopecks: rubKop, sourceRubFormatted: `${kopecksToNumericString(rubKop)} ₽`,
		targetCurrency: meta.code, targetSymbol: meta.symbol, nominal: meta.nominal,
		officialCbrRateRub: meta.cbrRateRub, effectiveRateRub: Math.round(effRate * 10000) / 10000,
		bankSpreadPercent: spread, targetAmountMinor: targetMinor, targetAmountDecimal: targetDec,
		targetFormatted: formatCurrencyAmount(targetDec, meta.code, false),
	};
}

export function convertForeignCurrencyToRub(params: { foreignAmountMinor: number; currency: SupportedCurrency; customRateRub?: number; bankSpreadPercent?: number }): { rubKopecks: number; rubDecimal: number; formattedRub: string } {
	const meta = CBR_CURRENCIES[params.currency] ?? CBR_CURRENCIES.RUB;
	const minor = Math.max(0, Math.round(params.foreignAmountMinor));
	if (meta.code === "RUB") return { rubKopecks: minor, rubDecimal: kopecksToRub(minor), formattedRub: `${kopecksToNumericString(minor)} ₽` };
	const effRate = (params.customRateRub ?? meta.cbrRateRub) * (1 - Math.max(0, params.bankSpreadPercent ?? 0) / 100);
	const rubKop = Math.round((minor / meta.minorUnitRatio) * (effRate / meta.nominal) * 100);
	const rubDec = kopecksToRub(rubKop);
	return { rubKopecks: rubKop, rubDecimal: rubDec, formattedRub: formatCurrencyAmount(rubDec, "RUB", false) };
}

export function calculateMedicalTourismQuote(input: MedicalTourismQuoteInput): MedicalTourismQuoteResult {
	const now = new Date();
	const validUntil = new Date(now.getTime() + (input.validDays ?? 14) * 86400000);
	let grossKop = 0;
	for (const it of input.items) grossKop += rubToKopecks(it.priceRub || 0) * (it.quantity || 1);
	const discountKop = input.discountRub ? rubToKopecks(input.discountRub) : 0;
	const netKop = Math.max(0, grossKop - discountKop);
	const netConv = convertRubToForeignCurrency({ amountRubKopecks: netKop, targetCurrency: input.targetCurrency, bankSpreadPercent: input.bankSpreadPercent });
	const items = input.items.map((item) => {
		const lineKop = rubToKopecks(item.priceRub || 0) * (item.quantity || 1);
		const conv = convertRubToForeignCurrency({ amountRubKopecks: lineKop, targetCurrency: input.targetCurrency, bankSpreadPercent: input.bankSpreadPercent });
		return { serviceNameRu: item.serviceNameRu, serviceNameEn: item.serviceNameEn, quantity: item.quantity || 1, priceRub: item.priceRub, totalRub: kopecksToRub(lineKop), totalForeignDecimal: conv.targetAmountDecimal, totalForeignFormatted: conv.targetFormatted };
	});
	return {
		quoteNumber: `MED-TOUR-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
		patientFullName: input.patientFullName, dateIso: now.toISOString().slice(0, 10), validUntilIso: validUntil.toISOString().slice(0, 10),
		targetCurrency: input.targetCurrency, targetSymbol: netConv.targetSymbol, officialCbrRate: netConv.officialCbrRateRub, effectiveRate: netConv.effectiveRateRub,
		totalGrossRub: kopecksToRub(grossKop), totalGrossRubKopecks: grossKop, discountRub: kopecksToRub(discountKop), totalNetRub: kopecksToRub(netKop), totalNetRubKopecks: netKop,
		totalNetForeignDecimal: netConv.targetAmountDecimal, totalNetForeignFormatted: netConv.targetFormatted, items,
		recommendedPaymentChannelsRu: ["Банковская карта МИР / UnionPay (оплата на терминале клиники)", "Оплата через СБП (Система быстрых платежей / QR-код)", "Прямой банковский перевод по реквизитам клиники (RUB/CNY)", "Наличный расчет в кассе клиники (RUB)"],
		recommendedPaymentChannelsEn: ["UnionPay / Mir International Bank Cards (POS Terminal at clinic)", "Fast Payment System (SBP Dynamic QR Code)", "Direct Bank Wire Transfer (RUB / CNY invoice)", "Cash settlement in clinic cashier desk (RUB)"],
	};
}
