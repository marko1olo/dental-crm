import {
	type CreatePaymentInput,
	documentKindMetadata,
	type Payment,
} from "@dental/shared";
import {
	type SchemaIssueLike,
	schemaRefusalMessage,
} from "../../utils/schemaRefusalWords.js";
import {
	paymentFieldLabels,
	paymentValidationMessage,
} from "./types.js";

export function cleanPaymentText(value: string | null | undefined): string | null {
	const clean = value?.trim();
	return clean ? clean : null;
}

export function documentCanReceivePayment(documentKind: string): boolean {
	if (!(documentKind in documentKindMetadata)) return false;
	const metadata =
		documentKindMetadata[documentKind as keyof typeof documentKindMetadata];
	return (
		metadata.group === "payment" &&
		documentKind !== "payment_refund_correction_request"
	);
}

export function paymentValidationDetail(
	issues: ReadonlyArray<SchemaIssueLike>,
): string {
	return schemaRefusalMessage({
		issues,
		fieldLabels: paymentFieldLabels,
		retryAction: "запись оплаты",
		fallbackMessage: paymentValidationMessage,
	});
}

export function normalizedFiscalReceipt(
	input: CreatePaymentInput["fiscalReceipt"],
): Payment["fiscalReceipt"] {
	if (!input) return null;
	const fn = cleanPaymentText(input.fn);
	const fd = cleanPaymentText(input.fd);
	const fpd = cleanPaymentText(input.fpd);
	const cashierName = cleanPaymentText(input.cashierName);
	const receiptUrl = cleanPaymentText(input.receiptUrl);
	if (!fn && !fd && !fpd && !cashierName && !receiptUrl) return null;
	return {
		fn,
		fd,
		fpd,
		cashierName,
		receiptUrl,
		operationType: input.operationType ?? "income",
	};
}

export function fiscalReceiptLabel(
	fiscalReceipt: Payment["fiscalReceipt"],
): string | null {
	if (!fiscalReceipt) return null;
	const parts = [
		fiscalReceipt.fn ? `ФН ${fiscalReceipt.fn}` : null,
		fiscalReceipt.fd ? `ФД ${fiscalReceipt.fd}` : null,
		fiscalReceipt.fpd ? `ФПД ${fiscalReceipt.fpd}` : null,
	].filter(Boolean);
	return parts.length ? parts.join("; ") : null;
}

export function paymentRetrySignatureFromInput(input: CreatePaymentInput) {
	const fiscalReceipt = normalizedFiscalReceipt(input.fiscalReceipt);
	return {
		patientId: input.patientId,
		visitId: input.visitId ?? null,
		documentId: input.documentId ?? null,
		amountRub: input.amountRub,
		method: input.method,
		fiscalReceiptNumber:
			cleanPaymentText(input.fiscalReceiptNumber) ??
			fiscalReceiptLabel(fiscalReceipt),
		fiscalReceiptIssuedAt: cleanPaymentText(input.fiscalReceiptIssuedAt),
		fiscalReceiptUrl:
			cleanPaymentText(input.fiscalReceiptUrl) ??
			cleanPaymentText(fiscalReceipt?.receiptUrl),
		fiscalReceipt,
		payerFullName: cleanPaymentText(input.payerFullName),
		payerInn: cleanPaymentText(input.payerInn),
		payerBirthDate: cleanPaymentText(input.payerBirthDate),
		payerIdentityDocument: cleanPaymentText(input.payerIdentityDocument),
		payerRelationship: cleanPaymentText(input.payerRelationship),
		taxDeductionCode: input.taxDeductionCode ?? null,
		note: input.note ?? null,
	};
}

export function paymentRetrySignatureFromPayment(payment: Payment) {
	return {
		patientId: payment.patientId,
		visitId: payment.visitId ?? null,
		documentId: payment.documentId ?? null,
		amountRub: payment.amountRub,
		method: payment.method,
		fiscalReceiptNumber: payment.fiscalReceiptNumber ?? null,
		fiscalReceiptIssuedAt: payment.fiscalReceiptIssuedAt ?? null,
		fiscalReceiptUrl: payment.fiscalReceiptUrl ?? null,
		fiscalReceipt: payment.fiscalReceipt ?? null,
		payerFullName: payment.payerFullName ?? null,
		payerInn: payment.payerInn ?? null,
		payerBirthDate: payment.payerBirthDate ?? null,
		payerIdentityDocument: payment.payerIdentityDocument ?? null,
		payerRelationship: payment.payerRelationship ?? null,
		taxDeductionCode: payment.taxDeductionCode ?? null,
		note: payment.note ?? null,
	};
}
