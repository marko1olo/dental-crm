import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { getDocumentForBilling } from "../../../db/billingQuery.js";
import { handleCreatePayment } from "./paymentCreateHandler.js";

export async function invoicePayHandler(
	request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
	reply: FastifyReply,
) {
	const invoiceId = request.params?.id;
	const body = request.body || {};
	const mutationId =
		(typeof body.clientMutationId === "string" && body.clientMutationId.trim())
			? body.clientMutationId.trim()
			: (request.headers["idempotency-key"] as string | undefined)?.trim() || `pay-${invoiceId}-${Date.now()}`;
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
