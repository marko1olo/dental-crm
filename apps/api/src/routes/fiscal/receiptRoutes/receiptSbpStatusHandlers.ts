/**
 * receiptSbpStatusHandlers.ts — SBP Dynamic QR Status & Manual Confirmation Handler.
 */

import { kopecksToRub, parseKopecks } from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	fiscalReceiptQueue,
	idempotencyKeys,
	patientInvoices,
	payments,
	sberbankTransactions,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { sbpStatusInputSchema } from "./types.js";

/**
 * GET /api/fiscal/sbp-status & POST /api/fiscal/sbp-status (also /api/payments/status)
 * Fast status verification for SBP dynamic QR payments & Tag 1081.
 */
export async function handleSbpStatus(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const parsedQuery = sbpStatusInputSchema.safeParse(request.query || {});
	const parsedBody = sbpStatusInputSchema.safeParse(request.body || {});
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные query-параметры статуса оплаты СБП.",
			details: parsedQuery.error.issues,
		});
	}
	if (!parsedBody.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры тела запроса статуса оплаты СБП.",
			details: parsedBody.error.issues,
		});
	}
	const query = parsedQuery.data;
	const body = parsedBody.data;

	const orderId = (body.orderId || query.orderId)?.trim();
	const qrId = (body.qrId || query.qrId)?.trim();
	const invoiceId = (body.invoiceId || query.invoiceId)?.trim();
	const paymentId = (body.paymentId || query.paymentId)?.trim();
	const isConfirmManual =
		body.action === "confirm_manual" ||
		query.action === "confirm_manual" ||
		query.confirm === "true";
	const isMutation = request.method.toUpperCase() === "POST" || isConfirmManual;

	const ctx = isMutation
		? await requireClinicalMutationContext(request, reply, "sbp status confirm")
		: await requireClinicalReadContext(request, reply, "sbp status query");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const rawMutationId =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined) ||
		body.clientMutationId ||
		query.clientMutationId;
	const clientMutationId = rawMutationId?.trim();
	const baseMutationId = clientMutationId?.includes("#")
		? clientMutationId.split("#")[0]
		: clientMutationId;

	if (isMutation) {
		if (!clientMutationId || !isValidUuid(baseMutationId || "")) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Для подтверждения оплаты СБП требуется валидный UUID/UUIDv7 в заголовке Idempotency-Key.",
			});
		}
	}

	return await withTenantCtx(orgId, async (tx) => {
		if (clientMutationId) {
			const [existingKey] = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, clientMutationId),
					),
				)
				.limit(1);
			if (existingKey && existingKey.status === "completed" && existingKey.responseBody) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply
					.code(existingKey.responseCode || 200)
					.send(existingKey.responseBody);
			}
		}

		let isPaid = false;
		let resolvedOrderId = orderId || qrId || invoiceId || null;
		let resolvedPaymentId: string | null = paymentId || null;
		let resolvedFiscalReceiptId: string | null = null;
		let amountKopecks: number | null = null;
		let paidAtIso: string | null = null;

		// 1. Check sberbankTransactions by orderId or qrId
		if (orderId || qrId || clientMutationId) {
			const txConds = [
				orderId ? eq(sberbankTransactions.orderId, orderId) : undefined,
				qrId ? eq(sberbankTransactions.orderId, qrId) : undefined,
				clientMutationId ? eq(sberbankTransactions.orderId, clientMutationId) : undefined,
			].filter((c): c is NonNullable<typeof c> => Boolean(c));

			const txRows =
				txConds.length > 0
					? await tx
							.select()
							.from(sberbankTransactions)
							.where(and(eq(sberbankTransactions.organizationId, orgId), or(...txConds)))
							.limit(1)
					: [];

			const sbTx = txRows[0];
			if (sbTx) {
				resolvedOrderId = sbTx.orderId;
				amountKopecks = Number(sbTx.amountKopecks);
				if (sbTx.status === "paid" || sbTx.status === "completed" || sbTx.status === "PAID") {
					isPaid = true;
					paidAtIso = (sbTx.updatedAt || sbTx.createdAt).toISOString();
				} else if (isConfirmManual) {
					await tx
						.update(sberbankTransactions)
						.set({ status: "paid", updatedAt: new Date() })
						.where(
							and(
								eq(sberbankTransactions.id, sbTx.id),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);
					isPaid = true;
					paidAtIso = new Date().toISOString();
				}
			}
		}

		// 2. Check payments table
		if (!isPaid && (paymentId || orderId || clientMutationId)) {
			const isUuid = Boolean(paymentId && isValidUuid(paymentId));
			const paymentConds = [
				isUuid && paymentId ? eq(payments.id, paymentId) : undefined,
				clientMutationId ? eq(payments.clientMutationId, clientMutationId) : undefined,
				orderId ? sql`strpos(coalesce(${payments.note}, ''), ${orderId}) > 0` : undefined,
			].filter((c): c is NonNullable<typeof c> => Boolean(c));

			const paymentRows =
				paymentConds.length > 0
					? await tx
							.select()
							.from(payments)
							.where(and(eq(payments.organizationId, orgId), or(...paymentConds)))
							.limit(1)
					: [];

			const p = paymentRows[0];
			if (p) {
				resolvedPaymentId = p.id;
				if (p.status === "paid") {
					isPaid = true;
					paidAtIso = p.paidAt ? p.paidAt.toISOString() : p.createdAt.toISOString();
					amountKopecks =
						p.amountKopecks !== null && p.amountKopecks !== undefined && p.amountKopecks !== 0n
							? Number(p.amountKopecks)
							: parseKopecks(p.amountRub);
					if (p.fiscalReceiptNumber) {
						resolvedFiscalReceiptId = p.fiscalReceiptNumber;
					}
				}
			}
		}

		// 3. Check patientInvoices table (only with valid UUID to avoid 22P02 Postgres errors)
		if (!isPaid && (invoiceId || orderId)) {
			const invTarget = invoiceId || orderId;
			if (invTarget && isValidUuid(invTarget)) {
				const invRows = await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.organizationId, orgId),
							eq(patientInvoices.id, invTarget),
						),
					)
					.limit(1);

				const inv = invRows[0];
				if (inv) {
					const invKop =
						inv.totalPriceKopecks > 0n
							? Number(inv.totalPriceKopecks)
							: parseKopecks(inv.totalAmountRub || inv.totalRub || 0);
					amountKopecks = invKop;

					if (inv.status === "paid") {
						isPaid = true;
						paidAtIso = inv.paidAt ? inv.paidAt.toISOString() : new Date().toISOString();
					} else if (isConfirmManual) {
						const now = new Date();
						const [insertedPay] = await tx
							.insert(payments)
							.values({
								organizationId: orgId,
								patientId: inv.patientId,
								visitId: inv.visitId ?? null,
								documentId: inv.id,
								amountRub: kopecksToRub(invKop),
								amountKopecks: BigInt(invKop),
								method: "online",
								status: "paid",
								clientMutationId: clientMutationId ?? null,
								paidAt: now,
								note: `Ручное подтверждение оплаты СБП по счёту ${inv.id}`,
							})
							.onConflictDoNothing()
							.returning({ id: payments.id });

						if (insertedPay) {
							resolvedPaymentId = insertedPay.id;
							const [queuedReceipt] = await tx
								.insert(fiscalReceiptQueue)
								.values({
									organizationId: orgId,
									paymentId: insertedPay.id,
									visitId: inv.visitId ?? null,
									receiptType: "income",
									status: "pending_print",
									payloadJson: {
										receiptType: "income",
										amountKopecks: invKop,
										amountRub: kopecksToRub(invKop),
										sbpKopecks: invKop,
										method: "online",
										patientId: inv.patientId,
										invoiceId: inv.id,
									},
									retryCount: 0,
								})
								.returning({ id: fiscalReceiptQueue.id });
							if (queuedReceipt) {
								resolvedFiscalReceiptId = queuedReceipt.id;
							}
						}

						await tx
							.update(patientInvoices)
							.set({ status: "paid", paidAt: now })
							.where(
								and(
									eq(patientInvoices.id, inv.id),
									eq(patientInvoices.organizationId, orgId),
								),
							);
						isPaid = true;
						paidAtIso = now.toISOString();
					}
				}
			}
		}

		// 4. Check fiscalReceiptQueue for emitted receipts
		if (resolvedPaymentId || resolvedOrderId) {
			const queueConds = [
				resolvedPaymentId ? eq(fiscalReceiptQueue.paymentId, resolvedPaymentId) : undefined,
				resolvedOrderId
					? sql`(${fiscalReceiptQueue.payloadJson}->>'orderId' = ${resolvedOrderId} OR ${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${resolvedOrderId})`
					: undefined,
			].filter((c): c is NonNullable<typeof c> => Boolean(c));

			const queueRows =
				queueConds.length > 0
					? await tx
							.select()
							.from(fiscalReceiptQueue)
							.where(and(eq(fiscalReceiptQueue.organizationId, orgId), or(...queueConds)))
							.limit(1)
					: [];

			const q = queueRows[0];
			if (q) {
				resolvedFiscalReceiptId = q.id;
				if ((q.status as string) === "completed" || q.status === "printed") {
					isPaid = true;
					paidAtIso = q.printedAt ? q.printedAt.toISOString() : q.createdAt.toISOString();
				}
			}
		}

		if (isConfirmManual && !isPaid) {
			return reply.code(404).send({
				error: "PaymentTargetNotFound",
				message: "Платёж или счёт СБП не найден в клинике для подтверждения.",
			});
		}

		const responseData: Record<string, unknown> = {
			success: true,
			paid: isPaid,
			status: isPaid ? "paid" : "pending",
			orderId: resolvedOrderId,
			qrId: qrId || null,
			paymentId: resolvedPaymentId,
			fiscalReceiptId: resolvedFiscalReceiptId,
			amountKopecks,
			amountRub: amountKopecks !== null ? kopecksToRub(amountKopecks) : null,
			paidAt: paidAtIso,
			method: "sbp_qr",
		};

		if (isMutation && clientMutationId) {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: clientMutationId,
					status: "completed",
					responseBody: responseData,
					responseCode: 200,
				})
				.onConflictDoNothing();
		}

		return reply.status(200).send(responseData);
	});
}
