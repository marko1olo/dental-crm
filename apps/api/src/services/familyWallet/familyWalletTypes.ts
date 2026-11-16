/**
 * familyWalletTypes.ts — Domain types, DTOs and errors for Family Wallet.
 */

import type { familyGroups, patients, payments, cashOperations } from "../../db/schema.js";

export type PatientRow = typeof patients.$inferSelect;
export type FamilyGroupRow = typeof familyGroups.$inferSelect;
export type PaymentRow = typeof payments.$inferSelect;

export class FamilyWalletError extends Error {
	constructor(
		message: string,
		public readonly statusCode: number = 400,
		public readonly code: string = "FAMILY_WALLET_ERROR",
	) {
		super(message);
		this.name = "FamilyWalletError";
	}
}

export interface FamilyTopupParams {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly patientId?: string | undefined; // Payer / Head of family
	readonly payerPatientId?: string | undefined; // Payer / Head of family
	readonly amountRub: number;
	readonly amountKopecks?: bigint | number | undefined;
	readonly method?: "cash" | "card" | "bank_transfer" | "online" | "other" | undefined;
	readonly clientMutationId: string;
	readonly notes?: string | undefined;
}

export interface FamilyTopupResult {
	readonly success: boolean;
	readonly payment: PaymentRow;
	readonly previousBalanceRub: number;
	readonly newBalanceRub: number;
	readonly creditedRub: number;
	readonly previousBalanceKopecks?: bigint | number | undefined;
	readonly newBalanceKopecks?: bigint | number | undefined;
	readonly creditedKopecks?: bigint | number | undefined;
	readonly duplicate: boolean;
}

export interface FamilyDebitParams {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly patientId: string; // Patient receiving care (child, spouse, etc.)
	readonly amountRub: number;
	readonly amountKopecks?: bigint | number | undefined;
	readonly serviceId?: string | undefined;
	readonly catalogItemId?: string | undefined;
	readonly discountRub?: number | undefined;
	readonly discountKopecks?: bigint | number | undefined;
	readonly discountPercent?: number | undefined;
	readonly clientMutationId: string;
	readonly documentId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly taxCategory?: "1" | "2" | undefined; // 1 = Standard, 2 = Expensive
	readonly notes?: string | undefined;
	readonly payerPatientId?: string | undefined; // Head of family authorizing spend
}

export interface FamilyDebitResult {
	readonly success: boolean;
	readonly payment: PaymentRow;
	readonly previousBalanceRub: number;
	readonly newBalanceRub: number;
	readonly debitedRub: number;
	readonly previousBalanceKopecks?: bigint | number | undefined;
	readonly newBalanceKopecks?: bigint | number | undefined;
	readonly debitedKopecks?: bigint | number | undefined;
	readonly duplicate: boolean;
}

export interface FamilyRefundParams {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly amountRub: number;
	readonly amountKopecks?: bigint | number | undefined;
	readonly patientId?: string | undefined; // Recipient patient (defaults to head patient)
	readonly cashBoxId?: string | undefined;
	readonly operatorId?: string | undefined;
	readonly method?: "cash" | "card" | "bank_transfer" | "other" | undefined;
	readonly clientMutationId: string;
	readonly reasonText?: string | undefined;
}

export interface FamilyRefundResult {
	readonly success: boolean;
	readonly payment: PaymentRow;
	readonly previousBalanceRub: number;
	readonly newBalanceRub: number;
	readonly refundedRub: number;
	readonly previousBalanceKopecks?: bigint | number | undefined;
	readonly newBalanceKopecks?: bigint | number | undefined;
	readonly refundedKopecks?: bigint | number | undefined;
	readonly duplicate: boolean;
	readonly cashOperation?: typeof cashOperations.$inferSelect | undefined;
}

export interface FnsTaxCertificateSummary {
	readonly certificateNumber: string;
	readonly taxYear: string;
	readonly payerPatientId: string;
	readonly payerFullName: string;
	readonly payerInn?: string | undefined;
	readonly patientId: string;
	readonly patientFullName: string;
	readonly kinshipCode: "1" | "2" | "3" | "4" | "5";
	readonly kinshipNameRu: string;
	readonly code01AmountRub: number;
	readonly code02AmountRub: number;
	readonly grandTotalRub: number;
	readonly code01AmountKopecks?: bigint | number | undefined;
	readonly code02AmountKopecks?: bigint | number | undefined;
	readonly grandTotalKopecks?: bigint | number | undefined;
	readonly estimated13PercentRefundRub: number;
	readonly estimated13PercentRefundKopecks?: bigint | number | undefined;
	readonly xmlPayload: string;
	readonly xmlFileName: string;
	readonly signatoryName?: string | undefined;
}
