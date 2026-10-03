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
	readonly duplicate: boolean;
}

export interface FamilyDebitParams {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly patientId: string; // Patient receiving care (child, spouse, etc.)
	readonly amountRub: number;
	readonly serviceId?: string | undefined;
	readonly catalogItemId?: string | undefined;
	readonly discountRub?: number | undefined;
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
	readonly duplicate: boolean;
}

export interface FamilyRefundParams {
	readonly organizationId: string;
	readonly familyGroupId: string;
	readonly amountRub: number;
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
	readonly estimated13PercentRefundRub: number;
	readonly xmlPayload: string;
	readonly xmlFileName: string;
}
