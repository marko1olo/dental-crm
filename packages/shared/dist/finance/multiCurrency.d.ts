/**
 * DENTE Dental CRM — Multi-Currency Medical Tourism & Cross-Border Exchange Engine
 *
 * Provides statutory, kopeck-exact multi-currency conversion per official Central Bank of Russia
 * (CBR / ЦБ РФ) exchange rates with zero floating-point drift, bank conversion spread handling,
 * and dual-language (RU/EN) commercial quotes for international dental patients.
 */
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
export declare const CBR_CURRENCIES: Record<SupportedCurrency, CurrencyMetadata>;
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
export declare function convertRubToForeignCurrency(input: CurrencyConversionInput): CurrencyConversionResult;
/**
 * Converts foreign currency amount (in minor units) back to Russian Rubles (in kopecks).
 */
export declare function convertForeignCurrencyToRub(params: {
    foreignAmountMinor: number;
    currency: SupportedCurrency;
    customRateRub?: number | undefined;
    bankSpreadPercent?: number | undefined;
}): {
    rubKopecks: number;
    rubDecimal: number;
    formattedRub: string;
};
/**
 * Formats a numeric currency amount into standard human-readable format.
 */
export declare function formatCurrencyAmount(amount: number, currency: SupportedCurrency, isMinorUnit?: boolean): string;
/**
 * Compiles a comprehensive dual-language Medical Tourism Treatment Quote
 * with CBR foreign exchange conversion, itemized dental procedures, and accepted payment channels.
 */
export declare function calculateMedicalTourismQuote(input: MedicalTourismQuoteInput): MedicalTourismQuoteResult;
