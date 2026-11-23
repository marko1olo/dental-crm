import { kopecksToNumericString, kopecksToRubles } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { namedDevelopmentModeActive } from "../../accessGuard.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	patientInvoices,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { Fiscal54FzService } from "../../services/billing/fiscal54fzService.js";
import { reconcileInvoiceBalanceInDb } from "../payments/sberWebhook/paymentStateTransition.js";
import { verifySberbankChecksum } from "./sberbankSecurityHelpers.js";

/**
 * Registers Sberbank acquiring asynchronous callback webhook endpoints:
 * - POST /api/sberbank/webhook: Gateway notification handling with checksum verification,
 *   idempotent processing, double-charge protection, and atomic payment registration.
 */
export async function registerSberbankWebhookRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/sberbank/webhook", async (request, reply) => {
		const secret =
			process.env.SBERBANK_WEBHOOK_SECRET ||
			process.env.DENTE_WEBHOOK_SECRET ||
			process.env.SBERBANK_SECRET_KEY;

		if (!secret) {
			if (!namedDevelopmentModeActive()) {
				return reply.status(503).send({
					error: "WebhookSecretNotConfigured",
					message:
						"Приём уведомлений от банка временно недоступен: клиника не подключила защищённую интеграцию. Обратитесь к администратору клиники.",
				});
			}
		}

		const body = (request.body as Record<string, unknown>) || {};
		const query = (request.query as Record<string, unknown>) || {};
		const payload = { ...query, ...body };

		const incomingChecksum =
			(payload.checksum as string) ||
			(payload.sign as string) ||
			(payload.signature as string) ||
			(request.headers["x-dente-webhook-secret"] as string) ||
			(request.headers["x-sberbank-signature"] as string);

		if (!incomingChecksum) {
			return reply.status(400).send({
				error: "MissingChecksum",
				message: "Параметр подписи/контрольной суммы (checksum) отсутствует.",
			});
		}

		const effectiveSecret =
			secret || (namedDevelopmentModeActive() ? "dev-sberbank-secret" : "");
		if (!effectiveSecret) {
			return reply.status(503).send({
				error: "WebhookSecretNotConfigured",
				message:
					"Приём уведомлений от банка временно недоступен: клиника не подключила защищённую интеграцию. Обратитесь к администратору клиники.",
			});
		}
		const isValidSignature = verifySberbankChecksum(
			payload,
			effectiveSecret,
			incomingChecksum,
		);

		if (!isValidSignature) {
			return reply.status(401).send({
				error: "InvalidChecksum",
				message: "Неверная подпись/контрольная сумма вебхука.",
			});
		}

		// Signature guard passed with ZERO DB calls so far.
		const orderId =
			(payload.orderId as string) ||
			(payload.mdOrder as string) ||
			(payload.orderNumber as string);

		if (!orderId) {
			return reply.status(400).send({
				error: "MissingOrderId",
				message: "Параметр orderId отсутствует в запросе.",
			});
		}

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

		return await withTenantCtx(targetTx.organizationId, async (tx) => {
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
				return reply.status(404).send({
					error: "TransactionNotFound",
					message: "Транзакция не найдена в контексте организации.",
				});
			}

			// Pessimistically lock payments row for this order (support both sberbank: and sberpos: mutations)
			const [lockedPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, targetTx.organizationId),
						or(
							eq(payments.clientMutationId, `sberbank:${lockedTx.orderId}`),
							eq(payments.clientMutationId, `sberpos:${lockedTx.orderId}`),
						),
					),
				)
				.for("update")
				.limit(1);

			// Validate incoming amount in kopecks if provided by gateway
			if (payload.amount !== undefined && payload.amount !== null) {
				const incomingKopecks = Number(payload.amount);
				if (!Number.isNaN(incomingKopecks) && BigInt(incomingKopecks) !== lockedTx.amountKopecks) {
					request.log.warn(
						{ orderId, expected: Number(lockedTx.amountKopecks), received: incomingKopecks },
						"[SberbankWebhook] Amount mismatch detected",
					);
					return reply.status(400).send({
						error: "AmountMismatch",
						message: "Сумма в уведомлении не совпадает с суммой зарегистрированного заказа.",
					});
				}
			}

			const operation = String(payload.operation ?? "").toLowerCase();
			const rawStatus = String(
				payload.status ?? payload.operation ?? payload.actionCode ?? "success",
			).toLowerCase();

			// 1. Refund operation handling
			if (operation === "refunded" || rawStatus === "refunded") {
				await tx
					.update(sberbankTransactions)
					.set({
						status: "refunded",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				if (lockedPayment) {
					await tx
						.update(payments)
						.set({
							status: "refunded",
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(payments.organizationId, lockedTx.organizationId),
								eq(payments.id, lockedPayment.id),
							),
						);
				}

				if (lockedTx.invoiceId) {
					await reconcileInvoiceBalanceInDb(
						tx,
						lockedTx.organizationId,
						lockedTx.invoiceId,
					);
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "refunded",
				});
			}

			// 2. Reversal (Unhold) handling
			if (operation === "reversed" || rawStatus === "reversed") {
				await tx
					.update(sberbankTransactions)
					.set({
						status: "reversed",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				if (lockedPayment) {
					await tx
						.update(payments)
						.set({
							status: "refunded",
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(payments.organizationId, lockedTx.organizationId),
								eq(payments.id, lockedPayment.id),
							),
						);
				}

				if (lockedTx.invoiceId) {
					await reconcileInvoiceBalanceInDb(
						tx,
						lockedTx.organizationId,
						lockedTx.invoiceId,
					);
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "reversed",
				});
			}

			// 3. Approved (Hold) handling
			if (operation === "approved" || rawStatus === "approved") {
				await tx
					.update(sberbankTransactions)
					.set({
						status: "approved",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "approved",
				});
			}

			// Prevent state machine inversion on terminal states
			if (lockedTx.status === "refunded" && operation !== "refunded") {
				return reply.status(200).send({
					success: true,
					processed: false,
					reason: "already_refunded",
					status: "refunded",
				});
			}

			// 4. Success / Deposited / Paid (Final Charge / Code 2)
			const isSuccess =
				operation === "deposited" ||
				operation === "paid" ||
				rawStatus === "success" ||
				rawStatus === "deposited" ||
				rawStatus === "paid" ||
				rawStatus === "2" ||
				rawStatus === "0";

			if (isSuccess) {
				const isAlreadyProcessed =
					lockedTx.status === "success" ||
					lockedTx.status === "SETTLED" ||
					(lockedPayment !== undefined && lockedPayment.status === "paid");

				if (isAlreadyProcessed) {
					return reply.status(200).send({
						success: true,
						processed: false,
						reason: "already_processed",
						status: "success",
						paymentId: lockedPayment?.id,
					});
				}

				await tx
					.update(sberbankTransactions)
					.set({
						status: "success",
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				const amountRub = kopecksToRubles(lockedTx.amountKopecks);
				const [insertedPayment] = await tx
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
						clientMutationId: `sberbank:${lockedTx.orderId}`,
						note: `Оплата через Сбербанк Эквайринг (заказ ${lockedTx.orderId})`,
					})
					.onConflictDoNothing({
						target: [payments.organizationId, payments.clientMutationId],
					})
					.returning();

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

				// 54-FZ statutory fiscal receipt queue registration
				try {
					const customerContact =
						(typeof payload.customerContact === "string" ? payload.customerContact : undefined) ||
						(typeof payload.email === "string" ? payload.email : undefined) ||
						(typeof payload.phone === "string" ? payload.phone : undefined) ||
						"cardholder@clinic.ru";

					const fiscalReceiptPayload = Fiscal54FzService.buildStatutoryFiscalReceipt({
						organizationId: lockedTx.organizationId,
						patientId: lockedTx.patientId,
						customerContact,
						cashierFullName: "Кассир-администратор",
						operationType: "income",
						defaultCalculationMethod: "full_payment",
						tenderSplits: {
							electronicCardRub: amountRub,
						},
						positions: [
							{
								name:
									(typeof payload.serviceTitle === "string"
										? payload.serviceTitle
										: undefined) ||
									`Оплата заказа №${lockedTx.orderId} (Сбербанк Эквайринг)`,
								priceRub: amountRub,
								quantity: 1,
								medicalServiceCode804n: null,
								subject: "service",
								method: "full_payment",
								vatRate: "vat_none",
							},
						],
						visitId: lockedTx.visitId,
						documentId: lockedTx.documentId,
						invoiceId: lockedTx.invoiceId,
						clientMutationId: `sberbank:${lockedTx.orderId}`,
					});

					await tx.insert(fiscalReceiptQueue).values({
						organizationId: lockedTx.organizationId,
						paymentId: insertedPayment?.id || lockedPayment?.id || null,
						visitId: lockedTx.visitId || null,
						receiptType: "income",
						status: "pending_print",
						payloadJson: {
							...fiscalReceiptPayload,
							tag1020_totalRub: fiscalReceiptPayload.tag1020_totalRubString,
						},
						retryCount: 0,
					});
				} catch (fiscalErr) {
					request.log.warn(
						{ fiscalErr, orderId: lockedTx.orderId },
						"[SberbankWebhook] Fiscal receipt enqueue skipped or warning",
					);
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "success",
					paymentId: insertedPayment?.id || lockedPayment?.id,
					amount: Number(lockedTx.amountKopecks),
				});
			}

			// 5. Failed / Declined
			await tx
				.update(sberbankTransactions)
				.set({
					status: "failed",
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(sberbankTransactions.id, lockedTx.id),
						eq(sberbankTransactions.organizationId, lockedTx.organizationId),
					),
				);

			return reply.status(200).send({
				success: true,
				processed: true,
				status: "failed",
			});
		});
	});
}
