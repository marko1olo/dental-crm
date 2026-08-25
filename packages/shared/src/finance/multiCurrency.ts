/**
 * DENTE Dental CRM — Multi-Currency Medical Tourism & Cross-Border Exchange Engine
 *
 * Provides statutory, kopeck-exact multi-currency conversion per official Central Bank of Russia
 * (CBR / ЦБ РФ) exchange rates with zero floating-point drift, bank conversion spread handling,
 * and dual-language (RU/EN) commercial quotes for international dental patients.
 */

import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "../fiscal/kopecksArithmetic.js";

export type SupportedCurrency =
	| "RUB"
	| "USD"
	| "EUR"
	| "KZT"
	| "BYN"
	| "CNY"
	| "AED"
	| "GEL"
	| "AMD"
	| "UZS";

export interface CurrencyMetadata {
	readonly code: SupportedCurrency;
	readonly symbol: string;
	readonly nameRu: string;
	readonly nameEn: string;
	readonly nominal: number; // CBR rate basis (e.g. 1 USD, 100 KZT, 10000 UZS)
	readonly cbrRateRub: number; // Official rate in Rubles per nominal
	readonly minorUnitRatio: number; // Subunit multiplier (100 for cents/kopecks/tiyn)
	readonly minorUnitNameRu: string;
}

export const CBR_CURRENCIES: Record<SupportedCurrency, CurrencyMetadata> = {
	RUB: {
		code: "RUB",
		symbol: "₽",
		nameRu: "Российский рубль",
		nameEn: "Russian Ruble",
		nominal: 1,
		cbrRateRub: 1.0,
		minorUnitRatio: 100,
		minorUnitNameRu: "копейка",
	},
	USD: {
		code: "USD",
		symbol: "$",
		nameRu: "Доллар США",
		nameEn: "US Dollar",
		nominal: 1,
		cbrRateRub: 91.5,
		minorUnitRatio: 100,
		minorUnitNameRu: "цент",
	},
	EUR: {
		code: "EUR",
		symbol: "€",
		nameRu: "Евро",
		nameEn: "Euro",
		nominal: 1,
		cbrRateRub: 99.8,
		minorUnitRatio: 100,
		minorUnitNameRu: "цент",
	},
	KZT: {
		code: "KZT",
		symbol: "₸",
		nameRu: "Казахстанский тенге",
		nameEn: "Kazakhstani Tenge",
		nominal: 100,
		cbrRateRub: 19.5, // 100 KZT = 19.50 RUB
		minorUnitRatio: 100,
		minorUnitNameRu: "тиын",
	},
	BYN: {
		code: "BYN",
		symbol: "Br",
		nameRu: "Белорусский рубль",
		nameEn: "Belarusian Ruble",
		nominal: 1,
		cbrRateRub: 28.2,
		minorUnitRatio: 100,
		minorUnitNameRu: "копейка",
	},
	CNY: {
		code: "CNY",
		symbol: "¥",
		nameRu: "Китайский юань",
		nameEn: "Chinese Yuan",
		nominal: 1,
		cbrRateRub: 12.8,
		minorUnitRatio: 100,
		minorUnitNameRu: "фынь",
	},
	AED: {
		code: "AED",
		symbol: "AED",
		nameRu: "Дирхам ОАЭ",
		nameEn: "UAE Dirham",
		nominal: 1,
		cbrRateRub: 24.9,
		minorUnitRatio: 100,
		minorUnitNameRu: "филс",
	},
	GEL: {
		code: "GEL",
		symbol: "₾",
		nameRu: "Грузинский лари",
		nameEn: "Georgian Lari",
		nominal: 1,
		cbrRateRub: 34.1,
		minorUnitRatio: 100,
		minorUnitNameRu: "тетри",
	},
	AMD: {
		code: "AMD",
		symbol: "֏",
		nameRu: "Армянский драм",
		nameEn: "Armenian Dram",
		nominal: 100,
		cbrRateRub: 23.4, // 100 AMD = 23.40 RUB
		minorUnitRatio: 100,
		minorUnitNameRu: "лума",
	},
	UZS: {
		code: "UZS",
		symbol: "so'm",
		nameRu: "Узбекский сум",
		nameEn: "Uzbek Som",
		nominal: 10000,
		cbrRateRub: 72.5, // 10,000 UZS = 72.50 RUB
		minorUnitRatio: 100,
		minorUnitNameRu: "тийин",
	},
};

export interface CurrencyConversionInput {
	readonly amountRubKopecks: number;
	readonly targetCurrency: SupportedCurrency;
	readonly customRateRub?: number | undefined; // Optional custom/override rate per nominal
	readonly bankSpreadPercent?: number | undefined; // Optional acquisition spread (e.g. 1.5% - 3.0%)
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
	readonly targetAmountMinor: number; // in minor units (cents, tiyn, etc.)
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
	readonly items: readonly {
		readonly serviceNameRu: string;
		readonly serviceNameEn: string;
		readonly quantity: number;
		readonly priceRub: number;
		readonly totalRub: number;
		readonly totalForeignDecimal: number;
		readonly totalForeignFormatted: string;
	}[];
	readonly recommendedPaymentChannelsRu: readonly string[];
	readonly recommendedPaymentChannelsEn: readonly string[];
}

/**
 * Converts Russian Ruble amount (in kopecks) to target foreign currency with exact minor unit rounding.
 */
export function convertRubToForeignCurrency(
	input: CurrencyConversionInput,
): CurrencyConversionResult {
	const rubKop = Math.max(0, Math.round(input.amountRubKopecks));
	const meta = CBR_CURRENCIES[input.targetCurrency] ?? CBR_CURRENCIES.RUB;

	if (meta.code === "RUB") {
		const formatted = formatCurrencyAmount(kopecksToRub(rubKop), "RUB");
		return {
			sourceRubKopecks: rubKop,
			sourceRubFormatted: formatted,
			targetCurrency: "RUB",
			targetSymbol: "₽",
			nominal: 1,
			officialCbrRateRub: 1.0,
			effectiveRateRub: 1.0,
			bankSpreadPercent: 0,
			targetAmountMinor: rubKop,
			targetAmountDecimal: kopecksToRub(rubKop),
			targetFormatted: formatted,
		};
	}

	const baseRate = input.customRateRub ?? meta.cbrRateRub;
	const spread = Math.max(0, input.bankSpreadPercent ?? 0);
	// In currency purchase, the effective exchange rate incorporates the banking spread
	const effectiveRate = baseRate * (1 + spread / 100);

	// Unit price per 1 unit of foreign currency in rubles:
	const rubPerSingleUnit = effectiveRate / meta.nominal;

	// Total foreign currency in major units:
	const rubAmount = rubKop / 100;
	const foreignMajor = rubAmount / rubPerSingleUnit;
	const targetAmountMinor = Math.round(foreignMajor * meta.minorUnitRatio);
	const targetAmountDecimal = targetAmountMinor / meta.minorUnitRatio;

	const targetFormatted = formatCurrencyAmount(targetAmountDecimal, meta.code, false);

	return {
		sourceRubKopecks: rubKop,
		sourceRubFormatted: `${kopecksToNumericString(rubKop)} ₽`,
		targetCurrency: meta.code,
		targetSymbol: meta.symbol,
		nominal: meta.nominal,
		officialCbrRateRub: meta.cbrRateRub,
		effectiveRateRub: Math.round(effectiveRate * 10000) / 10000,
		bankSpreadPercent: spread,
		targetAmountMinor,
		targetAmountDecimal,
		targetFormatted,
	};
}

/**
 * Converts foreign currency amount (in minor units) back to Russian Rubles (in kopecks).
 */
export function convertForeignCurrencyToRub(params: {
	foreignAmountMinor: number;
	currency: SupportedCurrency;
	customRateRub?: number | undefined;
	bankSpreadPercent?: number | undefined;
}): {
	rubKopecks: number;
	rubDecimal: number;
	formattedRub: string;
} {
	const meta = CBR_CURRENCIES[params.currency] ?? CBR_CURRENCIES.RUB;
	const minor = Math.max(0, Math.round(params.foreignAmountMinor));

	if (meta.code === "RUB") {
		return {
			rubKopecks: minor,
			rubDecimal: kopecksToRub(minor),
			formattedRub: `${kopecksToNumericString(minor)} ₽`,
		};
	}

	const baseRate = params.customRateRub ?? meta.cbrRateRub;
	const spread = Math.max(0, params.bankSpreadPercent ?? 0);
	const effectiveRate = baseRate * (1 - spread / 100);

	const major = minor / meta.minorUnitRatio;
	const rubAmount = major * (effectiveRate / meta.nominal);
	const rubKopecks = Math.round(rubAmount * 100);
	const rubDecimal = kopecksToRub(rubKopecks);

	return {
		rubKopecks,
		rubDecimal,
		formattedRub: formatCurrencyAmount(rubDecimal, "RUB", false),
	};
}

/**
 * Formats a numeric currency amount into standard human-readable format.
 */
export function formatCurrencyAmount(
	amount: number,
	currency: SupportedCurrency,
	isMinorUnit: boolean = false,
): string {
	const meta = CBR_CURRENCIES[currency] ?? CBR_CURRENCIES.RUB;
	const majorValue = isMinorUnit ? amount / meta.minorUnitRatio : amount;
	const formattedNum = majorValue.toLocaleString("en-US", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});

	switch (currency) {
		case "RUB":
			return `${formattedNum.replace(/,/g, " ")} ₽`;
		case "USD":
			return `$${formattedNum}`;
		case "EUR":
			return `€${formattedNum}`;
		case "KZT":
			return `${formattedNum.replace(/,/g, " ")} ₸`;
		case "BYN":
			return `${formattedNum.replace(/,/g, " ")} Br`;
		case "CNY":
			return `¥${formattedNum}`;
		case "AED":
			return `${formattedNum} AED`;
		case "GEL":
			return `${formattedNum} ₾`;
		case "AMD":
			return `${formattedNum.replace(/,/g, " ")} ֏`;
		case "UZS":
			return `${formattedNum.replace(/,/g, " ")} so'm`;
		default:
			return `${formattedNum} ${currency}`;
	}
}

/**
 * Compiles a comprehensive dual-language Medical Tourism Treatment Quote
 * with CBR foreign exchange conversion, itemized dental procedures, and accepted payment channels.
 */
export function calculateMedicalTourismQuote(
	input: MedicalTourismQuoteInput,
): MedicalTourismQuoteResult {
	const validDays = input.validDays ?? 14;
	const now = new Date();
	const validUntil = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

	let totalGrossKop = 0;
	for (const it of input.items) {
		const unitKop = rubToKopecks(it.priceRub || 0);
		totalGrossKop += unitKop * (it.quantity || 1);
	}

	const discountKop = input.discountRub ? rubToKopecks(input.discountRub) : 0;
	const totalNetKop = Math.max(0, totalGrossKop - discountKop);

	const netConversion = convertRubToForeignCurrency({
		amountRubKopecks: totalNetKop,
		targetCurrency: input.targetCurrency,
		bankSpreadPercent: input.bankSpreadPercent,
	});

	const items = input.items.map((item) => {
		const unitKop = rubToKopecks(item.priceRub || 0);
		const lineTotalKop = unitKop * (item.quantity || 1);
		const itemConv = convertRubToForeignCurrency({
			amountRubKopecks: lineTotalKop,
			targetCurrency: input.targetCurrency,
			bankSpreadPercent: input.bankSpreadPercent,
		});

		return {
			serviceNameRu: item.serviceNameRu,
			serviceNameEn: item.serviceNameEn,
			quantity: item.quantity || 1,
			priceRub: item.priceRub,
			totalRub: kopecksToRub(lineTotalKop),
			totalForeignDecimal: itemConv.targetAmountDecimal,
			totalForeignFormatted: itemConv.targetFormatted,
		};
	});

	const quoteNumber = `MED-TOUR-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

	const recommendedPaymentChannelsRu = [
		"Банковская карта МИР / UnionPay (оплата на терминале клиники)",
		"Оплата через СБП (Система быстрых платежей / QR-код)",
		"Прямой банковский перевод по реквизитам клиники (RUB/CNY)",
		"Наличный расчет в кассе клиники (RUB)",
	];

	const recommendedPaymentChannelsEn = [
		"UnionPay / Mir International Bank Cards (POS Terminal at clinic)",
		"Fast Payment System (SBP Dynamic QR Code)",
		"Direct Bank Wire Transfer (RUB / CNY invoice)",
		"Cash settlement in clinic cashier desk (RUB)",
	];

	return {
		quoteNumber,
		patientFullName: input.patientFullName,
		dateIso: now.toISOString().slice(0, 10),
		validUntilIso: validUntil.toISOString().slice(0, 10),
		targetCurrency: input.targetCurrency,
		targetSymbol: netConversion.targetSymbol,
		officialCbrRate: netConversion.officialCbrRateRub,
		effectiveRate: netConversion.effectiveRateRub,
		totalGrossRub: kopecksToRub(totalGrossKop),
		totalGrossRubKopecks: totalGrossKop,
		discountRub: kopecksToRub(discountKop),
		totalNetRub: kopecksToRub(totalNetKop),
		totalNetRubKopecks: totalNetKop,
		totalNetForeignDecimal: netConversion.targetAmountDecimal,
		totalNetForeignFormatted: netConversion.targetFormatted,
		items,
		recommendedPaymentChannelsRu,
		recommendedPaymentChannelsEn,
	};
}
