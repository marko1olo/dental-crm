import type { LoyaltyTierDefinition } from "../presets/index";
import type { CashboxFiscalSplitResult, LoyaltyLedgerEntry } from "./loyaltyTypes";

export interface FamilyMember {
	readonly patientId: string;
	readonly fullName: string;
	readonly roleRu: "Глава семьи" | "Супруг / Супруга" | "Ребенок" | "Родитель" | "Родственник";
	readonly birthDateIso?: string;
	readonly individualPointsBalance: number;
	readonly lifetimeSpentKop: number;
	readonly isBonusSpendingAllowed?: boolean;
	readonly canDebitSharedPool?: boolean;
}

export interface FamilyPoolBalanceResult {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly memberCount: number;
	readonly totalPooledPoints: number;
	readonly totalFamilyLifetimeSpentKop: number;
	readonly totalFamilyLifetimeSpentRub: number;
	readonly sharedPoolTierId?: string | undefined;
	readonly sharedPoolTierName?: string | undefined;
	readonly effectiveTier: LoyaltyTierDefinition;
	readonly members: readonly FamilyMember[];
}

export type FamilyPoolResult = FamilyPoolBalanceResult;
export type FamilyPointsPool = FamilyPoolBalanceResult;

export interface DebitFamilySharedBalanceInput {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly sponsorPatientId: string;
	readonly sponsorFullName: string;
	readonly targetPatientId: string;
	readonly targetPatientName: string;
	readonly targetRoleRu: "Глава семьи" | "Супруг / Супруга" | "Ребенок" | "Родитель" | "Родственник";
	readonly invoiceAmountKop: number;
	readonly availableFamilyPointsRub: number;
	readonly requestedPointsRub?: number;
	readonly maxCoveragePercent?: number; // default 30% by clean dental standard
	readonly allowFullCoverage?: boolean; // Doctor override / 100% parental payment
	readonly staffNameRu?: string;
	readonly timestampIso?: string;
}

export interface DebitFamilySharedBalanceResult {
	readonly success: boolean;
	readonly familyGroupId: string;
	readonly sponsorPatientId: string;
	readonly sponsorFullName: string;
	readonly targetPatientId: string;
	readonly targetPatientName: string;
	readonly targetRoleRu: string;
	readonly invoiceAmountKop: number;
	readonly invoiceAmountRub: number;
	readonly maxAllowedRedemptionRub: number;
	readonly debitedPointsRub: number;
	readonly debitedPointsKop: number;
	readonly remainingFamilyBalanceRub: number;
	readonly remainingInvoiceDueKop: number;
	readonly remainingInvoiceDueRub: number;
	readonly isOneWalletTransferFree: true; // 1 кошелек на семью — родитель оплачивает без ручной переброски
	readonly fiscal54FzSplit: CashboxFiscalSplitResult;
	readonly ledgerEntry: LoyaltyLedgerEntry;
	readonly messageRu: string;
}

export interface CreditFamilySharedBalanceInput {
	readonly familyGroupId: string;
	readonly familyName: string;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly currentFamilyBalanceRub: number;
	readonly amountToAddRub: number;
	readonly reasonRu?: string;
	readonly staffNameRu?: string;
}

export interface CreditFamilySharedBalanceResult {
	readonly familyGroupId: string;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly creditedPointsRub: number;
	readonly newFamilyBalanceRub: number;
	readonly ledgerEntry: LoyaltyLedgerEntry;
	readonly messageRu: string;
}
