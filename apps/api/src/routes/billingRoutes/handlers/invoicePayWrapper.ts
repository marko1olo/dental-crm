import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { getDocumentForBilling } from "../../../db/billingQuery.js";
import { withTenantCtx } from "../../../db/rls.js";
import { patientInvoices, payments } from "../../../db/schema.js";
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
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing invoice payment",
	);
	if (reply.sent || !orgId) return reply;

	let patientId = body.patientId;
	let amountRub =
		body.amountRub !== undefined
			? body.amountRub
			: typeof body.amountKopecks === "number" &&
				  Number.isFinite(body.amountKopecks) &&
				  Number.isInteger(body.amountKopecks) &&
				  body.amountKopecks >= 0
				? kopecksToRubles(body.amountKopecks)
				: undefined;
	if (!patientId || amountRub === undefined) {
		const resolvedDoc = await getDocumentForBilling(orgId, invoiceId);
		if (resolvedDoc) {
			if (!patientId && resolvedDoc.patientId) patientId = resolvedDoc.patientId;
			if (amountRub === undefined && resolvedDoc.totalAmountRub !== undefined) {
				const remainingKopecks = await withTenantCtx(orgId, async (tx) => {
					const [invRow] = await tx
						.select({
							totalPriceKopecks: patientInvoices.totalPriceKopecks,
							totalAmountRub: patientInvoices.totalAmountRub,
							totalRub: patientInvoices.totalRub,
							visitId: patientInvoices.visitId,
							patientId: patientInvoices.patientId,
						})
						.from(patientInvoices)
						.where(
							and(
								eq(patientInvoices.organizationId, orgId),
								eq(patientInvoices.id, invoiceId),
							),
						)
						.limit(1);
					if (!invRow) {
						return rublesToKopecks(Number(resolvedDoc.totalAmountRub));
					}
					const totalKop =
						invRow.totalPriceKopecks !== null && invRow.totalPriceKopecks > 0n
							? Number(invRow.totalPriceKopecks)
							: rublesToKopecks(Number(invRow.totalAmountRub ?? invRow.totalRub ?? resolvedDoc.totalAmountRub ?? 0));
					const paidRows = await tx
						.select({
							amountKopecks: payments.amountKopecks,
							amountRub: payments.amountRub,
						})
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.patientId, invRow.patientId),
								eq(payments.status, "paid"),
								invRow.visitId
									? or(eq(payments.documentId, invoiceId), eq(payments.visitId, invRow.visitId))
									: eq(payments.documentId, invoiceId),
							),
						);
					const paidKop = paidRows.reduce((acc, p) => {
						const rowKop =
							p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks > 0n
								? Number(p.amountKopecks)
								: rublesToKopecks(Number(p.amountRub ?? 0));
						return acc + rowKop;
					}, 0);
					return Math.max(0, totalKop - paidKop);
				});
				amountRub = kopecksToRubles(remainingKopecks);
			}
		}
	}
	const paymentPayload: Record<string, unknown> = {
		...body,
		documentId: body.documentId || invoiceId,
		clientMutationId: mutationId,
		...(patientId ? { patientId } : {}),
		...(amountRub !== undefined ? { amountRub } : {}),
	};
	return handleCreatePayment(request, reply, paymentPayload);
}
