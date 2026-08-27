/**
 * DENTE Dental CRM — Family Shared Deposit & Balance Management Engine
 *
 * Provides statutory, kopeck-exact pooled family deposit accounts:
 * 1. Head of household (sponsor) maintains a unified pre-paid deposit.
 * 2. Family members (children, spouses, elderly parents) debit medical treatments from the shared balance.
 * 3. Configurable spending authorization and optional per-member debit limits.
 * 4. Zero floating-point drift (all internal state in integer kopecks).
 * 5. Full 54-FZ FFD 1.2 Tag 1215 (advance offset / зачет аванса) audit trail.
 */
export type FamilyRelationship = "self" | "spouse" | "child" | "parent" | "relative";
export declare const FAMILY_RELATIONSHIP_NAMES_RU: Record<FamilyRelationship, string>;
export interface FamilyMemberProfile {
    readonly patientId: string;
    readonly fullName: string;
    readonly relationship: FamilyRelationship;
    readonly isSpendingAuthorized: boolean;
    readonly individualLimitKopecks?: number | undefined;
    readonly individualSpentKopecks: number;
}
export interface FamilyDepositAccount {
    readonly id: string;
    readonly familyGroupId: string;
    readonly familyName: string;
    readonly sponsorPatientId: string;
    readonly sponsorFullName: string;
    readonly sponsorPhone?: string | undefined;
    readonly sponsorInn?: string | undefined;
    readonly balanceKopecks: number;
    readonly totalDepositedKopecks: number;
    readonly totalSpentKopecks: number;
    readonly members: readonly FamilyMemberProfile[];
    readonly createdAtIso: string;
    readonly updatedAtIso: string;
}
export interface FamilyDepositTransaction {
    readonly id: string;
    readonly familyGroupId: string;
    readonly transactionType: "deposit" | "debit" | "refund" | "transfer";
    readonly patientId: string;
    readonly patientFullName: string;
    readonly payerPatientId: string;
    readonly amountKopecks: number;
    readonly amountRub: number;
    readonly balanceBeforeKopecks: number;
    readonly balanceAfterKopecks: number;
    readonly invoiceId?: string | undefined;
    readonly fiscalReceiptNumber?: string | undefined;
    readonly timestampIso: string;
    readonly notes?: string | undefined;
}
export interface FamilyDepositCreditInput {
    readonly account: FamilyDepositAccount;
    readonly amountRub?: number | undefined;
    readonly amountKopecks?: number | undefined;
    readonly payerPatientId: string;
    readonly payerFullName: string;
    readonly notes?: string | undefined;
    readonly timestampIso?: string | undefined;
}
export interface FamilyDepositCreditResult {
    readonly updatedAccount: FamilyDepositAccount;
    readonly transaction: FamilyDepositTransaction;
    readonly creditedKopecks: number;
    readonly creditedRub: number;
    readonly newBalanceKopecks: number;
    readonly newBalanceRub: number;
}
export interface FamilyDepositDebitInput {
    readonly account: FamilyDepositAccount;
    readonly patientId: string;
    readonly amountRub?: number | undefined;
    readonly amountKopecks?: number | undefined;
    readonly invoiceId?: string | undefined;
    readonly fiscalReceiptNumber?: string | undefined;
    readonly notes?: string | undefined;
    readonly timestampIso?: string | undefined;
}
export interface FamilyDepositDebitResult {
    readonly success: boolean;
    readonly updatedAccount: FamilyDepositAccount;
    readonly transaction?: FamilyDepositTransaction | undefined;
    readonly debitedKopecks: number;
    readonly debitedRub: number;
    readonly remainingInvoiceDueKopecks: number;
    readonly remainingInvoiceDueRub: number;
    readonly newBalanceKopecks: number;
    readonly newBalanceRub: number;
    readonly errorMessageRu?: string | undefined;
}
/**
 * Initializes a new Family Deposit Account for a family group.
 */
export declare function createFamilyDepositAccount(params: {
    id: string;
    familyGroupId: string;
    familyName: string;
    sponsorPatientId: string;
    sponsorFullName: string;
    sponsorPhone?: string | undefined;
    sponsorInn?: string | undefined;
    initialDepositRub?: number | undefined;
    initialDepositKopecks?: number | undefined;
    members?: readonly {
        readonly patientId: string;
        readonly fullName: string;
        readonly relationship: FamilyRelationship;
        readonly isSpendingAuthorized?: boolean | undefined;
        readonly individualLimitRub?: number | undefined;
    }[] | undefined;
}): FamilyDepositAccount;
/**
 * Credits money into the family deposit account.
 */
export declare function calculateFamilyDepositCredit(input: FamilyDepositCreditInput): FamilyDepositCreditResult;
/**
 * Debits medical treatment costs from the shared family deposit.
 * Validates spending authorization and optional individual spending limits.
 */
export declare function calculateFamilyDepositDebit(input: FamilyDepositDebitInput): FamilyDepositDebitResult;
/**
 * Refunds a previous debit back into the family deposit.
 */
export declare function calculateFamilyDepositRefund(params: {
    account: FamilyDepositAccount;
    patientId: string;
    refundAmountKopecks: number;
    invoiceId?: string | undefined;
    notes?: string | undefined;
}): {
    updatedAccount: FamilyDepositAccount;
    transaction: FamilyDepositTransaction;
};
