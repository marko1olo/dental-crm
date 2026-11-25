import crypto from "node:crypto";
import { kopecksToRubles } from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId as requireOrganizationContext,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx, type TenantDb } from "../../db/rls.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { requirePermission } from "../../security/permissions.js";
import { Fiscal54FzService } from "../../services/billing/fiscal54fzService.js";
import { SberbankClient } from "../../services/sberbankClient.js";
import { reconcileInvoiceBalanceInDb } from "../payments/sberWebhook/paymentStateTransition.js";

async function enqueueSberbankFiscalReceiptInTx(
	tx: TenantDb,
	params: {
		organizationId: string;
		patientId: string;
		orderId: string;
		paymentId: string | null;
		visitId: string | null;
		documentId: string | null;
		invoiceId: string | null;
		amountKopecks: bigint | number;
		operationType: "income" | "income_return";
	},
): Promise<void> {
	const amountRub = kopecksToRubles(params.amountKopecks);
	const isReturn = params.operationType === "income_return";
	const fiscalReceiptPayload = Fiscal54FzService.buildStatutoryFiscalReceipt({
		organizationId: params.organizationId,
		patientId: params.patientId,
		customerContact: "cardholder@clinic.ru",
		cashierFullName: "Кассир-администратор",
		operationType: params.operationType,
		defaultCalculationMethod: "full_payment",
		tenderSplits: {
			electronicCardRub: amountRub,
		},
		positions: [
			{
				name: isReturn
					? `Возврат оплаты заказа №${params.orderId} (Сбербанк Эквайринг)`
					: `Оплата заказа №${params.orderId} (Сбербанк Эквайринг)`,
				priceRub: amountRub,
				quantity: 1,
				medicalServiceCode804n: null,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
			},
		],
		visitId: params.visitId,
		documentId: params.documentId,
		invoiceId: params.invoiceId,
		clientMutationId: isReturn ? `sberbank:${params.orderId}:return` : `sberbank:${params.orderId}`,
	});

	await tx.insert(fiscalReceiptQueue).values({
		organizationId: params.organizationId,
		paymentId: params.paymentId,
		visitId: params.visitId || null,
		receiptType: params.operationType,
		status: "pending_print",
		payloadJson: {
			...fiscalReceiptPayload,
			tag1020_totalRub: fiscalReceiptPayload.tag1020_totalRubString,
		},
		retryCount: 0,
	});
}
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
			const perm = await requirePermission(db, request, reply, "finance.write");
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

			const rawIdempotencyKey =
				(request.headers["idempotency-key"] as string | undefined) ||
				(request.headers["x-idempotency-key"] as string | undefined);
			const idempotencyKey = rawIdempotencyKey?.trim();

			if (idempotencyKey) {
				if (!isValidUuid(idempotencyKey)) {
					return reply.status(400).send({
						error: "IdempotencyKeyRequired",
						message: "Заголовок Idempotency-Key должен быть корректным UUID.",
					});
				}
				reply.header("Idempotency-Key", idempotencyKey);
				reply.header("X-Idempotency-Key", idempotencyKey);
			}

			const { patientId, amountKopecks, visitId, documentId, invoiceId } = parsed.data;

			// Проверяем принадлежность пациента к организации клиники
			const [patient] = await withTenantCtx(organizationId, async (tx) => {
				return await tx
					.select({ id: patients.id })
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, organizationId)))
					.limit(1);
			});

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
				const res = await client.registerOrder(orderNumber, amountKopecks, returnUrl);

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
						amountKopecks: BigInt(amountKopecks),
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

	function mapSberbankOrderStatus(code: number | undefined): string {
		if (code === 2) return "success";
		if (code === 3 || code === 6) return "failed";
		if (code === 1) return "approved";
		if (code === 4) return "refunded";
		return "pending";
	}

	app.get(
		"/api/sberbank/status/:orderId",
		sberbankStatusFastifySchema,
		async (request, reply) => {
			const perm = await requirePermission(db, request, reply, "finance.write");
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
				const mappedStatus = mapSberbankOrderStatus(sberStatus.orderStatus);

				const existingTx = await withTenantCtx(orgId, async (tx) => {
					const [row] = await tx
						.select({
							id: sberbankTransactions.id,
							status: sberbankTransactions.status,
							amountKopecks: sberbankTransactions.amountKopecks,
						})
						.from(sberbankTransactions)
						.where(
							and(
								eq(sberbankTransactions.orderId, orderId),
								eq(sberbankTransactions.organizationId, orgId),
							),
						)
						.limit(1);
					return row ?? null;
				});

				if (!existingTx) {
					return reply.status(404).send({
						error: "TransactionNotFound",
						message: "Транзакция оплаты Сбербанк не найдена.",
					});
				}

				return {
					success: true,
					status: mappedStatus,
					recordedStatus: existingTx.status,
					amount: Number(existingTx.amountKopecks),
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
		sberbankStatusFastifySchema,
		async (request: FastifyRequest, reply: FastifyReply) => {
			const perm = await requirePermission(db, request, reply, "finance.write");
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
				const mappedStatus = mapSberbankOrderStatus(sberStatus.orderStatus);

				return await withTenantCtx(orgId, async (tx) => {
					await tx.execute(
						sql`SELECT pg_advisory_xact_lock(hashtext(${orgId}), hashtext('sberbank_status:' || ${orderId}))`,
					);

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
								or(
									eq(payments.clientMutationId, `sberbank:${orderId}`),
									eq(payments.clientMutationId, `sberpos:${orderId}`),
								),
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
							const amountRub = kopecksToRubles(lockedTx.amountKopecks);
							const [insertedPayment] = await tx
								.insert(payments)
								.values({
									organizationId: orgId,
									patientId: lockedTx.patientId,
									visitId: lockedTx.visitId ? lockedTx.visitId : null,
									documentId: lockedTx.documentId
										? lockedTx.documentId
										: lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)
											? lockedTx.invoiceId
											: null,
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
								await reconcileInvoiceBalanceInDb(
									tx,
									orgId,
									lockedTx.invoiceId,
								);
							}

							// 54-FZ compliance: Enqueue statutory fiscal receipt atomically inside tx
							await enqueueSberbankFiscalReceiptInTx(tx, {
								organizationId: orgId,
								patientId: lockedTx.patientId,
								orderId: lockedTx.orderId,
								paymentId: insertedPayment?.id || null,
								visitId: lockedTx.visitId,
								documentId: lockedTx.documentId,
								invoiceId: lockedTx.invoiceId,
								amountKopecks: lockedTx.amountKopecks,
								operationType: "income",
							});
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
			const perm = await requirePermission(db, request, reply, "finance.write");
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

						const amountRub = kopecksToRubles(lockedTx.amountKopecks);
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

						let insertedPayment: typeof payments.$inferSelect | undefined;
						if (!lockedPayment) {
							const [inserted] = await tx
								.insert(payments)
								.values({
									organizationId: orgId,
									patientId: lockedTx.patientId,
									visitId: lockedTx.visitId ? lockedTx.visitId : null,
									documentId: lockedTx.documentId
										? lockedTx.documentId
										: lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)
											? lockedTx.invoiceId
											: null,
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
							await reconcileInvoiceBalanceInDb(
								tx,
								orgId,
								lockedTx.invoiceId,
							);
						}

						// 54-FZ statutory fiscal receipt queue registration
						if (insertedPayment) {
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
								await enqueueSberbankFiscalReceiptInTx(tx, {
									organizationId: orgId,
									patientId: lockedTx.patientId,
									orderId: lockedTx.orderId,
									paymentId: lockedPayment.id,
									visitId: lockedTx.visitId,
									documentId: lockedTx.documentId,
									invoiceId: lockedTx.invoiceId,
									amountKopecks:
										lockedPayment.amountKopecks !== null && lockedPayment.amountKopecks > 0n
											? lockedPayment.amountKopecks
											: lockedTx.amountKopecks,
									operationType: "income_return",
								});
							}
						}

						if (lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)) {
							await reconcileInvoiceBalanceInDb(
								tx,
								orgId,
								lockedTx.invoiceId,
							);
						}

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
