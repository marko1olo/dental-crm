import { kopecksToRubles } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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
	isSberPendingOrHeld,
	isSberSettledOrPaid,
	isSberTerminalRefundedOrReversed,
	mapSberbankOrderStatus,
	reconcileAcquiringRefundInDb,
} from "./sberbankUtils.js";
import { sberbankStatusFastifySchema, sberbankStatusParamsSchema } from "./types.js";

export async function registerSberbankStatusRoutes(app: FastifyInstance): Promise<void> {
	app.get(
		"/api/sberbank/status/:orderId",
		{
			...sberbankStatusFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;
			const paramsParsed = sberbankStatusParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор заказа.",
					details: paramsParsed.error.issues,
				});
			}
			const { orderId } = paramsParsed.data;
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return;

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			try {
				const sberStatus = await client.getOrderStatusExtended(orderId);
				const mappedStatus = mapSberbankOrderStatus(sberStatus.orderStatus);

				const lookup = await withTenantReadCtx(orgId, async (tx) => {
					return findUniqueSberbankTxInTenant(tx, orgId, orderId, false);
				});

				if (lookup.kind === "ambiguous") {
					return reply.status(409).send({
						error: "AmbiguousOrderId",
						message: "Обнаружено несколько транзакций с одинаковым orderId.",
					});
				}
				if (lookup.kind === "not_found") {
					return reply.status(404).send({
						error: "TransactionNotFound",
						message: "Транзакция оплаты Сбербанк не найдена.",
					});
				}

				return {
					success: true,
					status: mappedStatus,
					recordedStatus: lookup.txRow.status,
					amount: Number(lookup.txRow.amountKopecks),
				};
			} catch (error) {
				return reply.status(500).send({
					error: "SberbankError",
					message: error instanceof Error ? error.message : "Неизвестная ошибка",
				});
			}
		},
	);

	app.post(
		"/api/sberbank/status/:orderId",
		{
			...sberbankStatusFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;
			const paramsParsed = sberbankStatusParamsSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор заказа.",
					details: paramsParsed.error.issues,
				});
			}
			const { orderId } = paramsParsed.data;
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return;

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			try {
				const sberStatus = await client.getOrderStatusExtended(orderId);
				const mappedStatus = mapSberbankOrderStatus(sberStatus.orderStatus);

				return await withTenantWriteCtx(orgId, async (tx) => {
					await acquireSberTxAdvisoryLock(tx, orgId, orderId);

					const lookup = await findUniqueSberbankTxInTenant(tx, orgId, orderId, true);
					if (lookup.kind === "ambiguous") {
						return reply.status(409).send({
							error: "AmbiguousOrderId",
							message: "Обнаружено несколько транзакций с одинаковым orderId.",
						});
					}
					if (lookup.kind === "not_found") {
						return reply.status(404).send({
							error: "TransactionNotFound",
							message: "Транзакция оплаты Сбербанк не найдена.",
						});
					}
					const lockedTx = lookup.txRow;

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

					if (
						(isSberTerminalRefundedOrReversed(lockedTx.status) ||
							lockedPayment?.status === "refunded") &&
						mappedStatus !== "refunded"
					) {
						return {
							success: true,
							processed: false,
							reason: "already_refunded",
							status: lockedTx.status,
							amount: Number(lockedTx.amountKopecks),
						};
					}

					// Never roll back a settled/paid transaction back to pending, approved, or failed
					if (
						(isSberSettledOrPaid(lockedTx.status) || lockedPayment?.status === "paid") &&
						mappedStatus !== "success" &&
						mappedStatus !== "refunded"
					) {
						return {
							success: true,
							processed: false,
							reason: "already_processed",
							status: lockedTx.status,
							amount: Number(lockedTx.amountKopecks),
						};
					}

					if (mappedStatus === "refunded") {
						if (
							(isSberTerminalRefundedOrReversed(lockedTx.status) ||
								lockedPayment?.status === "refunded") &&
							lockedPayment?.status !== "paid"
						) {
							return {
								success: true,
								processed: false,
								reason: "already_refunded",
								status: lockedTx.status,
								amount: Number(lockedTx.amountKopecks),
							};
						}

						await tx
							.update(sberbankTransactions)
							.set({ status: "refunded", updatedAt: new Date() })
							.where(
								and(
									eq(sberbankTransactions.id, lockedTx.id),
									eq(sberbankTransactions.organizationId, orgId),
								),
							);

						if (lockedPayment && lockedPayment.status === "paid") {
							await tx
								.update(payments)
								.set({ status: "refunded", updatedAt: new Date() })
								.where(
									and(
										eq(payments.organizationId, orgId),
										eq(payments.id, lockedPayment.id),
									),
								);

							const refundKopecks =
								lockedPayment.amountKopecks !== null && lockedPayment.amountKopecks > 0n
									? Number(lockedPayment.amountKopecks)
									: Number(lockedTx.amountKopecks);

							await applyAcquiringCashboxLedgerInTx(tx, {
								organizationId: orgId,
								direction: "refund",
								amountKopecks: refundKopecks,
								paymentMethod: "card",
								patientId: lockedTx.patientId,
								paymentId: lockedPayment.id,
								invoiceId: lockedTx.invoiceId,
								reasonText: `Возврат оплаты Сбербанк (${orderId})`,
								sourceTag: `sberbank:${orderId}:status-refund`,
							});

							await enqueueSberbankFiscalReceiptInTx(tx, {
								organizationId: orgId,
								patientId: lockedTx.patientId,
								orderId: lockedTx.orderId,
								paymentId: lockedPayment.id,
								visitId: lockedTx.visitId,
								documentId: lockedTx.documentId,
								invoiceId: lockedTx.invoiceId,
								amountKopecks: refundKopecks,
								operationType: "income_return",
							});
						}

						await reconcileAcquiringRefundInDb(tx, orgId, {
							invoiceId: lockedTx.invoiceId,
							visitId: lockedTx.visitId,
						});

						return {
							success: true,
							status: "refunded",
							amount: Number(lockedTx.amountKopecks),
						};
					}

					if (mappedStatus !== lockedTx.status.toLowerCase()) {
						await tx
							.update(sberbankTransactions)
							.set({ status: mappedStatus, updatedAt: new Date() })
							.where(
								and(
									eq(sberbankTransactions.id, lockedTx.id),
									eq(sberbankTransactions.organizationId, orgId),
								),
							);

						if (
							isSberPendingOrHeld(lockedTx.status) &&
							mappedStatus === "success" &&
							!lockedPayment
						) {
							const amountRub = kopecksToRubles(lockedTx.amountKopecks);
							const [insertedPayment] = await tx
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
						}
					}

					return {
						success: true,
						status: mappedStatus,
						amount: Number(lockedTx.amountKopecks),
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
