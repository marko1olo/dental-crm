/**
 * apps/web/src/components/billing/splitTenders/types.ts
 *
 * Types for SplitTendersList components.
 * Strictly <= 120 lines per Mandate 8b.
 */

import type { SplitBalancesResult, CanonicalTenderType } from "@dental/shared";

export type SplitAllocatedTenderTarget =
	| Extract<CanonicalTenderType, "card" | "cash" | "sbp" | "deposit" | "family_wallet">
	| "family";

export interface SplitTendersListProps {
	readonly splitResult: SplitBalancesResult;
	readonly cardRub: number;
	readonly setCardRub: (val: number) => void;
	readonly cashRub: number;
	readonly setCashRub: (val: number) => void;
	readonly sbpRub: number;
	readonly setSbpRub: (val: number) => void;
	readonly depositRub: number;
	readonly setDepositRub: (val: number) => void;
	readonly familyDepositRub: number;
	readonly setFamilyDepositRub: (val: number) => void;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName: string;
	readonly clinicLegalName: string;
	readonly handleAllocateRemainingTo: (tender: "card" | "cash" | "sbp" | "deposit" | "family") => void;
}
