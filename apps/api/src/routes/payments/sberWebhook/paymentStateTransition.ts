import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, or, sql } from "drizzle-orm";
import { Fiscal54FzService } from "../../../services/billing/fiscal54fzService.js";
import { kopecksToRubles, sumKopecks } from "@dental/shared";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	patientInvoices,
	payments,
	sberbankTransactions,
	visits,
} from "../../../db/schema.js";
import { namedDevelopmentModeActive } from "../../../accessGuard.js";
import { verifySberPosWebhookChecksum } from "./signatureVerifier.js";
import type { SberPosTransactionStatus } from "./types.js";

/**
 * Reconciles invoice balance and updates invoice status atomically within a tenant transaction.
 */
export async function reconcileInvoiceBalanceInDb(
	tx: Parameters<Parameters<typeof withTenantCtx>[1]>[0],
	organizationId: string,
	invoiceId: string,
): Promise<{
	invoiceTotalKopecks: number;
	paidKopecks: number;
	remainingKopecks: number;
	isFullyPaid: boolean;
}> {
	const [invoice] = await tx
		.select()
		.from(patientInvoices)
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.id, invoiceId),
			),
		)
		.for("update")
		.limit(1);

	if (!invoice) {
		return {
			invoiceTotalKopecks: 0,
			paidKopecks: 0,
			remainingKopecks: 0,
			isFullyPaid: false,
		};
	}

	const rawTotal = invoice.totalAmountRub || invoice.totalRub || "0";
	const invoiceTotalKopecks = Fiscal54FzService.rubToKopecks(Number(rawTotal));

	// Find all paid payments linked to this patient and visit/document
	const invoicePayments = await tx
		.select({
			amountRub: payments.amountRub,
			amountKopecks: payments.amountKopecks,
			status: payments.status,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				eq(payments.patientId, invoice.patientId),
				eq(payments.status, "paid"),
				invoice.visitId ? eq(payments.visitId, invoice.visitId) : sql`TRUE`,
			),
		);

	const paidKopecks = sumKopecks(
		invoicePayments.map((p) =>
			p.amountKopecks !== null && p.amountKopecks !== undefined
				? Number(p.amountKopecks)
				: Fiscal54FzService.rubToKopecks(p.amountRub),
		),
	);

	const remainingKopecks = Math.max(0, invoiceTotalKopecks - paidKopecks);
	const isFullyPaid = paidKopecks >= invoiceTotalKopecks;

	await tx
		.update(patientInvoices)
		.set({
			status: isFullyPaid ? "paid" : paidKopecks > 0 ? "partially_paid" : "draft",
			paidAt: isFullyPaid ? new Date() : invoice.paidAt,
		})
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.id, invoiceId),
			),
		);

	return {
		invoiceTotalKopecks,
		paidKopecks,
		remainingKopecks,
		isFullyPaid,
	};
}

export const webhookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
	const secret =
		process.env.SBERBANK_POS_WEBHOOK_SECRET ||
		process.env.SBERBANK_WEBHOOK_SECRET ||
		process.env.DENTE_WEBHOOK_SECRET ||
		process.env.SBERBANK_SECRET_KEY;

	if (!secret && !namedDevelopmentModeActive()) {
		return reply.status(503).send({
			error: "WebhookSecretNotConfigured",
			message:
				"Приём уведомлений от POS-терминалов Сбербанка временно недоступен: защищенный ключ не настроен.",
		});
	}

	const body = (request.body as Record<string, unknown> | null) ?? {};
	const query = (request.query as Record<string, unknown> | null) ?? {};
	const payload: Record<string, unknown> = { ...query, ...body };

	const incomingChecksum =
		(typeof payload.checksum === "string" ? payload.checksum : undefined) ||
		(typeof payload.sign === "string" ? payload.sign : undefined) ||
		(typeof payload.signature === "string" ? payload.signature : undefined) ||
		(typeof request.headers["x-sberbank-signature"] === "string"
			? request.headers["x-sberbank-signature"]
			: undefined) ||
		(typeof request.headers["x-dente-webhook-secret"] === "string"
			? request.headers["x-dente-webhook-secret"]
			: undefined);

	if (!incomingChecksum) {
		return reply.status(400).send({
			error: "MissingChecksum",
			message: "Параметр подписи/контрольной суммы (checksum) отсутствует в теле вебхука.",
		});
	}

	const effectiveSecret =
		secret || (namedDevelopmentModeActive() ? "dev-sberbank-pos-secret" : "");

	const isValidSignature = verifySberPosWebhookChecksum(
		payload,
		effectiveSecret,
		incomingChecksum,
	);

	if (!isValidSignature) {
		return reply.status(401).send({
			error: "InvalidChecksum",
			message: "Неверная криптографическая подпись вебхука Сбербанк POS.",
		});
	}

	const orderId =
		(typeof payload.orderId === "string" ? payload.orderId : undefined) ||
		(typeof payload.mdOrder === "string" ? payload.mdOrder : undefined) ||
		(typeof payload.orderNumber === "string" ? payload.orderNumber : undefined) ||
		(typeof payload.terminalTxId === "string" ? payload.terminalTxId : undefined);

	if (!orderId) {
		return reply.status(400).send({
			error: "MissingOrderId",
			message: "Параметр orderId отсутствует в запросе.",
		});
	}

	// Find transaction in superuser bypass first to discover tenant context
	const targetTx = await withSuperuserBypass(async (tx) => {
		const [found] = await tx
			.select()
			.from(sberbankTransactions)
			.where(eq(sberbankTransactions.orderId, String(orderId)))
			.limit(1);
		return found;
	});

	if (!targetTx) {
		return reply.status(404).send({
			error: "TransactionNotFound",
			message: `Транзакция с orderId '${orderId}' не найдена.`,
		});
	}

	const result = await withTenantCtx(targetTx.organizationId, async (tx) => {
		const [lockedTx] = await tx
			.select()
			.from(sberbankTransactions)
			.where(
				and(
					eq(sberbankTransactions.orderId, String(orderId)),
					eq(sberbankTransactions.organizationId, targetTx.organizationId),
				),
			)
			.for("update")
			.limit(1);

		if (!lockedTx) {
			return {
				statusCode: 404,
				body: {
					error: "TransactionNotFound",
					message: "Транзакция не найдена в контексте организации.",
				},
			};
		}

		// Validate incoming amount in kopecks if provided
		if (payload.amount !== undefined && payload.amount !== null) {
			const incomingKopecks = Number(payload.amount);
			if (!Number.isNaN(incomingKopecks) && BigInt(Math.round(incomingKopecks)) !== lockedTx.amountKopecks) {
				request.log.warn(
					{ orderId, expected: Number(lockedTx.amountKopecks), received: incomingKopecks },
					"[SberPosWebhook] Amount mismatch detected",
				);
				return {
					statusCode: 400,
					body: {
						error: "AmountMismatch",
						message: "Сумма в уведомлении не совпадает с суммой зарегистрированной транзакции.",
					},
				};
			}
		}

		// Pessimistically lock payments row for this order (both sberpos: and sberbank: prefixes)
		const clientMutationId = `sberpos:${lockedTx.orderId}`;
		const [lockedPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, targetTx.organizationId),
					or(
						eq(payments.clientMutationId, clientMutationId),
						eq(payments.clientMutationId, `sberbank:${lockedTx.orderId}`),
					),
				),
			)
			.for("update")
			.limit(1);

		const rawStatus = String(
			payload.status ?? payload.operation ?? payload.actionCode ?? "SETTLED",
		).toUpperCase();

		// 1. REFUND / REVERSAL HANDLING
		if (
			rawStatus === "REFUNDED" ||
			rawStatus === "REVERSED" ||
			rawStatus === "4" ||
			rawStatus === "UNHOLD"
		) {
			const nextStatus: SberPosTransactionStatus =
				rawStatus === "REFUNDED" ? "REFUNDED" : "REVERSED";

			await tx
				.update(sberbankTransactions)
				.set({ status: nextStatus, updatedAt: new Date() })
				.where(
					and(
						eq(sberbankTransactions.id, lockedTx.id),
						eq(sberbankTransactions.organizationId, lockedTx.organizationId),
					),
				);

			if (nextStatus === "REFUNDED" || nextStatus === "REVERSED") {
				await tx
					.update(payments)
					.set({ status: "refunded", updatedAt: new Date() })
					.where(
						and(
							eq(payments.organizationId, lockedTx.organizationId),
							or(
								eq(payments.clientMutationId, clientMutationId),
								eq(payments.clientMutationId, `sberbank:${lockedTx.orderId}`),
							),
						),
					);
			}

			return {
				statusCode: 200,
				body: {
					success: true,
					processed: true,
					status: nextStatus,
					orderId: lockedTx.orderId,
				},
			};
		}

		// 2. AUTHORIZATION (HOLD) HANDLING
		if (rawStatus === "AUTHORIZED" || rawStatus === "APPROVED" || rawStatus === "1") {
			await tx
				.update(sberbankTransactions)
				.set({ status: "AUTHORIZED", updatedAt: new Date() })
				.where(
					and(
						eq(sberbankTransactions.id, lockedTx.id),
						eq(sberbankTransactions.organizationId, lockedTx.organizationId),
					),
				);

			return {
				statusCode: 200,
				body: {
					success: true,
					processed: true,
					status: "AUTHORIZED",
					orderId: lockedTx.orderId,
				},
			};
		}

		// 3. SETTLED / SUCCESS / DEPOSITED (FINAL CHARGE)
		const isSettled =
			rawStatus === "SETTLED" ||
			rawStatus === "SUCCESS" ||
			rawStatus === "DEPOSITED" ||
			rawStatus === "PAID" ||
			rawStatus === "2" ||
			rawStatus === "0";

		if (isSettled) {
			const isAlreadyProcessed =
				lockedTx.status === "SETTLED" ||
				lockedTx.status.toLowerCase() === "success" ||
				lockedTx.status.toLowerCase() === "paid" ||
				(lockedPayment !== undefined && lockedPayment.status === "paid");

			if (isAlreadyProcessed) {
				return {
					statusCode: 200,
					body: {
						success: true,
						processed: false,
						reason: "already_processed",
						status: "SETTLED",
						paymentId: lockedPayment?.id,
						orderId: lockedTx.orderId,
					},
				};
			}

			await tx
				.update(sberbankTransactions)
				.set({ status: "SETTLED", updatedAt: new Date() })
				.where(
					and(
						eq(sberbankTransactions.id, lockedTx.id),
						eq(sberbankTransactions.organizationId, lockedTx.organizationId),
					),
				);

			const amountRub = kopecksToRubles(lockedTx.amountKopecks);

			// Insert ledger payment with explicit amountKopecks (Mandate 8bm)
			const [newPayment] = await tx
				.insert(payments)
				.values({
					organizationId: lockedTx.organizationId,
					patientId: lockedTx.patientId,
					visitId: lockedTx.visitId ? lockedTx.visitId : null,
					documentId: lockedTx.documentId ? lockedTx.documentId : null,
					method: "card",
					status: "paid",
					amountRub,
					amountKopecks: lockedTx.amountKopecks,
					paidAt: new Date(),
					clientMutationId,
					note: `Оплата через Sberbank POS / SberPay (транзакция ${lockedTx.orderId})`,
				})
				.onConflictDoNothing({
					target: [payments.organizationId, payments.clientMutationId],
				})
				.returning();

			// Automatically mark generated document as issued
			if (lockedTx.documentId) {
				await tx
					.update(generatedDocuments)
					.set({ status: "issued", issuedAt: new Date() })
					.where(
						and(
							eq(generatedDocuments.id, lockedTx.documentId),
							eq(generatedDocuments.organizationId, lockedTx.organizationId),
							eq(generatedDocuments.status, "draft"),
						),
					);
			}

			// Touch visit timestamp
			if (lockedTx.visitId) {
				await tx
					.update(visits)
					.set({ updatedAt: new Date() })
					.where(
						and(
							eq(visits.id, lockedTx.visitId),
							eq(visits.organizationId, lockedTx.organizationId),
						),
					);
			}

			// Reconcile patient invoice balance if invoiceId is attached
			if (lockedTx.invoiceId) {
				await reconcileInvoiceBalanceInDb(
					tx,
					lockedTx.organizationId,
					lockedTx.invoiceId,
				);
			}

			// Enqueue 54-FZ statutory receipt in fiscal queue
			const fiscalReceiptPayload = Fiscal54FzService.buildStatutoryFiscalReceipt({
				organizationId: lockedTx.organizationId,
				patientId: lockedTx.patientId,
				customerContact:
					(typeof payload.customerContact === "string" ? payload.customerContact : undefined) ||
					"cardholder@clinic.ru",
				cashierFullName: "Кассир-администратор",
				operationType: "income",
				defaultCalculationMethod: "full_payment",
				tenderSplits: {
					electronicCardRub: amountRub,
				},
				positions: [
					{
						name:
							(typeof payload.serviceTitle === "string" ? payload.serviceTitle : undefined) ||
							"Медицинские стоматологические услуги",
						priceRub: amountRub,
						quantity: 1,
						medicalServiceCode804n:
							(typeof payload.medicalServiceCode804n === "string"
								? payload.medicalServiceCode804n
								: undefined) || null,
						subject: "service",
						method: "full_payment",
						vatRate: "vat_none",
					},
				],
				visitId: lockedTx.visitId,
				documentId: lockedTx.documentId,
				invoiceId: lockedTx.invoiceId,
				clientMutationId,
			});

			await tx.insert(fiscalReceiptQueue).values({
				organizationId: lockedTx.organizationId,
				paymentId: newPayment?.id || lockedPayment?.id || null,
				visitId: lockedTx.visitId || null,
				receiptType: "income",
				status: "pending_print",
				payloadJson: {
					...fiscalReceiptPayload,
					tag1020_totalRub: fiscalReceiptPayload.tag1020_totalRubString,
				},
				retryCount: 0,
			});

			return {
				statusCode: 200,
				body: {
					success: true,
					processed: true,
					status: "SETTLED",
					paymentId: newPayment?.id || lockedPayment?.id,
					amountKopecks: Number(lockedTx.amountKopecks),
					amountRub,
					orderId: lockedTx.orderId,
				},
			};
		}

		// 4. FAILED / DECLINED
		await tx
			.update(sberbankTransactions)
			.set({ status: "FAILED", updatedAt: new Date() })
			.where(
				and(
					eq(sberbankTransactions.id, lockedTx.id),
					eq(sberbankTransactions.organizationId, lockedTx.organizationId),
				),
			);

		return {
			statusCode: 200,
			body: {
				success: true,
				processed: true,
				status: "FAILED",
				orderId: lockedTx.orderId,
			},
		};
	});

	return reply.status(result.statusCode).send(result.body);
};
