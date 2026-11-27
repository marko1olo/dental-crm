import { kopecksToRubles } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	generatedDocuments,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { requirePermission } from "../../security/permissions.js";
import { SberbankClient } from "../../services/sberbankClient.js";
import { applyAcquiringCashboxLedgerInTx } from "../cashbox/cashlessAcquiringLedger.js";
import { reconcileInvoiceBalanceInDb } from "../billingRoutes/invoiceBalanceReconciler.js";
import {
	acquireSberTxAdvisoryLock,
	enqueueSberbankFiscalReceiptInTx,
	findUniqueSberbankTxInTenant,
	isSberSettledOrPaid,
	isSberTerminalRefundedOrReversed,
	reconcileAcquiringRefundInDb,
} from "./sberbankUtils.js";
import {
	sberbankCancelReconcileBodySchema,
	sberbankCancelReconcileFastifySchema,
} from "./types.js";

/**
 * POST /api/sberbank/cancel-or-reconcile
 * Prevents Double-Charge vulnerability on timeout / modal close:
 * 1. Reads preflight state in short DB tx, then performs Sberbank HTTP outside PG tx (DEF-03).
 * 2. If paid (Code 2) and not already refunded, settles payment atomically.
 * 3. If pending/authorized (Code 0, 1) or forceReverse, reverses at gateway OUTSIDE PG tx, then persists reversal.
 */
export async function registerSberbankCancelReconcileRoute(app: FastifyInstance): Promise<void> {
	app.post(
		"/api/sberbank/cancel-or-reconcile",
		{
			...sberbankCancelReconcileFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return;

			const parsed = sberbankCancelReconcileBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры для отмены/сверки заказа.",
					details: parsed.error.issues,
				});
			}

			const { orderId, forceReverse } = parsed.data;

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message: "Платёжный шлюз Сбербанка не настроен.",
				});
			}

			try {
				const preflightLookup = await withTenantReadCtx(orgId, async (tx) => {
					return findUniqueSberbankTxInTenant(tx, orgId, orderId, false);
				});

				if (preflightLookup.kind === "ambiguous") {
					return reply.status(409).send({
						error: "AmbiguousOrderId",
						message: "Обнаружено несколько транзакций с одинаковым orderId.",
					});
				}
				if (preflightLookup.kind === "not_found") {
					return reply.status(404).send({
						error: "TransactionNotFound",
						message: `Транзакция Сбербанк с orderId '${orderId}' не найдена.`,
					});
				}

				const sberStatus = await client.getOrderStatusExtended(orderId);
				const code = sberStatus.orderStatus;

				const shouldReverseExternally =
					code === 0 || code === 1 || (code !== 2 && code !== 4 && Boolean(forceReverse));
				if (shouldReverseExternally) {
					try {
						await client.reverseOrder(orderId);
					} catch (reverseErr) {
						request.log.warn({ orderId, err: reverseErr }, "[Sberbank] Reversal warning");
					}
				}

				return await withTenantWriteCtx(orgId, async (tx) => {
					await acquireSberTxAdvisoryLock(tx, orgId, orderId);
					const lockedLookup = await findUniqueSberbankTxInTenant(tx, orgId, orderId, true);
					if (lockedLookup.kind === "ambiguous") {
						return reply.status(409).send({
							error: "AmbiguousOrderId",
							message: "Обнаружено несколько транзакций с одинаковым orderId.",
						});
					}
					if (lockedLookup.kind === "not_found") {
						return reply.status(404).send({
							error: "TransactionNotFound",
							message: `Транзакция Сбербанк с orderId '${orderId}' не найдена.`,
						});
					}
					const lockedTx = lockedLookup.txRow;

					const [lockedPayment] = await tx
						.select()
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								or(
									eq(payments.clientMutationId, `sberbank:${orderId}`),
									eq(payments.clientMutationId, `sberpos:${orderId}`),
								),
							),
						)
						.for("update")
						.limit(1);

					// 1. Transaction was actually PAID by card right before/during timeout (Code 2)
					if (code === 2) {
						if (
							isSberTerminalRefundedOrReversed(lockedTx.status) ||
							lockedPayment?.status === "refunded"
						) {
							return {
								success: true,
								processed: false,
								reason: "already_refunded",
								status: lockedTx.status,
								message: "Транзакция уже возвращена/отменена.",
							};
						}

						await tx
							.update(sberbankTransactions)
							.set({ status: "success", updatedAt: new Date() })
							.where(
								and(
									eq(sberbankTransactions.id, lockedTx.id),
									eq(sberbankTransactions.organizationId, orgId),
								),
							);

						const amountRub = kopecksToRubles(lockedTx.amountKopecks);
						let insertedPayment: typeof payments.$inferSelect | undefined;
						if (!lockedPayment) {
							const [inserted] = await tx
								.insert(payments)
								.values({
									organizationId: orgId,
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
									clientMutationId: `sberbank:${orderId}`,
									note: `Оплата через Сбербанк Эквайринг (заказ ${orderId})`,
								})
								.onConflictDoNothing({
									target: [payments.organizationId, payments.clientMutationId],
								})
								.returning();
							insertedPayment = inserted;
						}

						if (lockedTx.documentId) {
							await tx
								.update(generatedDocuments)
								.set({ status: "issued", issuedAt: new Date() })
								.where(
									and(
										eq(generatedDocuments.id, lockedTx.documentId),
										eq(generatedDocuments.organizationId, orgId),
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
										eq(visits.organizationId, orgId),
									),
								);
						}

						if (lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)) {
							await reconcileInvoiceBalanceInDb(tx, orgId, lockedTx.invoiceId);
						}

						if (insertedPayment) {
							await applyAcquiringCashboxLedgerInTx(tx, {
								organizationId: orgId,
								direction: "income",
								amountKopecks: lockedTx.amountKopecks,
								paymentMethod: "card",
								patientId: lockedTx.patientId,
								paymentId: insertedPayment.id,
								invoiceId: lockedTx.invoiceId,
								reasonText: `Оплата через Сбербанк Эквайринг (заказ ${orderId})`,
								sourceTag: `sberbank:${orderId}`,
							});

							await enqueueSberbankFiscalReceiptInTx(tx, {
								organizationId: orgId,
								patientId: lockedTx.patientId,
								orderId: lockedTx.orderId,
								paymentId: insertedPayment.id,
								visitId: lockedTx.visitId,
								documentId: lockedTx.documentId,
								invoiceId: lockedTx.invoiceId,
								amountKopecks: lockedTx.amountKopecks,
								operationType: "income",
							});
						}

						return {
							success: true,
							status: "paid",
							amountRub,
							message: "Оплата картой была успешно списана банком. Альтернативный прием средств отменен.",
						};
					}

					// 2. Transaction is Pending (Code 0) or Approved / Held (Code 1) -> Persist Reversal
					if (code === 0 || code === 1 || forceReverse) {
						if (
							isSberTerminalRefundedOrReversed(lockedTx.status) &&
							lockedPayment?.status !== "paid"
						) {
							return {
								success: true,
								processed: false,
								reason: "already_refunded",
								status: lockedTx.status,
								message: "Транзакция уже возвращена/отменена.",
							};
						}

						await tx
							.update(sberbankTransactions)
							.set({ status: "reversed", updatedAt: new Date() })
							.where(
								and(
									eq(sberbankTransactions.id, lockedTx.id),
									eq(sberbankTransactions.organizationId, orgId),
								),
							);

						if (lockedPayment) {
							const wasPaidPayment = lockedPayment.status === "paid";
							await tx
								.update(payments)
								.set({ status: "refunded", updatedAt: new Date() })
								.where(
									and(
										eq(payments.organizationId, orgId),
										eq(payments.id, lockedPayment.id),
									),
								);

							if (wasPaidPayment) {
								const revKopecks =
									lockedPayment.amountKopecks !== null && lockedPayment.amountKopecks > 0n
										? lockedPayment.amountKopecks
										: lockedTx.amountKopecks;

								await applyAcquiringCashboxLedgerInTx(tx, {
									organizationId: orgId,
									direction: "refund",
									amountKopecks: revKopecks,
									paymentMethod: "card",
									patientId: lockedTx.patientId,
									paymentId: lockedPayment.id,
									invoiceId: lockedTx.invoiceId,
									reasonText: `Реверс заказа Сбербанк (${lockedTx.orderId})`,
									sourceTag: `sberbank:${lockedTx.orderId}:reverse`,
								});

								await enqueueSberbankFiscalReceiptInTx(tx, {
									organizationId: orgId,
									patientId: lockedTx.patientId,
									orderId: lockedTx.orderId,
									paymentId: lockedPayment.id,
									visitId: lockedTx.visitId,
									documentId: lockedTx.documentId,
									invoiceId: lockedTx.invoiceId,
									amountKopecks: revKopecks,
									operationType: "income_return",
								});
							}
						}

						await reconcileAcquiringRefundInDb(tx, orgId, {
							invoiceId: lockedTx.invoiceId,
							visitId: lockedTx.visitId,
						});

						return {
							success: true,
							status: "reversed",
							message: "Транзакция в банке успешно отменена (реверс). Двойное списание предотвращено.",
						};
					}

					// 3. Declined or Refunded
					const mappedStatus = code === 4 ? "refunded" : "failed";
					if (
						mappedStatus === "failed" &&
						(isSberTerminalRefundedOrReversed(lockedTx.status) ||
							isSberSettledOrPaid(lockedTx.status) ||
							lockedPayment?.status === "paid" ||
							lockedPayment?.status === "refunded")
					) {
						return {
							success: true,
							processed: false,
							reason: isSberTerminalRefundedOrReversed(lockedTx.status)
								? "already_refunded"
								: "already_processed",
							status: lockedTx.status,
							message: "Транзакция уже проведена или возвращена.",
						};
					}

					await tx
						.update(sberbankTransactions)
						.set({ status: mappedStatus, updatedAt: new Date() })
						.where(
							and(
								eq(sberbankTransactions.id, lockedTx.id),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);

					return {
						success: true,
						status: mappedStatus,
						message: "Транзакция не проведена банком.",
					};
				});
			} catch (error) {
				return reply.status(500).send({
					error: "SberbankError",
					message: error instanceof Error ? error.message : "Неизвестная ошибка",
				});
			}
		},
	);
}
