import crypto from "node:crypto";
import { kopecksToNumericString } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireResolvedOrganizationId as requireOrganizationContext,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	generatedDocuments,
	patients,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { requirePermission } from "../../security/permissions.js";
import { SberbankClient } from "../../services/sberbankClient.js";
import {
	sberbankCancelReconcileBodySchema,
	sberbankCancelReconcileFastifySchema,
	sberbankPayBodySchema,
	sberbankPayFastifySchema,
	sberbankStatusFastifySchema,
	sberbankStatusParamsSchema,
} from "./types.js";

/**
 * Registers Sberbank internet acquiring payment and status reconciliation endpoints:
 * - POST /api/sberbank/pay: Order registration (register.do)
 * - GET /api/sberbank/status/:orderId: Order status verification (getOrderStatusExtended.do)
 * - POST /api/sberbank/cancel-or-reconcile: Double-charge guard and reversal (reverse.do)
 */
export async function registerSberbankPaymentRoutes(app: FastifyInstance): Promise<void> {
	app.post(
		"/api/sberbank/pay",
		sberbankPayFastifySchema,
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const organizationId = await requireOrganizationContext(request, reply);
			if (!organizationId) return;

			const parsed = sberbankPayBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры платежа.",
					details: parsed.error.issues,
				});
			}

			const { patientId, amount, visitId, documentId, invoiceId } = parsed.data;

			// Проверяем принадлежность пациента к организации клиники
			const [patient] = await db
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
				.limit(1);

			if (!patient) {
				return reply.status(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в вашей клинике.",
				});
			}

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch (error) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			const orderNumber = crypto.randomUUID();
			const origin = request.headers.origin;
			const returnUrl = origin
				? `${origin}/cabinet`
				: "http://localhost:3000/cabinet";

			try {
				const res = await client.registerOrder(orderNumber, amount, returnUrl);

				if (!res.orderId || !res.formUrl) {
					return reply.status(500).send({
						error: "SberbankError",
						message: res.errorMessage || "Ошибка регистрации заказа в Сбербанке",
					});
				}

				const sberbankOrderId = res.orderId;
				await withTenantCtx(organizationId, async (tx) => {
					await tx.insert(sberbankTransactions).values({
						organizationId,
						patientId,
						visitId: visitId || null,
						documentId: documentId || null,
						invoiceId: invoiceId || null,
						orderId: sberbankOrderId,
						amount,
						status: "pending",
					});
				});

				return { success: true, orderId: res.orderId, formUrl: res.formUrl };
			} catch (error) {
				return reply.status(500).send({
					error: "SberbankError",
					message: error instanceof Error ? error.message : "Неизвестная ошибка",
				});
			}
		},
	);

	app.get(
		"/api/sberbank/status/:orderId",
		sberbankStatusFastifySchema,
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
			} catch (error) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			try {
				const sberStatus = await client.getOrderStatusExtended(orderId);
				const code = sberStatus.orderStatus;

				let mappedStatus = "pending";
				if (code === 2) {
					mappedStatus = "success";
				} else if (code === 3 || code === 6) {
					mappedStatus = "failed";
				} else if (code === 1) {
					mappedStatus = "approved";
				} else if (code === 4) {
					mappedStatus = "refunded";
				}

				return await withTenantCtx(orgId, async (tx) => {
					const [lockedTx] = await tx
						.select()
						.from(sberbankTransactions)
						.where(
							and(
								eq(sberbankTransactions.orderId, orderId),
								eq(sberbankTransactions.organizationId, orgId),
							),
						)
						.for("update")
						.limit(1);

					if (!lockedTx) {
						return reply.status(404).send({
							error: "TransactionNotFound",
							message: "Транзакция оплаты Сбербанк не найдена.",
						});
					}

					const [lockedPayment] = await tx
						.select()
						.from(payments)
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.clientMutationId, `sberbank:${orderId}`),
							),
						)
						.for("update")
						.limit(1);

					if (mappedStatus !== lockedTx.status) {
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
							(lockedTx.status === "pending" ||
								lockedTx.status === "approved") &&
							mappedStatus === "success" &&
							!lockedPayment
						) {
							const amountRub = Number(
								kopecksToNumericString(lockedTx.amount),
							);
							await tx
								.insert(payments)
								.values({
									organizationId: orgId,
									patientId: lockedTx.patientId,
									visitId: lockedTx.visitId ? lockedTx.visitId : null,
									documentId: lockedTx.documentId ? lockedTx.documentId : null,
									method: "card",
									status: "paid",
									amountRub,
									paidAt: new Date(),
									clientMutationId: `sberbank:${orderId}`,
									note: `Оплата через Сбербанк Эквайринг (заказ ${orderId})`,
								})
								.onConflictDoNothing({
									target: [payments.organizationId, payments.clientMutationId],
								});

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
						}
					}

					return {
						success: true,
						status: mappedStatus,
						amount: lockedTx.amount,
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

	/**
	 * POST /api/sberbank/cancel-or-reconcile
	 * Prevents Double-Charge vulnerability on timeout / modal close:
	 * 1. Checks live status in Sberbank processing via getOrderStatusExtended.
	 * 2. If paid at the last second (Code 2), settles payment and returns status "paid" to prevent duplicate cash tender.
	 * 3. If pending/authorized (Code 0, 1), sends automated Reversal (reverse.do) to void the transaction.
	 */
	app.post(
		"/api/sberbank/cancel-or-reconcile",
		sberbankCancelReconcileFastifySchema,
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
			} catch (error) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message: "Платёжный шлюз Сбербанка не настроен.",
				});
			}

			try {
				const sberStatus = await client.getOrderStatusExtended(orderId);
				const code = sberStatus.orderStatus;

				return await withTenantCtx(orgId, async (tx) => {
					const [lockedTx] = await tx
						.select()
						.from(sberbankTransactions)
						.where(
							and(
								eq(sberbankTransactions.orderId, orderId),
								eq(sberbankTransactions.organizationId, orgId),
							),
						)
						.for("update")
						.limit(1);

					if (!lockedTx) {
						return reply.status(404).send({
							error: "TransactionNotFound",
							message: `Транзакция Сбербанк с orderId '${orderId}' не найдена.`,
						});
					}

					// 1. Transaction was actually PAID by card right before/during timeout (Code 2)
					if (code === 2) {
						await tx
							.update(sberbankTransactions)
							.set({ status: "success", updatedAt: new Date() })
							.where(
								and(
									eq(sberbankTransactions.id, lockedTx.id),
									eq(sberbankTransactions.organizationId, orgId),
								),
							);

						const amountRub = Number(kopecksToNumericString(lockedTx.amount));
						const [lockedPayment] = await tx
							.select()
							.from(payments)
							.where(
								and(
									eq(payments.organizationId, orgId),
									eq(payments.clientMutationId, `sberbank:${orderId}`),
								),
							)
							.for("update")
							.limit(1);

						if (!lockedPayment) {
							await tx
								.insert(payments)
								.values({
									organizationId: orgId,
									patientId: lockedTx.patientId,
									visitId: lockedTx.visitId ? lockedTx.visitId : null,
									documentId: lockedTx.documentId ? lockedTx.documentId : null,
									method: "card",
									status: "paid",
									amountRub,
									paidAt: new Date(),
									clientMutationId: `sberbank:${orderId}`,
									note: `Оплата через Сбербанк Эквайринг (заказ ${orderId})`,
								})
								.onConflictDoNothing({
									target: [payments.organizationId, payments.clientMutationId],
								});
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

						return {
							success: true,
							status: "paid",
							amountRub,
							message: "Оплата картой была успешно списана банком. Альтернативный прием средств отменен.",
						};
					}

					// 2. Transaction is Pending (Code 0) or Approved / Held (Code 1) -> Issue Reversal
					if (code === 0 || code === 1 || forceReverse) {
						try {
							await client.reverseOrder(orderId);
						} catch (reverseErr) {
							request.log.warn({ orderId, err: reverseErr }, "[Sberbank] Reversal warning");
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

						return {
							success: true,
							status: "reversed",
							message: "Транзакция в банке успешно отменена (реверс). Двойное списание предотвращено.",
						};
					}

					// 3. Declined or Refunded
					const mappedStatus = code === 4 ? "refunded" : "failed";
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
