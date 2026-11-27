import { kopecksToRubles, rublesToKopecks, sumKopecks } from "@dental/shared";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantReadCtx } from "../../../db/rls.js";
import { installmentContracts, patientInvoices, payments } from "../../../db/schema.js";
import { handleCreatePayment } from "./paymentCreateHandler.js";

const invoicePayParamsSchema = z
	.object({
		id: z.string().uuid("Некорректный идентификатор счёта (ожидается UUID)."),
	})
	.strict();

export async function invoicePayHandler(
	request: FastifyRequest<{ Params: { id: string }; Body: Record<string, unknown> }>,
	reply: FastifyReply,
) {
	const paramsParsed = invoicePayParamsSchema.safeParse(request.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "BillingValidationError",
			message: "Некорректный идентификатор счёта (ожидается UUID).",
		});
	}
	const invoiceId = paramsParsed.data.id;
	const body =
		request.body && typeof request.body === "object"
			? (request.body as Record<string, unknown>)
			: {};
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
	let amountKopecks =
		typeof body.amountKopecks === "number" &&
		Number.isFinite(body.amountKopecks) &&
		Number.isInteger(body.amountKopecks) &&
		body.amountKopecks >= 0
			? body.amountKopecks
			: undefined;
	let amountRub =
		body.amountRub !== undefined
			? body.amountRub
			: amountKopecks !== undefined
				? kopecksToRubles(amountKopecks)
				: undefined;

	if (!patientId || (amountRub === undefined && amountKopecks === undefined)) {
		const resolved = await withTenantReadCtx(orgId, async (tx) => {
			const [invRow] = await tx
				.select({
					id: patientInvoices.id,
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
			if (!invRow) return null;

			const totalKop =
				invRow.totalPriceKopecks !== null && invRow.totalPriceKopecks > 0n
					? Number(invRow.totalPriceKopecks)
					: rublesToKopecks(Number(invRow.totalAmountRub ?? invRow.totalRub ?? 0));

			let useLegacyVisitFallback = false;
			if (invRow.visitId) {
				const [cntRow] = await tx
					.select({ cnt: sql<number>`count(*)::int` })
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, orgId),
							eq(patientInvoices.visitId, invRow.visitId),
						),
					);
				useLegacyVisitFallback = (cntRow?.cnt ?? 0) === 1;
			}

			const linkedContracts = await tx
				.select({ id: installmentContracts.id })
				.from(installmentContracts)
				.where(
					and(
						eq(installmentContracts.organizationId, orgId),
						eq(installmentContracts.patientId, invRow.patientId),
						sql`${installmentContracts.notes} like ${`%[invoice:${invRow.id}]%`}`,
					),
				);
			const linkedContractIds = linkedContracts.map((c) => c.id);

			const linkConditions = [eq(payments.documentId, invoiceId)];
			if (linkedContractIds.length > 0) {
				linkConditions.push(inArray(payments.documentId, linkedContractIds));
			}
			if (invRow.visitId && useLegacyVisitFallback) {
				const visitLegacyCond = and(eq(payments.visitId, invRow.visitId), isNull(payments.documentId));
				if (visitLegacyCond) {
					linkConditions.push(visitLegacyCond);
				}
			}

			const paidRows = await tx
				.select({
					amountKopecks: payments.amountKopecks,
					amountRub: payments.amountRub,
					status: payments.status,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.patientId, invRow.patientId),
						or(eq(payments.status, "paid"), eq(payments.status, "refunded")),
						linkConditions.length === 1 ? linkConditions[0] : or(...linkConditions),
					),
				);

			const grossPaidKop = sumKopecks(
				paidRows
					.filter((p) => p.status === "paid")
					.map((p) =>
						p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks > 0n
							? Number(p.amountKopecks)
							: rublesToKopecks(Number(p.amountRub ?? 0)),
					),
			);
			const negRefundKop = sumKopecks(
				paidRows
					.filter((p) => p.status === "refunded")
					.map((p) => {
						if (p.amountKopecks != null && p.amountKopecks < 0n) {
							return Math.abs(Number(p.amountKopecks));
						}
						const rubNum = Number(p.amountRub ?? 0);
						return p.amountKopecks == null && rubNum < 0 ? Math.abs(rublesToKopecks(rubNum)) : 0;
					}),
			);
			const netPaidKop = Math.max(0, grossPaidKop - negRefundKop);
			return {
				patientId: invRow.patientId,
				remainingKopecks: Math.max(0, totalKop - netPaidKop),
			};
		});

		if (resolved) {
			if (!patientId) patientId = resolved.patientId;
			if (amountKopecks === undefined && amountRub === undefined) {
				amountKopecks = resolved.remainingKopecks;
				amountRub = kopecksToRubles(resolved.remainingKopecks);
			}
		}
	}

	const paymentPayload: Record<string, unknown> = {
		...body,
		documentId: body.documentId || invoiceId,
		clientMutationId: mutationId,
		...(patientId ? { patientId } : {}),
		...(amountKopecks !== undefined ? { amountKopecks } : {}),
		...(amountRub !== undefined ? { amountRub } : {}),
	};
	return handleCreatePayment(request, reply, paymentPayload);
}
