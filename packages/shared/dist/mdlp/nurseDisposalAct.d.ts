import type { MdlpCarpuleQueueItem, SeniorNurseDisposalActData } from "./types.js";
/**
 * Converts a numeric amount to Russian words format for financial & inventory acts.
 * Example: 1450.50 -> "Одна тысяча четыреста пятьдесят рублей 50 копеек"
 */
export declare function amountToRussianWords(amount: number): string;
export { amountToRussianWords as mdlpAmountToRussianWords };
/**
 * Converts integer quantity of items to Russian words format.
 * Example: 12 -> "Двенадцать карпул"
 */
export declare function carpulesQuantityToRussianWords(qty: number, unit?: string): string;
export { carpulesQuantityToRussianWords as quantityToRussianWords };
export declare function formatSeniorNurseDisposalActData(options: {
    actNumber?: string | undefined;
    actDate?: string | undefined;
    organizationName?: string | undefined;
    organizationInn?: string | undefined;
    organizationAddress?: string | undefined;
    departmentName?: string | undefined;
    cabinetName?: string | undefined;
    seniorNurseName?: string | undefined;
    chiefDoctorName?: string | undefined;
    dentistName?: string | undefined;
    crptReceiptNumber?: string | undefined;
    notes?: string | undefined;
    items: readonly MdlpCarpuleQueueItem[];
}): SeniorNurseDisposalActData;
/**
 * Generates an official printable HTML document for the Senior Nurse Medication Write-off Act.
 * Conforms to Russian healthcare inventory audit regulations (Росздравнадзор & МДЛП).
 */
export declare function generateSeniorNurseDisposalActHtml(actData: SeniorNurseDisposalActData): string;
