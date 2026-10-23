import { paymentSchema } from "@dental/shared";
import type { FastifyReply } from "fastify";
import {
	BillingOverpaymentError,
	Decree659Error,
	findPaymentByClientMutationIdInDb,
} from "../../../db/billingQuery.js";
import {
	isDuplicateClientMutationError,
	paymentRetryMatchesExisting,
	sendBillingPaymentScopeError,
} from "../paymentProcessingService.js";

export async function handlePaymentCreationError(
	error: unknown,
	orgId: string,
	paymentInput: { clientMutationId?: string | null | undefined; patientId: string; [key: string]: any },
	reply: FastifyReply,
) {
	if (error instanceof Decree659Error) {
		return reply.code(error.statusCode).send({
			error: error.code,
			message: error.message,
		});
	}
	if (
		error &&
		typeof error === "object" &&
		"code" in error &&
		(error as { code: unknown }).code === "UpsellConsentShieldViolationError"
	) {
		const err = error as { statusCode?: number; code: string; message: string };
		return reply.code(err.statusCode || 422).send({
			error: err.code,
			message: err.message,
		});
	}
	if (error instanceof BillingOverpaymentError) {
		return reply.code(400).send({
			error: "BillingOverpaymentError",
			message: error.message,
			targetKind: error.targetKind,
			targetId: error.targetId,
		});
	}
	if (
		error instanceof Error &&
		(error.message.includes("Попытка подмены прайса") ||
			error.message.includes("не найдена в каталоге") ||
			error.message.includes("не найден") ||
			error.message.includes("должна быть строго больше"))
	) {
		return reply.code(400).send({
			error: "BillingValidationError",
			message: error.message,
		});
	}
	if (isDuplicateClientMutationError(error)) {
		const alreadyStored = await findPaymentByClientMutationIdInDb(
			orgId,
			paymentInput.clientMutationId,
		);
		if (alreadyStored) {
			if (
				alreadyStored.patientId !== paymentInput.patientId ||
				!paymentRetryMatchesExisting(alreadyStored, paymentInput as any)
			) {
				return sendBillingPaymentScopeError(
					reply,
					409,
					"Клиентская операция уже записала другую оплату. Повтор должен совпадать по сумме, счету, чеку, плательщику и коду вычета.",
				);
			}
			return reply.code(200).send(paymentSchema.parse(alreadyStored));
		}
	}
	throw error;
}
