/**
 * fiscalReconciliationStatement.ts — Official 54-FZ Fiscal Operations & Revenue Summary Statement for Accounting (А4 Альбомная).
 * Compliant with 54-FZ, Order of FTS Russia No. ED-7-20/662@ (FFD 1.2), and 1C:Enterprise Accounting exports.
 */
export interface ClinicFiscalRequisites {
    readonly name: string;
    readonly inn: string;
    readonly kpp?: string | undefined;
    readonly ogrn: string;
    readonly address: string;
    readonly licenseNumber: string;
    readonly kktRegNumber: string;
    readonly kktSerialNumber: string;
    readonly kktModelName?: string | undefined;
    readonly fnSerialNumber: string;
    readonly ofdName?: string | undefined;
    readonly chiefExecutiveFullName: string;
    readonly chiefExecutivePosition?: string | undefined;
    readonly chiefAccountantFullName: string;
    readonly defaultCashierFullName?: string | undefined;
}
export declare const DEFAULT_CLINIC_FISCAL_REQUISITES: ClinicFiscalRequisites;
export interface FiscalShiftSummaryRecord {
    readonly shiftNumber: number;
    readonly date: string;
    readonly openedAtIso?: string | undefined;
    readonly closedAtIso?: string | undefined;
    readonly cashierFullName: string;
    readonly receiptsCount: number;
    readonly cashIncomeRub: number;
    readonly cashIncomeKopecks: number;
    readonly cardIncomeRub: number;
    readonly cardIncomeKopecks: number;
    readonly sbpIncomeRub: number;
    readonly sbpIncomeKopecks: number;
    readonly advanceOffsetIncomeRub: number;
    readonly advanceOffsetIncomeKopecks: number;
    readonly returnsTotalRub: number;
    readonly returnsTotalKopecks: number;
    readonly returnsCashRub?: number | undefined;
    readonly returnsElectronicRub?: number | undefined;
    readonly returnsCount?: number | undefined;
    readonly shiftRevenueTotalRub: number;
    readonly shiftRevenueTotalKopecks: number;
    readonly cashInDrawerEndRub?: number | undefined;
}
export interface BankReconciliationSummary {
    readonly totalCardAndSbpKktRub: number;
    readonly totalCardAndSbpKktKopecks: number;
    readonly totalBankStatementRub: number;
    readonly totalBankStatementKopecks: number;
    readonly bankAcquiringFeeRub: number;
    readonly bankAcquiringFeeKopecks: number;
    readonly netBankDepositRub: number;
    readonly netBankDepositKopecks: number;
    readonly discrepancyRub: number;
    readonly discrepancyKopecks: number;
    readonly status: "reconciled" | "discrepancy_detected";
    readonly discrepancyReasonRu?: string | undefined;
}
export interface FiscalPeriodStatementTotals {
    readonly shiftsCount: number;
    readonly totalReceiptsCount: number;
    readonly totalCashIncomeKopecks: number;
    readonly totalCashIncomeRub: number;
    readonly totalCardIncomeKopecks: number;
    readonly totalCardIncomeRub: number;
    readonly totalSbpIncomeKopecks: number;
    readonly totalSbpIncomeRub: number;
    readonly totalElectronicKopecks: number;
    readonly totalElectronicRub: number;
    readonly totalAdvanceOffsetKopecks: number;
    readonly totalAdvanceOffsetRub: number;
    readonly totalReturnsKopecks: number;
    readonly totalReturnsRub: number;
    readonly totalRevenueKopecks: number;
    readonly totalRevenueRub: number;
}
export interface FiscalPeriodStatementData {
    readonly clinicRequisites?: Partial<ClinicFiscalRequisites> | undefined;
    readonly statementNumber: string | number;
    readonly periodStart: string;
    readonly periodEnd: string;
    readonly periodLabelRu?: string | undefined;
    readonly generatedAtIso?: string | undefined;
    readonly shifts: readonly FiscalShiftSummaryRecord[];
    readonly bankReconciliation?: BankReconciliationSummary | undefined;
    readonly bankStatementTotalRub?: number | undefined;
    readonly bankAcquiringFeeRub?: number | undefined;
    readonly cashierFullName?: string | undefined;
    readonly chiefAccountantFullName?: string | undefined;
    readonly chiefExecutiveFullName?: string | undefined;
    readonly notes?: string | undefined;
}
/**
 * Calculates kopeck-exact totals across all fiscal shifts for a period.
 */
export declare function calculateFiscalPeriodStatementTotals(shifts: readonly FiscalShiftSummaryRecord[], bankStatementTotalRub?: number | undefined, bankAcquiringFeeRub?: number | undefined): {
    readonly totals: FiscalPeriodStatementTotals;
    readonly bankReconciliation: BankReconciliationSummary;
};
/**
 * Generates an official print-ready A4 Landscape HTML statement
 * «Сводная ведомость фискальных операций и выручки за период».
 */
export declare function generateFiscalPeriodStatementHtml(data: FiscalPeriodStatementData): string;
/**
 * Exports the fiscal statement to RFC 4180 CSV with UTF-8 BOM (\uFEFF)
 * and semicolon delimiters for native loading into 1C:Enterprise / Excel.
 */
export declare function exportFiscalPeriodStatementToCsv(data: FiscalPeriodStatementData): string;
