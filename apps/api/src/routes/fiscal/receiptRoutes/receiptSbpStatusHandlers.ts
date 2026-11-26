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
import { type TenantDb, withTenantCtx } from "../../../db/rls.js";
import {
	fiscalReceiptQueue,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { applyAcquiringCashboxLedgerInTx } from "../../cashbox/cashlessAcquiringLedger.js";
import { reconcileInvoiceBalanceInDb } from "../../payments/sberWebhook/paymentStateTransition.js";
import { sbpStatusInputSchema } from "./types.js";

async function resolvePatientContactInTx(
	tx: TenantDb,
	orgId: string,
	patientId: string,
): Promise<string | null> {
	const [p] = await tx
		.select({ phone: patients.phone, email: patients.email })
		.from(patients)
		.where(and(eq(patients.organizationId, orgId), eq(patients.id, patientId)))
		.limit(1);
	const phone = p?.phone?.trim();
	if (phone) return phone;
	const email = p?.email?.trim();
	return email || null;
}

async function settleManualSbpPaymentInTx(params: {
	tx: TenantDb;
	orgId: string;
	patientId: string;
	visitId: string | null;
	invoiceId: string | null;
	amountKopecks: number;
	clientMutationId: string | undefined;
	sourceTag: string;
	note: string;
	now: Date;
}): Promise<{
	paymentId: string | null;
	fiscalReceiptId: string | null;
	isPaid: boolean;
	paidAtIso: string | null;
}> {
	const {
		tx,
		orgId,
		patientId,
		visitId,
		invoiceId,
		amountKopecks,
		clientMutationId,
		sourceTag,
		note,
		now,
	} = params;

	const [insertedPay] = await tx
		.insert(payments)
		.values({
			organizationId: orgId,
			patientId,
			visitId,
			documentId: invoiceId,
			amountRub: kopecksToRub(amountKopecks),
			amountKopecks: BigInt(amountKopecks),
			method: "online",
			status: "paid",
			clientMutationId: clientMutationId ?? null,
			paidAt: now,
			note,
		})
		.onConflictDoNothing({
			target: [payments.organizationId, payments.clientMutationId],
		})
		.returning({ id: payments.id });

	if (!insertedPay) {
		if (clientMutationId) {
			const [existingPay] = await tx
				.select({
					id: payments.id,
					status: payments.status,
					paidAt: payments.paidAt,
					createdAt: payments.createdAt,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.clientMutationId, clientMutationId),
					),
				)
				.limit(1);
			if (existingPay) {
				if (existingPay.status === "paid" && invoiceId && isValidUuid(invoiceId)) {
					await reconcileInvoiceBalanceInDb(tx, orgId, invoiceId);
				}
				return {
					paymentId: existingPay.id,
					fiscalReceiptId: null,
					isPaid: existingPay.status === "paid",
					paidAtIso:
						existingPay.status === "paid"
							? (existingPay.paidAt || existingPay.createdAt).toISOString()
							: null,
				};
			}
		}
		return {
			paymentId: null,
			fiscalReceiptId: null,
			isPaid: false,
			paidAtIso: null,
		};
	}

	await applyAcquiringCashboxLedgerInTx(tx, {
		organizationId: orgId,
		direction: "income",
		amountKopecks,
		paymentMethod: "online",
		patientId,
		paymentId: insertedPay.id,
		invoiceId,
		reasonText: note,
		sourceTag,
	});

	if (invoiceId && isValidUuid(invoiceId)) {
		await reconcileInvoiceBalanceInDb(tx, orgId, invoiceId);
	}

	const customerContact = await resolvePatientContactInTx(tx, orgId, patientId);
	const itemName = invoiceId
		? `Оплата медицинских услуг по СБП (счёт ${invoiceId.slice(0, 8)})`
		: "Оплата медицинских услуг по СБП";
	const sbpFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
		patientId,
		operationType: "income",
		taxationSystem: "usn_income",
		cashierFullName: "Кассир-администратор",
		customerContact,
		totalKopecks: amountKopecks,
		cashKopecks: 0,
		electronicCardKopecks: 0,
		sbpKopecks: amountKopecks,
		prepaidKopecks: 0,
		items: [
			{
				name: itemName,
				priceKopecks: amountKopecks,
				quantity: 1,
				amountKopecks,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		],
	});

	const [queuedReceipt] = await tx
		.insert(fiscalReceiptQueue)
		.values({
			organizationId: orgId,
			paymentId: insertedPay.id,
			visitId,
			receiptType: "income",
			status: "pending_print",
			payloadJson: {
				...sbpFfdPayload,
				method: "online",
				patientId,
				...(invoiceId ? { invoiceId } : {}),
				...(clientMutationId ? { clientMutationId } : {}),
			},
			retryCount: 0,
		})
		.returning({ id: fiscalReceiptQueue.id });

	return {
		paymentId: insertedPay.id,
		fiscalReceiptId: queuedReceipt?.id ?? null,
		isPaid: true,
		paidAtIso: now.toISOString(),
	};
}

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

	if (request.method.toUpperCase() === "GET" && isConfirmManual) {
		return reply.code(405).send({
			error: "MethodNotAllowed",
			message: "Для подтверждения оплаты СБП используйте POST /api/fiscal/sbp-status.",
		});
	}

	const isMutation = request.method.toUpperCase() === "POST";

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

			const txQuery = tx
				.select()
				.from(sberbankTransactions)
				.where(and(eq(sberbankTransactions.organizationId, orgId), or(...txConds)))
				.limit(1);
			const txRows =
				txConds.length > 0
					? await (isConfirmManual ? txQuery.for("update") : txQuery)
					: [];

			const sbTx = txRows[0];
			if (sbTx) {
				resolvedOrderId = sbTx.orderId;
				amountKopecks = Number(sbTx.amountKopecks);
				const sbStatusLower = sbTx.status.toLowerCase();
				if (sbStatusLower === "refunded" || sbStatusLower === "reversed") {
					if (isConfirmManual) {
						return reply.code(409).send({
							error: "SbpTransactionAlreadyRefunded",
							message: "Операция СБП уже возвращена и не может быть подтверждена повторно.",
						});
					}
				} else if (
					sbStatusLower === "success" ||
					sbStatusLower === "paid" ||
					sbStatusLower === "completed"
				) {
					isPaid = true;
					paidAtIso = (sbTx.updatedAt || sbTx.createdAt).toISOString();
				} else if (isConfirmManual) {
					const now = new Date();
					await tx
						.update(sberbankTransactions)
						.set({ status: "success", updatedAt: now })
						.where(
							and(
								eq(sberbankTransactions.id, sbTx.id),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);

					const sbAmountKop = Number(sbTx.amountKopecks);
					const settlement = await settleManualSbpPaymentInTx({
						tx,
						orgId,
						patientId: sbTx.patientId,
						visitId: sbTx.visitId ?? null,
						invoiceId:
							sbTx.invoiceId && isValidUuid(sbTx.invoiceId)
								? sbTx.invoiceId
								: null,
						amountKopecks: sbAmountKop,
						clientMutationId,
						sourceTag: clientMutationId || `sbp:${sbTx.orderId}`,
						note: sbTx.invoiceId
							? `Ручное подтверждение оплаты СБП по счёту ${sbTx.invoiceId} (${sbTx.orderId})`
							: `Ручное подтверждение оплаты СБП (${sbTx.orderId})`,
						now,
					});
					if (settlement.paymentId) {
						resolvedPaymentId = settlement.paymentId;
					}
					if (settlement.fiscalReceiptId) {
						resolvedFiscalReceiptId = settlement.fiscalReceiptId;
					}
					isPaid = settlement.isPaid;
					paidAtIso = settlement.paidAtIso;
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
						const settlement = await settleManualSbpPaymentInTx({
							tx,
							orgId,
							patientId: inv.patientId,
							visitId: inv.visitId ?? null,
							invoiceId: inv.id,
							amountKopecks: invKop,
							clientMutationId,
							sourceTag: clientMutationId || `sbp-invoice:${inv.id}`,
							note: `Ручное подтверждение оплаты СБП по счёту ${inv.id}`,
							now,
						});
						if (settlement.paymentId) {
							resolvedPaymentId = settlement.paymentId;
						}
						if (settlement.fiscalReceiptId) {
							resolvedFiscalReceiptId = settlement.fiscalReceiptId;
						}
						isPaid = settlement.isPaid;
						paidAtIso = settlement.paidAtIso;
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
				if (q.status === "printed" || String(q.status) === "completed") {
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

		return reply.status(200).send(responseData);
	});
}
