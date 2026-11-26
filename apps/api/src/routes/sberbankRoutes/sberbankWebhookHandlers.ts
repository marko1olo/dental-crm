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
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { applyAcquiringCashboxLedgerInTx } from "../cashbox/cashlessAcquiringLedger.js";
import { reconcileInvoiceBalanceInDb } from "../billingRoutes/invoiceBalanceReconciler.js";
import { verifySberbankChecksum } from "./sberbankSecurityHelpers.js";
import {
	findUniqueSberbankTxInTenant,
	isSberSettledOrPaid,
	isSberTerminalRefundedOrReversed,
} from "./sberbankUtils.js";

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

		const lookupRows = await withSuperuserBypass(async (tx) => {
			return await tx
				.select()
				.from(sberbankTransactions)
				.where(eq(sberbankTransactions.orderId, String(orderId)))
				.limit(2);
		});

		if (lookupRows.length > 1) {
			return reply.status(409).send({
				error: "AmbiguousOrderId",
				message: "Обнаружено несколько транзакций с одинаковым orderId.",
			});
		}

		const targetTx = lookupRows[0];
		if (!targetTx) {
			return reply.status(404).send({
				error: "TransactionNotFound",
				message: `Транзакция с orderId '${orderId}' не найдена.`,
			});
		}

		return await withTenantCtx(targetTx.organizationId, async (tx) => {
			const lockedLookup = await findUniqueSberbankTxInTenant(
				tx,
				targetTx.organizationId,
				String(orderId),
				true,
			);
			if (lockedLookup.kind === "ambiguous") {
				return reply.status(409).send({
					error: "AmbiguousOrderId",
					message: "Обнаружено несколько транзакций с одинаковым orderId.",
				});
			}
			if (lockedLookup.kind === "not_found") {
				return reply.status(404).send({
					error: "TransactionNotFound",
					message: "Транзакция не найдена в контексте организации.",
				});
			}
			const lockedTx = lockedLookup.txRow;

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
				if (
					!Number.isFinite(incomingKopecks) ||
					!Number.isInteger(incomingKopecks) ||
					incomingKopecks <= 0
				) {
					return reply.status(400).send({
						error: "InvalidAmount",
						message: "Сумма в уведомлении должна быть положительным целым числом копеек.",
					});
				}
				if (BigInt(incomingKopecks) !== lockedTx.amountKopecks) {
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

			// 1 & 2. Refund or Reversal handling
			if (
				operation === "refunded" ||
				rawStatus === "refunded" ||
				operation === "reversed" ||
				rawStatus === "reversed"
			) {
				const terminalStatus =
					operation === "refunded" || rawStatus === "refunded"
						? ("refunded" as const)
						: ("reversed" as const);

				await tx
					.update(sberbankTransactions)
					.set({
						status: terminalStatus,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(sberbankTransactions.id, lockedTx.id),
							eq(sberbankTransactions.organizationId, lockedTx.organizationId),
						),
					);

				const wasPaidPayment = lockedPayment?.status === "paid";
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

					if (wasPaidPayment) {
						const refundKopecks =
							lockedPayment.amountKopecks !== null && lockedPayment.amountKopecks > 0n
								? Number(lockedPayment.amountKopecks)
								: Number(lockedTx.amountKopecks);

						await applyAcquiringCashboxLedgerInTx(tx, {
							organizationId: lockedTx.organizationId,
							direction: "refund",
							amountKopecks: refundKopecks,
							paymentMethod: "card",
							patientId: lockedTx.patientId,
							paymentId: lockedPayment.id,
							invoiceId: lockedTx.invoiceId,
							reasonText: `Возврат оплаты заказа №${lockedTx.orderId} (Сбербанк Эквайринг)`,
							sourceTag: `sberbank:${lockedTx.orderId}:refund`,
						});

						const refundFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
							patientId: lockedTx.patientId,
							visitId: lockedTx.visitId || undefined,
							documentId: lockedTx.documentId || undefined,
							invoiceId: lockedTx.invoiceId || undefined,
							clientMutationId: `sberbank:${lockedTx.orderId}:return`,
							customerContact:
								(typeof payload.customerContact === "string"
									? payload.customerContact
									: undefined) || "cardholder@clinic.ru",
							cashierFullName: "Кассир-администратор",
							operationType: "income_return",
							taxationSystem: "usn_income",
							electronicCardKopecks: refundKopecks,
							totalKopecks: refundKopecks,
							items: [
								{
									name: `Возврат оплаты заказа №${lockedTx.orderId} (Сбербанк Эквайринг)`,
									priceKopecks: refundKopecks,
									quantity: 1,
									amountKopecks: refundKopecks,
									subject: "service",
									method: "full_payment",
									vatRate: "vat_none",
									measure: "piece",
								},
							],
						});
						await tx.insert(fiscalReceiptQueue).values({
							organizationId: lockedTx.organizationId,
							paymentId: lockedPayment.id,
							visitId: lockedTx.visitId || null,
							receiptType: "income_return",
							status: "pending_print",
							payloadJson: {
								...refundFfdPayload,
								clientMutationId: `sberbank:${lockedTx.orderId}:return`,
								orderId: lockedTx.orderId,
								invoiceId: lockedTx.invoiceId,
							},
							retryCount: 0,
						});
					}
				}

				if (lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)) {
					await reconcileInvoiceBalanceInDb(
						tx,
						lockedTx.organizationId,
						lockedTx.invoiceId,
					);
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: terminalStatus,
				});
			}

			// Prevent state machine inversion on terminal states (case-insensitive + payment status check)
			if (
				isSberTerminalRefundedOrReversed(lockedTx.status) ||
				lockedPayment?.status === "refunded"
			) {
				const lockedStatusLower = lockedTx.status.toLowerCase();
				return reply.status(200).send({
					success: true,
					processed: false,
					reason: "already_refunded",
					status: lockedStatusLower === "reversed" ? "reversed" : "refunded",
				});
			}

			// 3. Approved (Hold) handling — forbid downgrading already-settled/paid transaction
			if (operation === "approved" || rawStatus === "approved") {
				if (isSberSettledOrPaid(lockedTx.status) || lockedPayment?.status === "paid") {
					return reply.status(200).send({
						success: true,
						processed: false,
						reason: "already_processed",
						status: lockedTx.status,
						paymentId: lockedPayment?.id,
					});
				}

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
					isSberSettledOrPaid(lockedTx.status) ||
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
						documentId:
							lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)
								? lockedTx.invoiceId
								: lockedTx.documentId || null,
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
				if (lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)) {
					await reconcileInvoiceBalanceInDb(
						tx,
						lockedTx.organizationId,
						lockedTx.invoiceId,
					);
				}

				if (insertedPayment) {
					const amountKopNum = Number(lockedTx.amountKopecks);
					await applyAcquiringCashboxLedgerInTx(tx, {
						organizationId: lockedTx.organizationId,
						direction: "income",
						amountKopecks: amountKopNum,
						paymentMethod: "card",
						patientId: lockedTx.patientId,
						paymentId: insertedPayment.id,
						invoiceId: lockedTx.invoiceId,
						reasonText: `Оплата через Сбербанк Эквайринг (заказ ${lockedTx.orderId})`,
						sourceTag: `sberbank:${lockedTx.orderId}`,
					});

					const customerContact =
						(typeof payload.customerContact === "string" ? payload.customerContact : undefined) ||
						(typeof payload.email === "string" ? payload.email : undefined) ||
						(typeof payload.phone === "string" ? payload.phone : undefined) ||
						"cardholder@clinic.ru";

					const ffdPayload = FiscalReceiptFactory.buildFfd12Receipt({
						patientId: lockedTx.patientId,
						visitId: lockedTx.visitId || undefined,
						documentId: lockedTx.documentId || undefined,
						invoiceId: lockedTx.invoiceId || undefined,
						clientMutationId: `sberbank:${lockedTx.orderId}`,
						customerContact,
						cashierFullName: "Кассир-администратор",
						operationType: "income",
						taxationSystem: "usn_income",
						electronicCardKopecks: amountKopNum,
						totalKopecks: amountKopNum,
						items: [
							{
								name:
									(typeof payload.serviceTitle === "string"
										? payload.serviceTitle
										: undefined) ||
									`Оплата заказа №${lockedTx.orderId} (Сбербанк Эквайринг)`,
								priceKopecks: amountKopNum,
								quantity: 1,
								amountKopecks: amountKopNum,
								subject: "service",
								method: "full_payment",
								vatRate: "vat_none",
								measure: "piece",
							},
						],
					});

					await tx.insert(fiscalReceiptQueue).values({
						organizationId: lockedTx.organizationId,
						paymentId: insertedPayment.id,
						visitId: lockedTx.visitId || null,
						receiptType: "income",
						status: "pending_print",
						payloadJson: {
							...ffdPayload,
							clientMutationId: `sberbank:${lockedTx.orderId}`,
							orderId: lockedTx.orderId,
							invoiceId: lockedTx.invoiceId,
						},
						retryCount: 0,
					});
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "success",
					paymentId: insertedPayment?.id || lockedPayment?.id,
					amount: Number(lockedTx.amountKopecks),
				});
			}

			// 5. Failed / Declined — never roll back already settled/paid transaction
			if (isSberSettledOrPaid(lockedTx.status) || lockedPayment?.status === "paid") {
				return reply.status(200).send({
					success: true,
					processed: false,
					reason: "already_processed",
					status: lockedTx.status,
					paymentId: lockedPayment?.id,
				});
			}

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
