import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { Fiscal54FzService } from "../../../services/billing/fiscal54fzService.js";
import { sumKopecks } from "@dental/shared";
import { db } from "../../../db/client.js";
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
 * Reconciles invoice balance and updates invoice status atomically
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

	const invoiceTotalKopecks = Fiscal54FzService.rubToKopecks(
		invoice.totalAmountRub || Number(invoice.totalRub),
	);

	// Find all paid payments linked to this patient and visit/document
	const invoicePayments = await tx
		.select({
			amountRub: payments.amountRub,
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
		invoicePayments.map((p) => Fiscal54FzService.rubToKopecks(p.amountRub)),
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

	const body = (request.body as Record<string, unknown>) || {};
	const query = (request.query as Record<string, unknown>) || {};
	const payload = { ...query, ...body };

	const incomingChecksum =
		(payload.checksum as string) ||
		(payload.sign as string) ||
		(payload.signature as string) ||
		(request.headers["x-sberbank-signature"] as string) ||
		(request.headers["x-dente-webhook-secret"] as string);

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
		(payload.orderId as string) ||
		(payload.mdOrder as string) ||
		(payload.orderNumber as string) ||
		(payload.terminalTxId as string);

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
			if (!Number.isNaN(incomingKopecks) && incomingKopecks !== lockedTx.amount) {
				request.log.warn(
					{ orderId, expected: lockedTx.amount, received: incomingKopecks },
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

		// Pessimistically lock payments row for this order
		const clientMutationId = `sberpos:${lockedTx.orderId}`;
		const [lockedPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, targetTx.organizationId),
					eq(payments.clientMutationId, clientMutationId),
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

			if (nextStatus === "REFUNDED") {
				await tx
					.update(payments)
					.set({ status: "refunded", updatedAt: new Date() })
					.where(
						and(
							eq(payments.organizationId, lockedTx.organizationId),
							eq(payments.clientMutationId, clientMutationId),
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
			if (
				lockedTx.status === "SETTLED" ||
				(lockedPayment && lockedPayment.status === "paid")
			) {
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

			const amountRub = Fiscal54FzService.kopecksToRub(lockedTx.amount);

			// Insert ledger payment
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
				customerContact: (payload.customerContact as string) || "cardholder@clinic.ru",
				cashierFullName: "Кассир-администратор",
				operationType: "income",
				defaultCalculationMethod: "full_payment",
				tenderSplits: {
					electronicCardRub: amountRub,
				},
				positions: [
					{
						name: (payload.serviceTitle as string) || "Медицинские стоматологические услуги",
						priceRub: amountRub,
						quantity: 1,
						medicalServiceCode804n: (payload.medicalServiceCode804n as string) || null,
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
				} as unknown as Record<string, unknown>,
				retryCount: 0,
			});

			return {
				statusCode: 200,
				body: {
					success: true,
					processed: true,
					status: "SETTLED",
					paymentId: newPayment?.id || lockedPayment?.id,
					amountKopecks: lockedTx.amount,
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
