/**
 * familyFiscalBillingEngine.ts — Движок комплексного объединения счетов членов семьи
 * (родитель + дети + супруги) с формированием раздельных фискальных строк для налогового вычета
 * (Код 01: стандартное лечение / Код 02: дорогостоящее лечение) по 54-ФЗ и приказу ФНС ЕД-7-11/824@.
 */
import { type SbpDynamicQrResult } from "./sbpQrEngine.js";
export type FamilyRelationshipType = "self" | "spouse" | "parent" | "child";
export declare const FAMILY_RELATIONSHIP_RU: Record<FamilyRelationshipType, string>;
export declare const FAMILY_RELATIONSHIP_FNS_CODE: Record<FamilyRelationshipType, string>;
export interface FamilyMemberBillingItem {
    readonly id: string;
    readonly patientId: string;
    readonly patientFullName: string;
    readonly relationship: FamilyRelationshipType;
    readonly relationshipRu?: string | undefined;
    readonly serviceName: string;
    readonly code804n: string;
    readonly toothNumber?: number | undefined;
    readonly priceRub: number;
    readonly quantity: number;
    readonly discountRub?: number | undefined;
    readonly taxDeductionCategory: "1" | "2";
    readonly isMarkedItem?: boolean | undefined;
    readonly markingCode?: string | undefined;
}
export interface FamilyBillingPayerProfile {
    readonly payerId: string;
    readonly payerFullName: string;
    readonly payerInn?: string | undefined;
    readonly payerPassport?: string | undefined;
    readonly payerPhone?: string | undefined;
    readonly payerBirthDate?: string | undefined;
}
export interface FamilyMemberBillingSummary {
    readonly patientId: string;
    readonly patientFullName: string;
    readonly relationship: FamilyRelationshipType;
    readonly relationshipRu: string;
    readonly itemsCount: number;
    readonly totalRub: number;
    readonly totalKopecks: number;
    readonly code01Rub: number;
    readonly code01Kopecks: number;
    readonly code02Rub: number;
    readonly code02Kopecks: number;
}
export interface FamilyTaxDeductionCertificateRecord {
    readonly certificateNumber: string;
    readonly payerFullName: string;
    readonly payerInn?: string | undefined;
    readonly patientFullName: string;
    readonly patientRelationshipRu: string;
    readonly patientFnsCode: string;
    readonly code01TotalRub: number;
    readonly code02TotalRub: number;
    readonly grandTotalRub: number;
    readonly taxYear: number;
    readonly estimatedRefund13Rub: number;
}
export interface CombinedFamilyBillingDraft {
    readonly payer: FamilyBillingPayerProfile;
    readonly familyGroupName?: string | undefined;
    readonly availableFamilyWalletRub?: number | undefined;
    readonly items: readonly FamilyMemberBillingItem[];
    readonly clinicName?: string | undefined;
    readonly clinicInn?: string | undefined;
}
export interface CombinedFamilyBillingResult {
    readonly payer: FamilyBillingPayerProfile;
    readonly items: readonly FamilyMemberBillingItem[];
    readonly totalAmountRub: number;
    readonly totalAmountKopecks: number;
    readonly totalAmountFormattedRu: string;
    readonly code01TotalRub: number;
    readonly code01TotalKopecks: number;
    readonly code02TotalRub: number;
    readonly code02TotalKopecks: number;
    readonly membersSummary: readonly FamilyMemberBillingSummary[];
    readonly membersCount: number;
    readonly taxDeductionCertificates: readonly FamilyTaxDeductionCertificateRecord[];
    readonly defaultSplit: {
        readonly familyWalletOffsetRub: number;
        readonly familyWalletOffsetKopecks: number;
        readonly remainingDueRub: number;
        readonly remainingDueKopecks: number;
        readonly sbpQr: SbpDynamicQrResult | null;
    };
}
/**
 * Resolves whether a given dental procedure falls under Tax Deduction Code 02 (Дорогостоящее лечение:
 * имплантация, костная пластика, синус-лифтинг, сложные хирургические реконструкции) or Code 01 (Стандартное лечение).
 */
export declare function resolveDentalTaxDeductionCategory(serviceName: string, code804n: string): "1" | "2";
/**
 * Combines multiple family members' accounts and invoices into a unified billing draft:
 * 1. Groups items with patient prefixes and 804n codes.
 * 2. Classifies each line item into Tax Deduction Code 01 vs Code 02.
 * 3. Pre-calculates available family balance offset and generates dynamic SBP QR code for the remainder.
 * 4. Produces statutory tax deduction certificates (KND 1151156).
 */
export declare function compileFamilyBillingDraft(draft: CombinedFamilyBillingDraft): CombinedFamilyBillingResult;
