/**
 * balanceModules/types.ts — Contracts and domain errors for Patient Balance & Personal Advance service.
 */

export interface PatientDetailedBalance {
	patientId: string;
	patientFullName: string;
	personalAdvanceKopecks: number;
	personalAdvanceRub: number;
	familyWallet: {
		hasFamily: boolean;
		familyGroupId: string | null;
		familyName: string | null;
		familyBalanceKopecks: number;
		familyBalanceRub: number;
		canSpend: boolean;
		spendLimitKopecks: number | null;
		availableToPatientKopecks: number;
		availableToPatientRub: number;
	};
	loyaltyBonusPoints: number;
	totalAvailableForTreatmentKopecks: number;
	totalAvailableForTreatmentRub: number;
}

export interface CreditAdvanceParams {
	organizationId: string;
	patientId: string;
	amountKopecks: number;
	method: "cash" | "card" | "sbp" | "bank_transfer";
	idempotencyKey: string;
	cashBoxId?: string | undefined;
	operatorId?: string | undefined;
	notes?: string | undefined;
}

export interface DebitAdvanceParams {
	organizationId: string;
	patientId: string;
	amountKopecks: number;
	idempotencyKey: string;
	visitId?: string | undefined;
	invoiceId?: string | undefined;
	allowFamilyFallback?: boolean | undefined;
	notes?: string | undefined;
}

export interface RefundAdvanceParams {
	organizationId: string;
	patientId: string;
	amountKopecks: number;
	cashBoxId: string;
	idempotencyKey: string;
	operatorId?: string | undefined;
	reasonText?: string | undefined;
}

export class PatientBalanceError extends Error {
	public readonly code: string;
	public readonly statusCode: number;

	constructor(code: string, message: string, statusCode = 400) {
		super(message);
		this.name = "PatientBalanceError";
		this.code = code;
		this.statusCode = statusCode;
	}
}
