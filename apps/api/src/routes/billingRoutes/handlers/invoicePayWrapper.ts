import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { getDocumentForBilling } from "../../../db/billingQuery.js";
import { handleCreatePayment } from "./paymentCreateHandler.js";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function invoicePayHandler(
	request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
	reply: FastifyReply,
) {
	const invoiceId = request.params?.id;
	if (!invoiceId || !UUID_PATTERN.test(invoiceId.trim())) {
		return reply.code(400).send({
			error: "BillingValidationError",
			message: "Некорректный идентификатор счёта (ожидается UUID).",
		});
	}
	const body = request.body || {};
	const rawMutationId =
		typeof body.clientMutationId === "string" && body.clientMutationId.trim()
			? body.clientMutationId.trim()
			: typeof request.headers["idempotency-key"] === "string" &&
				  (request.headers["idempotency-key"] as string).trim()
				? (request.headers["idempotency-key"] as string).trim()
				: typeof request.headers["x-idempotency-key"] === "string" &&
					  (request.headers["x-idempotency-key"] as string).trim()
					? (request.headers["x-idempotency-key"] as string).trim()
					: null;

	if (!rawMutationId) {
		return reply.code(400).send({
			error: "IdempotencyKeyRequired",
			message:
				"Для проведения оплаты счёта обязателен уникальный ключ идемпотентности (заголовок Idempotency-Key или поле clientMutationId).",
		});
	}
	const mutationId = rawMutationId;
	let patientId = body.patientId;
	let amountRub = body.amountRub;
	if (!patientId || amountRub === undefined) {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"billing invoice payment",
		);
		if (orgId && invoiceId) {
			const resolvedDoc = await getDocumentForBilling(orgId, invoiceId);
			if (resolvedDoc) {
				if (!patientId && resolvedDoc.patientId) patientId = resolvedDoc.patientId;
				if (amountRub === undefined && resolvedDoc.totalAmountRub !== undefined) {
					amountRub = Number(resolvedDoc.totalAmountRub);
				}
			}
		}
	}
	request.body = {
		...body,
		documentId: body.documentId || invoiceId,
		clientMutationId: mutationId,
		...(patientId ? { patientId } : {}),
		...(amountRub !== undefined ? { amountRub } : {}),
	};
	return handleCreatePayment(request, reply);
}
