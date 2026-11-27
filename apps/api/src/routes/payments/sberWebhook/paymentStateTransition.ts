import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, or } from "drizzle-orm";
import { kopecksToRubles } from "@dental/shared";
import { withSuperuserBypass, withTenantCtx } from "../../../db/rls.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	payments,
	sberbankTransactions,
	visits,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { applyAcquiringCashboxLedgerInTx } from "../../cashbox/cashlessAcquiringLedger.js";
import { reconcileInvoiceBalanceInDb } from "../../billingRoutes/invoiceBalanceReconciler.js";
import { verifyAndResolveAcquiringWebhook } from "../../sberbankRoutes/acquiringWebhookSecurity.js";
import {
	acquireSberTxAdvisoryLock,
	findUniqueSberbankTxInTenant,
	isSberSettledOrPaid,
	isSberTerminalRefundedOrReversed,
	reconcileAcquiringRefundInDb,
} from "../../sberbankRoutes/sberbankUtils.js";
import type { SberPosTransactionStatus } from "./types.js";

export { reconcileInvoiceBalanceInDb };

export const webhookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
	const verified = await verifyAndResolveAcquiringWebhook(
		request,
		reply,
		"sber_pos",
	);
	if (!verified.ok) return;
	const { orderId, payload } = verified;

	// Find transaction in superuser bypass first to discover tenant context
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

	const result = await withTenantCtx(targetTx.organizationId, async (tx) => {
		await acquireSberTxAdvisoryLock(tx, targetTx.organizationId, String(orderId));
		const lockedLookup = await findUniqueSberbankTxInTenant(
			tx,
			targetTx.organizationId,
			String(orderId),
			true,
		);
		if (lockedLookup.kind === "ambiguous") {
			return {
				statusCode: 409,
				body: {
					error: "AmbiguousOrderId",
					message: "Обнаружено несколько транзакций с одинаковым orderId.",
				},
			};
		}
		if (lockedLookup.kind === "not_found") {
			return {
				statusCode: 404,
				body: {
					error: "TransactionNotFound",
					message: "Транзакция не найдена в контексте организации.",
				},
			};
		}
		const lockedTx = lockedLookup.txRow;

		// Validate incoming amount in kopecks if provided
		if (payload.amount !== undefined && payload.amount !== null) {
			const incomingKopecks = Number(payload.amount);
			if (!Number.isFinite(incomingKopecks) || !Number.isInteger(incomingKopecks) || incomingKopecks <= 0) {
				return {
					statusCode: 400,
					body: {
						error: "InvalidAmount",
						message: "Сумма в уведомлении должна быть положительным целым числом копеек.",
					},
				};
			}
			if (BigInt(incomingKopecks) !== lockedTx.amountKopecks) {
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
			if (
				(isSberTerminalRefundedOrReversed(lockedTx.status) ||
					lockedPayment?.status === "refunded") &&
				lockedPayment?.status !== "paid"
			) {
				return {
					statusCode: 200,
					body: {
						success: true,
						processed: false,
						reason: "already_refunded",
						status: lockedTx.status,
						orderId: lockedTx.orderId,
					},
				};
			}

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
				const refundTargetPayment = lockedPayment;
				const existingFiscalReceipt =
					refundTargetPayment?.fiscalReceipt &&
					typeof refundTargetPayment.fiscalReceipt === "object"
						? refundTargetPayment.fiscalReceipt
						: {};

				await tx
					.update(payments)
					.set({
						status: "refunded",
						fiscalReceipt: {
							...existingFiscalReceipt,
							refundedInPlace: true,
						},
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(payments.organizationId, lockedTx.organizationId),
							or(
								eq(payments.clientMutationId, clientMutationId),
								eq(payments.clientMutationId, `sberbank:${lockedTx.orderId}`),
							),
						),
					);

				await reconcileAcquiringRefundInDb(tx, lockedTx.organizationId, {
					invoiceId: lockedTx.invoiceId,
					visitId: lockedTx.visitId,
				});

				if (refundTargetPayment && refundTargetPayment.status === "paid") {
					const refundKopecks =
						refundTargetPayment.amountKopecks !== null && refundTargetPayment.amountKopecks > 0n
							? Number(refundTargetPayment.amountKopecks)
							: Number(lockedTx.amountKopecks);

					await applyAcquiringCashboxLedgerInTx(tx, {
						organizationId: lockedTx.organizationId,
						direction: "refund",
						amountKopecks: refundKopecks,
						paymentMethod: "card",
						patientId: lockedTx.patientId,
						paymentId: refundTargetPayment.id,
						invoiceId: lockedTx.invoiceId,
						reasonText: `Возврат оплаты Sberbank POS (${lockedTx.orderId})`,
						sourceTag: clientMutationId,
					});

					const refundFfdPayload = FiscalReceiptFactory.buildFfd12Receipt({
						patientId: lockedTx.patientId,
						visitId: lockedTx.visitId || undefined,
						documentId: lockedTx.documentId || undefined,
						invoiceId: lockedTx.invoiceId || undefined,
						clientMutationId: `${clientMutationId}:return`,
						customerContact:
							(typeof payload.customerContact === "string" ? payload.customerContact : undefined) ||
							"cardholder@clinic.ru",
						cashierFullName: "Кассир-администратор",
						operationType: "income_return",
						taxationSystem: "usn_income",
						electronicCardKopecks: refundKopecks,
						totalKopecks: refundKopecks,
						items: [
							{
								name: "Возврат оплаты медицинских стоматологических услуг",
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
						paymentId: refundTargetPayment.id,
						visitId: lockedTx.visitId || null,
						receiptType: "income_return",
						status: "pending_print",
						payloadJson: {
							...refundFfdPayload,
							clientMutationId: `${clientMutationId}:return`,
							orderId: lockedTx.orderId,
							invoiceId: lockedTx.invoiceId,
						},
						retryCount: 0,
					});
				}
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
			if (isSberTerminalRefundedOrReversed(lockedTx.status) || lockedPayment?.status === "refunded") {
				const txUpper = lockedTx.status.toUpperCase();
				return {
					statusCode: 200,
					body: {
						success: true,
						processed: false,
						reason: "already_refunded",
						status: txUpper === "REVERSED" ? "REVERSED" : "REFUNDED",
						orderId: lockedTx.orderId,
					},
				};
			}

			if (isSberSettledOrPaid(lockedTx.status) || lockedPayment?.status === "paid") {
				return {
					statusCode: 200,
					body: {
						success: true,
						processed: false,
						reason: "already_processed",
						status: lockedTx.status,
						paymentId: lockedPayment?.id,
						orderId: lockedTx.orderId,
					},
				};
			}

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
				isSberTerminalRefundedOrReversed(lockedTx.status) ||
				lockedPayment?.status === "refunded"
			) {
				const currentUpper = lockedTx.status.toUpperCase();
				return {
					statusCode: 200,
					body: {
						success: true,
						processed: false,
						reason: "already_refunded",
						status: currentUpper === "REVERSED" ? "REVERSED" : "REFUNDED",
						paymentId: lockedPayment?.id,
						orderId: lockedTx.orderId,
					},
				};
			}

			const isAlreadyProcessed =
				isSberSettledOrPaid(lockedTx.status) ||
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
					documentId:
						lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)
							? lockedTx.invoiceId
							: lockedTx.documentId || null,
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
			if (lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)) {
				await reconcileInvoiceBalanceInDb(
					tx,
					lockedTx.organizationId,
					lockedTx.invoiceId,
				);
			}

			// Only enqueue 54-FZ receipt & sync cashless shift ledger if payment row was genuinely created
			if (newPayment) {
				const amountKopNum = Number(lockedTx.amountKopecks);
				await applyAcquiringCashboxLedgerInTx(tx, {
					organizationId: lockedTx.organizationId,
					direction: "income",
					amountKopecks: amountKopNum,
					paymentMethod: "card",
					patientId: lockedTx.patientId,
					paymentId: newPayment.id,
					invoiceId: lockedTx.invoiceId,
					reasonText: `Оплата через Sberbank POS / SberPay (${lockedTx.orderId})`,
					sourceTag: clientMutationId,
				});

				const ffdPayload = FiscalReceiptFactory.buildFfd12Receipt({
					patientId: lockedTx.patientId,
					visitId: lockedTx.visitId || undefined,
					documentId: lockedTx.documentId || undefined,
					invoiceId: lockedTx.invoiceId || undefined,
					clientMutationId,
					customerContact:
						(typeof payload.customerContact === "string" ? payload.customerContact : undefined) ||
						"cardholder@clinic.ru",
					cashierFullName: "Кассир-администратор",
					operationType: "income",
					taxationSystem: "usn_income",
					electronicCardKopecks: amountKopNum,
					totalKopecks: amountKopNum,
					items: [
						{
							name:
								(typeof payload.serviceTitle === "string" ? payload.serviceTitle : undefined) ||
								"Медицинские стоматологические услуги",
							priceKopecks: amountKopNum,
							quantity: 1,
							amountKopecks: amountKopNum,
							medicalServiceCode804n:
								(typeof payload.medicalServiceCode804n === "string"
									? payload.medicalServiceCode804n
									: undefined) || null,
							subject: "service",
							method: "full_payment",
							vatRate: "vat_none",
							measure: "piece",
						},
					],
				});

				await tx.insert(fiscalReceiptQueue).values({
					organizationId: lockedTx.organizationId,
					paymentId: newPayment.id,
					visitId: lockedTx.visitId || null,
					receiptType: "income",
					status: "pending_print",
					payloadJson: {
						...ffdPayload,
						clientMutationId,
						orderId: lockedTx.orderId,
						invoiceId: lockedTx.invoiceId,
					},
					retryCount: 0,
				});
			}

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

		// 4. FAILED / DECLINED — never overwrite terminal refunded/reversed or already settled/paid state
		if (isSberTerminalRefundedOrReversed(lockedTx.status) || lockedPayment?.status === "refunded") {
			return {
				statusCode: 200,
				body: {
					success: true,
					processed: false,
					reason: "already_refunded",
					status: lockedTx.status,
					orderId: lockedTx.orderId,
				},
			};
		}
		if (isSberSettledOrPaid(lockedTx.status) || lockedPayment?.status === "paid") {
			return {
				statusCode: 200,
				body: {
					success: true,
					processed: false,
					reason: "already_processed",
					status: lockedTx.status,
					paymentId: lockedPayment?.id,
					orderId: lockedTx.orderId,
				},
			};
		}

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
