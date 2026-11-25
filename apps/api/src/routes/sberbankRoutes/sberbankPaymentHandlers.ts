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
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import { SberbankClient } from "../../services/sberbankClient.js";
import { applyAcquiringCashboxLedgerInTx } from "../cashbox/cashlessAcquiringLedger.js";
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
	const totalKopecks = Number(params.amountKopecks);
	const isReturn = params.operationType === "income_return";
	const clientMutationId = isReturn
		? `sberbank:${params.orderId}:return`
		: `sberbank:${params.orderId}`;
	const ffdPayload = FiscalReceiptFactory.buildFfd12Receipt({
		patientId: params.patientId,
		visitId: params.visitId || undefined,
		documentId: params.documentId || undefined,
		invoiceId: params.invoiceId || undefined,
		clientMutationId,
		customerContact: "cardholder@clinic.ru",
		cashierFullName: "Кассир-администратор",
		operationType: params.operationType,
		taxationSystem: "usn_income",
		electronicCardKopecks: totalKopecks,
		totalKopecks,
		items: [
			{
				name: isReturn
					? `Возврат оплаты заказа №${params.orderId} (Сбербанк Эквайринг)`
					: `Оплата заказа №${params.orderId} (Сбербанк Эквайринг)`,
				priceKopecks: totalKopecks,
				quantity: 1,
				amountKopecks: totalKopecks,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		],
	});

	await tx.insert(fiscalReceiptQueue).values({
		organizationId: params.organizationId,
		paymentId: params.paymentId,
		visitId: params.visitId || null,
		receiptType: params.operationType,
		status: "pending_print",
		payloadJson: {
			...ffdPayload,
			clientMutationId,
			orderId: params.orderId,
			invoiceId: params.invoiceId,
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
		{
			...sberbankPayFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
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

			const orderNumber = idempotencyKey || crypto.randomUUID();
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
		{
			...sberbankStatusFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
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
		{
			...sberbankStatusFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
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

					const txLower = lockedTx.status.toLowerCase();
					if (
						(txLower === "refunded" || txLower === "reversed" || lockedPayment?.status === "refunded") &&
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
								await reconcileInvoiceBalanceInDb(
									tx,
									orgId,
									lockedTx.invoiceId,
								);
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

	/**
	 * POST /api/sberbank/cancel-or-reconcile
	 * Prevents Double-Charge vulnerability on timeout / modal close:
	 * 1. Reads preflight state in short DB tx, then performs Sberbank HTTP outside PG tx (DEF-03).
	 * 2. If paid (Code 2) and not already refunded, settles payment atomically.
	 * 3. If pending/authorized (Code 0, 1) or forceReverse, reverses at gateway OUTSIDE PG tx, then persists reversal.
	 */
	app.post(
		"/api/sberbank/cancel-or-reconcile",
		{
			...sberbankCancelReconcileFastifySchema,
			config: { tenantTxSelfManaged: true },
		},
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
				const preflightTx = await withTenantCtx(orgId, async (tx) => {
					const [row] = await tx
						.select({ id: sberbankTransactions.id, status: sberbankTransactions.status })
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

				if (!preflightTx) {
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

					const lockedStatusLower = lockedTx.status.toLowerCase();

					// 1. Transaction was actually PAID by card right before/during timeout (Code 2)
					if (code === 2) {
						if (
							lockedStatusLower === "refunded" ||
							lockedStatusLower === "reversed" ||
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
							await reconcileInvoiceBalanceInDb(
								tx,
								orgId,
								lockedTx.invoiceId,
							);
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
					if (
						mappedStatus === "failed" &&
						(lockedStatusLower === "refunded" || lockedStatusLower === "reversed")
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
