import {
	formatKopecksRu,
	type CreatePaymentInput,
	type FiscalReceiptDetails,
	type Kopecks,
	type Payment,
} from "@dental/shared";

// The DB stores tax_deduction_code as free `text`, but the Payment DTO narrows it
// to the fiscal codes "1" | "2" | null. Validate at the read boundary instead of
// asserting with `as any`: any legacy/invalid value collapses to null rather than
// silently violating the contract.
export function narrowTaxDeductionCode(value: string | null): "1" | "2" | null {
	return value === "1" || value === "2" ? value : null;
}

export interface BillingOverpaymentErrorParams {
	targetKind: "visit" | "document";
	targetId: string;
	targetLabel: string;
	incomingKopecks: Kopecks;
	remainingKopecks: Kopecks;
	totalKopecks: Kopecks;
	paidKopecks: Kopecks;
}

export class BillingOverpaymentError extends Error {
	readonly statusCode = 400;
	readonly error = "BillingOverpaymentError";
	readonly targetKind: "visit" | "document";
	readonly targetId: string;
	readonly incomingKopecks: Kopecks;
	readonly remainingKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly paidKopecks: Kopecks;

	constructor(params: BillingOverpaymentErrorParams) {
		const {
			targetKind,
			targetId,
			targetLabel,
			incomingKopecks,
			remainingKopecks,
			totalKopecks,
			paidKopecks,
		} = params;

		const message =
			remainingKopecks <= 0
				? `По ${targetLabel} уже внесена вся необходимая сумма (${formatKopecksRu(totalKopecks)}). Дополнительная оплата не требуется.`
				: `Сумма оплаты (${formatKopecksRu(incomingKopecks)}) превышает остаток по ${targetLabel} (${formatKopecksRu(remainingKopecks)}). Всего по ${targetLabel}: ${formatKopecksRu(totalKopecks)}, ранее оплачено: ${formatKopecksRu(paidKopecks)}. Укажите сумму не более ${formatKopecksRu(remainingKopecks)}.`;

		super(message);
		this.name = "BillingOverpaymentError";
		this.targetKind = targetKind;
		this.targetId = targetId;
		this.incomingKopecks = incomingKopecks;
		this.remainingKopecks = remainingKopecks;
		this.totalKopecks = totalKopecks;
		this.paidKopecks = paidKopecks;
	}
}

export class Decree659Error extends Error {
	readonly statusCode = 422;
	readonly code: string;

	constructor(code: string, message: string) {
		super(message);
		this.name = code;
		this.code = code;
	}
}

export interface LockedPatientForBilling {
	id: string;
	fullName: string | null;
	administrativeProfile: unknown;
	familyGroupId: string | null;
}

export interface LockedVisitForBilling {
	id: string;
	patientId: string;
	appointmentId: string | null;
	status: "draft" | "signed" | "voided";
}

export interface PaymentRefundSettlementItem {
	readonly paymentId: string;
	readonly fullyRefunded: boolean;
}

export interface PaymentRefundSettlementResult {
	refunded: string[];
	restored: string[];
}
