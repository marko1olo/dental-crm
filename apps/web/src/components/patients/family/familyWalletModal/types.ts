/**
 * apps/web/src/components/patient/familyWalletModal/types.ts
 *
 * Layer 0: Contracts, interfaces and data types for Family Wallet.
 * Zero runtime dependencies, 100% pure TypeScript definitions.
 */

export interface FamilyMemberItem {
	readonly id: string;
	readonly fullName: string;
	readonly phone?: string | null | undefined;
	readonly roleRu?: string | undefined;
	readonly personalBalanceRub?: number | undefined;
	readonly canSpendFromPool?: boolean | undefined;
}

export interface FamilyGroupDetails {
	readonly id: string;
	readonly name: string;
	readonly balance: number | string;
	readonly headPatientId?: string | null | undefined;
	readonly members?: readonly FamilyMemberItem[] | undefined;
}

export interface FamilyTransactionItem {
	readonly id: string;
	readonly date: string;
	readonly operationType: "topup" | "spend" | "transfer" | "refund";
	readonly amountRub: number;
	readonly payerPatientId?: string | undefined;
	readonly payerName?: string | undefined;
	readonly targetPatientId?: string | undefined;
	readonly targetName?: string | undefined;
	readonly method?: "cash" | "card" | "sbp" | "online" | "pool" | undefined;
	readonly note?: string | undefined;
}

export interface FamilyCertificateItem {
	readonly id: string;
	readonly code: string;
	readonly nominalRub: number;
	readonly remainingRub: number;
	readonly expirationDate?: string | undefined;
	readonly ownerPatientId?: string | undefined;
	readonly ownerName?: string | undefined;
}

export interface FamilySpendingPermission {
	readonly memberId: string;
	readonly canSpend: boolean;
	readonly maxMonthlyLimitRub?: number | undefined;
}

export type FamilyWalletTab =
	| "overview"
	| "topup"
	| "spend"
	| "transfer"
	| "history";

export type TopupPaymentMethod = "cash" | "card" | "sbp";

export interface FamilyWalletModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly patientName?: string | null | undefined;
	readonly familyData?: FamilyGroupDetails | null | undefined;
	readonly onFamilyDataChanged?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const PRESET_AMOUNTS = [1000, 3000, 5000, 10000, 20000] as const;
