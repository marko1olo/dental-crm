import type { CreatePaymentInput, Payment } from "@dental/shared";
import type { FastifyReply } from "fastify";
import { cleanPaymentText } from "./fiscalReceiptService.js";
import {
	billingPaymentScopeError,
	paymentClientMutationConstraint,
} from "./types.js";

export { requirePayoutAccess } from "./payoutAccessService.js";

export function isDuplicateClientMutationError(error: unknown): boolean {
	if (!error || typeof error !== "object") return false;
	const candidate = error as {
		code?: unknown;
		constraint?: unknown;
		message?: unknown;
		cause?: unknown;
	};
	const code = typeof candidate.code === "string" ? candidate.code : null;
	const constraint =
		typeof candidate.constraint === "string" ? candidate.constraint : null;
	const message =
		typeof candidate.message === "string" ? candidate.message : "";
	if (
		code === "23505" &&
		(constraint === paymentClientMutationConstraint ||
			message.includes(paymentClientMutationConstraint))
	) {
		return true;
	}
	// Драйвер может обернуть исходную ошибку базы.
	if (candidate.cause) return isDuplicateClientMutationError(candidate.cause);
	return false;
}

export function sendBillingPaymentScopeError(
	reply: FastifyReply,
	statusCode: 404 | 409,
	message: string,
) {
	return reply.code(statusCode).send({
		error: billingPaymentScopeError,
		message,
	});
}

export function paymentRetryMatchesExisting(
	existingPayment: Payment,
	input: CreatePaymentInput,
): boolean {
	if (existingPayment.patientId !== input.patientId) return false;
	if ((existingPayment.visitId ?? null) !== (input.visitId ?? null)) return false;
	if ((existingPayment.documentId ?? null) !== (input.documentId ?? null)) return false;
	if (Number(existingPayment.amountRub) !== Number(input.amountRub)) return false;

	const methodsMatch =
		existingPayment.method === input.method ||
		input.method === "split" ||
		input.method === "mixed";
	if (!methodsMatch) return false;

	if ((existingPayment.payerInn ?? null) !== (cleanPaymentText(input.payerInn) ?? null)) return false;
	if ((existingPayment.payerFullName ?? null) !== (cleanPaymentText(input.payerFullName) ?? null)) return false;
	if ((existingPayment.taxDeductionCode ?? null) !== (input.taxDeductionCode ?? null)) return false;

	const inputReceiptNum = cleanPaymentText(input.fiscalReceiptNumber);
	if (inputReceiptNum && existingPayment.fiscalReceiptNumber !== inputReceiptNum) return false;

	const inputNote = cleanPaymentText(input.note);
	const existingNote = cleanPaymentText(existingPayment.note);
	if (inputNote && existingNote && existingNote !== inputNote && !existingNote.startsWith(inputNote)) {
		return false;
	}

	return true;
}
