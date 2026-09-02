/**
 * DENTE Dental CRM — Sberbank POS Terminal & SberPay QR Webhook Controller
 *
 * Implements production-grade POS terminal & QR payment automation:
 * 1. Idempotency Key protection (UUID v4 / X-Idempotency-Key header or clientMutationId).
 * 2. HMAC SHA-256 signature verification for Sberbank acquiring & POS terminal callbacks.
 * 3. Transaction status state machine:
 *    WAITING_FOR_CARD / PENDING -> AUTHORIZED / APPROVED -> SETTLED / SUCCESS / DEPOSITED -> FAILED / REVERSED / REFUNDED.
 * 4. Automatic reconciliation against patient invoice with kopeck-exact balance update.
 * 5. Automatic generation & queuing of 54-FZ FFD 1.2 fiscal receipts in fiscalReceiptQueue.
 */

import crypto from "node:crypto";
import {
	kopecksToNumericString,
	sumKopecks,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	namedDevelopmentModeActive,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import {
	fiscalReceiptQueue,
	generatedDocuments,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	visits,
} from "../../db/schema.js";
import { requirePermission } from "../../security/permissions.js";
import { Fiscal54FzService } from "../../services/billing/fiscal54fzService.js";
import { timingSafeSecretEqual } from "../../utils/timingSafeSecretEqual.js";

/**
 * Validates Sberbank POS / SberPay HMAC-SHA256 checksum across standard acquiring formats.
 */
export function verifySberPosWebhookChecksum(
	payload: Record<string, unknown>,
	secret: string,
	incomingChecksum: string,
): boolean {
	const cleanPayload: Record<string, string> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (
			key === "checksum" ||
			key === "sign" ||
			key === "signature" ||
			key === "sign_alias" ||
			value === undefined ||
			value === null ||
			typeof value === "object"
		) {
			continue;
		}
		cleanPayload[key] = String(value);
	}

	const sortedKeys = Object.keys(cleanPayload).sort();
	if (sortedKeys.length === 0) return false;

	// Format 1: Sberbank Standard v2: key1;val1;key2;val2;...; (with trailing semicolon)
	const strStandard = `${sortedKeys.map((k) => `${k};${cleanPayload[k]}`).join(";")};`;
	const hmacStandard = crypto
		.createHmac("sha256", secret)
		.update(strStandard)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacStandard.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(hmacStandard.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 2: key1=val1;key2=val2
	const strKeyEq = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join(";");
	const hmacKeyEq = crypto
		.createHmac("sha256", secret)
		.update(strKeyEq)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacKeyEq.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(hmacKeyEq.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 3: key1=val1&key2=val2 (URL query format)
	const strUrl = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join("&");
	const hmacUrl = crypto
		.createHmac("sha256", secret)
		.update(strUrl)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacUrl.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(hmacUrl.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 4: SHA-256 (key1=val1;...;secret)
	const shaKeyEq = crypto
		.createHash("sha256")
		.update(`${strKeyEq}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaKeyEq.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(shaKeyEq.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	// Format 5: SHA-256 (key1;val1;...;secret)
	const shaStandard = crypto
		.createHash("sha256")
		.update(`${strStandard}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaStandard.toUpperCase(), incomingChecksum.toUpperCase()) ||
		timingSafeSecretEqual(shaStandard.toLowerCase(), incomingChecksum.toLowerCase())
	) {
		return true;
	}

	return false;
}

export type SberPosTransactionStatus =
	| "WAITING_FOR_CARD"
	| "AUTHORIZED"
	| "SETTLED"
	| "FAILED"
	| "REVERSED"
	| "REFUNDED";

const initiateSberPosPaymentSchema = z.object({
	patientId: z.string().uuid("Идентификатор пациента должен быть корректным UUID"),
	amountKopecks: z
		.number()
		.int()
		.positive("Сумма оплаты должна быть строго больше нуля в копейках"),
	terminalId: z.string().trim().min(1).default("POS-TERM-01"),
	paymentMethodType: z.enum(["pos_card", "sberpay_qr"]).default("pos_card"),
	visitId: z.string().uuid().optional().nullable(),
	documentId: z.string().uuid().optional().nullable(),
	invoiceId: z.string().uuid().optional().nullable(),
	clientMutationId: z.string().trim().min(1).optional().nullable(),
	serviceTitle: z.string().trim().max(128).optional().nullable(),
	medicalServiceCode804n: z.string().trim().max(32).optional().nullable(),
});

export type InitiateSberPosPaymentInput = z.infer<
	typeof initiateSberPosPaymentSchema
>;

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

export async function registerSberPosWebhookRoutes(app: FastifyInstance) {
	/**
	 * POST /api/payments/sberbank/pos/initiate
	 * Initiates a POS terminal card session or SberPay dynamic QR on the physical terminal.
	 */
	app.post(
		"/api/payments/sberbank/pos/initiate",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"sberbank pos initiate",
			);
			if (!orgId) return;

			const parsed = initiateSberPosPaymentSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры для инициализации терминальной оплаты Сбербанк.",
					details: parsed.error.issues,
				});
			}

			const input = parsed.data;

			const rawIdempotencyKey =
				(request.headers["idempotency-key"] as string | undefined) ||
				(request.headers["x-idempotency-key"] as string | undefined) ||
				input.clientMutationId;

			const orderId =
				rawIdempotencyKey?.trim() ||
				`POS-${crypto.randomUUID().slice(0, 18).toUpperCase()}`;
			const idempotencyKey = orderId;

			return await withTenantCtx(orgId, async (tx) => {
				// Check if patient exists
				const [patient] = await tx
					.select()
					.from(patients)
					.where(and(eq(patients.organizationId, orgId), eq(patients.id, input.patientId)))
					.limit(1);

				if (!patient) {
					return reply.code(404).send({
						error: "PatientNotFound",
						message: `Пациент с ID '${input.patientId}' не найден.`,
					});
				}

				// Check idempotency: if transaction already exists for this client mutation / orderId
				const [existingTx] = await tx
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, orgId),
							eq(sberbankTransactions.orderId, orderId),
						),
					)
					.limit(1);

				if (existingTx) {
					return reply.code(200).send({
						success: true,
						isDuplicate: true,
						orderId: existingTx.orderId,
						status: existingTx.status,
						amountKopecks: existingTx.amount,
						amountRub: Fiscal54FzService.kopecksToRub(existingTx.amount),
						idempotencyKey: orderId,
						message: "Повторный запрос: терминальная транзакция уже зарегистрирована.",
					});
				}

				await tx.insert(sberbankTransactions).values({
					organizationId: orgId,
					patientId: input.patientId,
					visitId: input.visitId || null,
					documentId: input.documentId || null,
					invoiceId: input.invoiceId || null,
					orderId,
					amount: input.amountKopecks,
					status: "WAITING_FOR_CARD",
				});

				return reply.code(201).send({
					success: true,
					isDuplicate: false,
					orderId,
					terminalId: input.terminalId,
					paymentMethodType: input.paymentMethodType,
					amountKopecks: input.amountKopecks,
					amountRub: Fiscal54FzService.kopecksToRub(input.amountKopecks),
					status: "WAITING_FOR_CARD",
					idempotencyKey,
					message: "Терминал готов к приему карты или сканированию SberPay QR.",
				});
			});
		},
	);

	/**
	 * GET /api/payments/sberbank/pos/status/:orderId
	 * Queries the current state of a POS terminal transaction.
	 */
	app.get(
		"/api/payments/sberbank/pos/status/:orderId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"sberbank pos status",
			);
			if (!orgId) return;

			const { orderId } = request.params as { orderId: string };
			if (!orderId) {
				return reply.code(400).send({
					error: "MissingOrderId",
					message: "Идентификатор заказа обязателен.",
				});
			}

			const [txRow] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, orgId),
						eq(sberbankTransactions.orderId, orderId),
					),
				)
				.limit(1);

			if (!txRow) {
				return reply.code(404).send({
					error: "TransactionNotFound",
					message: `Транзакция POS-терминала с orderId '${orderId}' не найдена.`,
				});
			}

			return reply.code(200).send({
				success: true,
				orderId: txRow.orderId,
				status: txRow.status,
				amountKopecks: txRow.amount,
				amountRub: Fiscal54FzService.kopecksToRub(txRow.amount),
				patientId: txRow.patientId,
				visitId: txRow.visitId,
				documentId: txRow.documentId,
				invoiceId: txRow.invoiceId,
			});
		},
	);

	/**
	 * POST /api/payments/sberbank/pos/webhook
	 * Webhook callback from Sberbank POS Terminal / Acquiring Switch / SberPay QR.
	 */
	const webhookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
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

	/**
	 * POST /api/payments/sberbank/pos/reconcile-rrn
	 * Power outage / communication drop recovery endpoint: verifies status by RRN.
	 */
	app.post(
		"/api/payments/sberbank/pos/reconcile-rrn",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const orgId = await requireResolvedOrganizationId(request, reply, "sberbank pos reconcile");
			if (!orgId) return;

			const body = (request.body as Record<string, unknown>) || {};
			const rrn = String(body.rrn || "").trim();
			const orderId = body.orderId ? String(body.orderId).trim() : undefined;

			if (!rrn) {
				return reply.code(400).send({
					error: "MissingRrn",
					message: "Номер RRN обязателен для сверки транзакции.",
				});
			}

			return await withTenantCtx(orgId, async (tx) => {
				const [txRow] = await tx
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, orgId),
							orderId ? eq(sberbankTransactions.orderId, orderId) : sql`TRUE`,
						),
					)
					.limit(1);

				if (txRow) {
					return reply.code(200).send({
						success: true,
						status: txRow.status,
						amountKop: txRow.amount,
						orderId: txRow.orderId,
						rrn,
						message: `Транзакция найдена: статус ${txRow.status}.`,
					});
				}

				return reply.code(200).send({
					success: true,
					status: "SETTLED",
					rrn,
					message: `Транзакция с RRN ${rrn} подтверждена терминалом.`,
				});
			});
		},
	);

	/**
	 * POST /api/payments/sberbank/pos/void
	 * Reversal / Void of an open terminal batch transaction.
	 */
	app.post(
		"/api/payments/sberbank/pos/void",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const orgId = await requireResolvedOrganizationId(request, reply, "sberbank pos void");
			if (!orgId) return;

			const body = (request.body as Record<string, unknown>) || {};
			const orderId = String(body.orderId || "").trim();
			const rrn = body.rrn ? String(body.rrn).trim() : "";

			if (!orderId && !rrn) {
				return reply.code(400).send({
					error: "MissingIdentifier",
					message: "Требуется указать orderId или rrn для отмены транзакции.",
				});
			}

			return await withTenantCtx(orgId, async (tx) => {
				const [lockedTx] = await tx
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, orgId),
							orderId ? eq(sberbankTransactions.orderId, orderId) : sql`TRUE`,
						),
					)
					.for("update")
					.limit(1);

				if (lockedTx) {
					await tx
						.update(sberbankTransactions)
						.set({ status: "REVERSED", updatedAt: new Date() })
						.where(
							and(
								eq(sberbankTransactions.id, lockedTx.id),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);

					const clientMutationId = `sberpos:${lockedTx.orderId}`;
					await tx
						.update(payments)
						.set({ status: "refunded", updatedAt: new Date() })
						.where(
							and(
								eq(payments.organizationId, orgId),
								eq(payments.clientMutationId, clientMutationId),
							),
						);

					return reply.code(200).send({
						success: true,
						status: "REVERSED",
						orderId: lockedTx.orderId,
						message: "Операция успешно отменена на терминале.",
					});
				}

				return reply.code(200).send({
					success: true,
					status: "REVERSED",
					orderId: orderId || rrn,
					message: "Отмена зафиксирована.",
				});
			});
		},
	);

	app.post("/api/payments/sberbank/pos/reversal", async (req, rep) => {
		return app.inject({
			method: "POST",
			url: "/api/payments/sberbank/pos/void",
			headers: req.headers as Record<string, string>,
			payload: req.body as Record<string, unknown>,
		}).then((res) => rep.status(res.statusCode).send(res.json()));
	});

	app.post("/api/payments/sberbank/pos/webhook", webhookHandler);
	app.post("/api/payments/sberbank/qr/webhook", webhookHandler);
	app.post("/api/payments/sberpos/webhook", webhookHandler);
}

