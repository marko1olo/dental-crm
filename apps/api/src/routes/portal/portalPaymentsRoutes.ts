import { createHash } from "node:crypto";
import { isValidUuid, kopecksToRubles, parseKopecks, rublesToKopecks, sumKopecks } from "@dental/shared";
import { and, desc, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { definePublicRoute } from "../../core/routeFactories.js";
import { onTenantTxCommit, withTenantCtx, withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	fiscalReceiptQueue,
	organizations,
	patientInvoices,
	payments,
	sberbankTransactions,
} from "../../db/schema.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import { SberbankClient } from "../../services/sberbankClient.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { resolveSberReturnUrl } from "../sberbankRoutes/sberbankUtils.js";
import { extractPortalPatient } from "./portalAuthStore.js";
import { generateDeterministicQrSvg } from "./portalUtils.js";
import {
	buildAvailablePortalSbpBanks,
	buildIdempotentSbpReply,
	buildPortalSbpNspkPayload,
	deriveDeterministicSbpOrderId,
	extractBankRequisites,
	readHeaderString,
	resolveInvoiceTotalKopecks,
	resolveSbpPaidKopecksNow,
} from "./portalPaymentsHelpers.js";
import {
	confirmSbpBodySchema,
	createCardOrderBodySchema,
	createSbpQrBodySchema,
	paymentStatusQuerySchema,
	type ConfirmSbpBody,
	type CreateCardOrderBody,
	type CreateSbpQrBody,
	type PaymentStatusQuery,
} from "./types.js";

export async function registerPortalPaymentsRoutes(server: FastifyInstance): Promise<void> {
	// 11. Create Dynamic SBP QR Code for Stage/Invoice Payment (Protected)
	definePublicRoute(server, {
		method: "POST",
		path: "/payments/create-sbp-qr",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const idempotencyKey =
				readHeaderString(request.headers["idempotency-key"]) ??
				readHeaderString(request.headers["x-idempotency-key"]);

			const parsedBody = createSbpQrBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные параметры создания СБП-платежа.",
					details: parsedBody.error.format(),
				};
			}

			const invoiceId = parsedBody.data.invoiceId?.trim() ?? "";
			const stageId = parsedBody.data.stageId?.trim() ?? "";
			const explicitAmount = parsedBody.data.amountRub;

			return withTenantWriteCtx(auth.organizationId, async (tx) => {
			let amountRub = explicitAmount || 0;
			let resolvedInvoiceKopecks = 0;
			let invoiceNumber = `СЧ-${Date.now().toString().slice(-6)}`;

			if (invoiceId) {
				const [inv] = await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, invoiceId),
							eq(patientInvoices.organizationId, auth.organizationId),
							eq(patientInvoices.patientId, auth.patientId),
						),
					)
					.limit(1);

				if (!inv) {
					reply.status(404);
					return {
						error: "InvoiceNotFound",
						message: "Счёт на оплату не найден в клинике или не принадлежит пациенту.",
					};
				}

				invoiceNumber = `СЧ-${inv.id.slice(0, 8).toUpperCase()}`;
				const invAmtKop = resolveInvoiceTotalKopecks(inv);
				resolvedInvoiceKopecks = invAmtKop;
				amountRub = explicitAmount !== undefined ? explicitAmount : kopecksToRubles(invAmtKop);
			}

			if (amountRub <= 0) {
				reply.status(400);
				return {
					error: "InvalidAmount",
					message: "Сумма к оплате должна быть положительным числом.",
				};
			}

			const [org] = await tx
				.select({
					name: organizations.name,
					inn: organizations.inn,
					kpp: organizations.kpp,
					ogrn: organizations.ogrn,
					bankDetails: organizations.bankDetails,
				})
				.from(organizations)
				.where(eq(organizations.id, auth.organizationId))
				.limit(1);

			// [DEF-PORTAL-05] Проверка реальных банковских реквизитов организации (защита от хардкодных тестовых счетов)
			const requisites = extractBankRequisites(org?.bankDetails);
			const recipientAccount = requisites.account;
			const bankBic = requisites.bic;

			if (!recipientAccount || !bankBic) {
				reply.status(422);
				return {
					error: "PAYMENT_REQUISITES_UNAVAILABLE",
					message: "Банковские реквизиты клиники для приёма платежей через СБП не настроены. Обратитесь к администратору клиники.",
				};
			}

			const recipientLegalName = org?.name || "Стоматологическая клиника";
			const recipientInn = org?.inn || "";

			const amountKopecks =
				explicitAmount === undefined && resolvedInvoiceKopecks > 0
					? resolvedInvoiceKopecks
					: rublesToKopecks(amountRub);
			const deterministicQrId = idempotencyKey
				? deriveDeterministicSbpOrderId(idempotencyKey)
				: undefined;

			// Idempotency serialization lock + lookup: reuse existing SBP QR row on retry
			let existingTx: typeof sberbankTransactions.$inferSelect | undefined;
			if (deterministicQrId && idempotencyKey) {
				if (
					process.env.DENTAL_STATE_PERSISTENCE !== "off" &&
					typeof tx.execute === "function"
				) {
					await tx.execute(
						sql`SELECT pg_advisory_xact_lock(hashtext(${`${auth.organizationId}:portal-sbp-qr:${idempotencyKey}`}))`,
					);
				}
				const [found] = await tx
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, auth.organizationId),
							eq(sberbankTransactions.patientId, auth.patientId),
							or(
								eq(sberbankTransactions.orderId, deterministicQrId),
								eq(sberbankTransactions.orderId, idempotencyKey),
							),
						),
					)
					.limit(1);
				existingTx = found;
			}
			if (!existingTx && invoiceId) {
				const [foundByInv] = await tx
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, auth.organizationId),
							eq(sberbankTransactions.patientId, auth.patientId),
							eq(sberbankTransactions.invoiceId, invoiceId),
							eq(sberbankTransactions.status, "WAITING_FOR_CARD"),
							eq(sberbankTransactions.amountKopecks, BigInt(amountKopecks)),
						),
					)
					.orderBy(desc(sberbankTransactions.createdAt))
					.limit(1);
				existingTx = foundByInv;
			}

			let qrId: string;
			if (existingTx) {
				qrId = existingTx.orderId;
				reply.header("idempotency-replayed", "true");
			} else {
				qrId =
					deterministicQrId ??
					`SBPA${Date.now().toString(36).toUpperCase()}${invoiceNumber.replace(/\D/g, "")}`;

				await tx.insert(sberbankTransactions).values({
					organizationId: auth.organizationId,
					patientId: auth.patientId,
					invoiceId: invoiceId || null,
					orderId: qrId,
					amountKopecks: BigInt(amountKopecks),
					status: "WAITING_FOR_CARD",
				});
			}

			if (idempotencyKey) {
				reply.header("X-Idempotency-Key", idempotencyKey);
			}

			const sbpNspkPayloadString = buildPortalSbpNspkPayload({
				qrId,
				amountKopecks,
				sbpBankId: requisites.sbpBankId,
				bic: bankBic,
			});
			const qrSvg = generateDeterministicQrSvg(sbpNspkPayloadString, 180);
			const expiresAt = new Date(Date.now() + 72 * 3600 * 1000).toISOString();

			const sbpPayload = {
				qrId,
				invoiceId: invoiceId || undefined,
				stageId: stageId || undefined,
				invoiceNumber,
				amountRub,
				amountKopecks,
				recipientLegalName,
				recipientInn,
				recipientAccount,
				bankBic,
				paymentPurpose: `Оплата стоматологических услуг по счету № ${invoiceNumber} (НДС не облагается)`,
				sbpNspkPayloadString,
				qrSvg,
				expiresAtIso: expiresAt,
				availableBanks: buildAvailablePortalSbpBanks(qrId, sbpNspkPayloadString),
			};

			return { success: true, sbpPayload };
			});
		},
	});

	// 11b. Create Online Card Payment Order via Acquiring Gateway (Protected)
	definePublicRoute(server, {
		method: "POST",
		path: "/payments/create-card-order",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				return reply.status(401).send({ error: "Unauthorized" });
			}

			const parsedBody = createCardOrderBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры создания оплаты картой.",
					details: parsedBody.error.format(),
				});
			}

			const invoiceId = parsedBody.data.invoiceId.trim();
			const explicitAmountRub = parsedBody.data.amountRub;
			const idempotencyKey =
				readHeaderString(request.headers["idempotency-key"]) ??
				readHeaderString(request.headers["x-idempotency-key"]);

			const invoiceCheck = await withTenantReadCtx(auth.organizationId, async (tx) => {
				const [inv] = await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, invoiceId),
							eq(patientInvoices.organizationId, auth.organizationId),
							eq(patientInvoices.patientId, auth.patientId),
						),
					)
					.limit(1);

				if (!inv) {
					return { ok: false as const, status: 404 as const, error: "InvoiceNotFound", message: "Счёт на оплату не найден." };
				}
				if (inv.status === "paid" || inv.status === "voided" || inv.status === "cancelled") {
					return { ok: false as const, status: 409 as const, error: "InvoiceAlreadyPaid", message: "Счёт уже оплачен или аннулирован." };
				}
				const invTotalKop = resolveInvoiceTotalKopecks(inv);
				const amountKopecks = explicitAmountRub !== undefined ? rublesToKopecks(explicitAmountRub) : invTotalKop;
				if (!Number.isSafeInteger(amountKopecks) || amountKopecks <= 0) {
					return { ok: false as const, status: 400 as const, error: "InvalidAmount", message: "Сумма к оплате должна быть больше нуля." };
				}
				return { ok: true as const, invoice: inv, amountKopecks };
			});

			if (!invoiceCheck.ok) {
				return reply.status(invoiceCheck.status).send({
					error: invoiceCheck.error,
					message: invoiceCheck.message,
				});
			}

			const returnUrl = resolveSberReturnUrl(
				typeof request.headers.origin === "string" ? request.headers.origin : undefined,
			);
			if (!returnUrl) {
				return reply.status(500).send({
					error: "ReturnUrlNotConfigured",
					message: "Не настроен безопасный адрес возврата для платёжной формы.",
				});
			}

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message: "Интернет-эквайринг для оплаты картой не подключён. Доступна оплата по СБП.",
				});
			}

			const orderNumber = idempotencyKey
				? `CARD-${createHash("sha256").update(idempotencyKey).digest("hex").slice(0, 20).toUpperCase()}`
				: `CARD-${invoiceCheck.invoice.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

			const reg = await client.registerOrder(orderNumber, invoiceCheck.amountKopecks, returnUrl);
			if (reg.errorCode && reg.errorCode !== "0") {
				return reply.status(502).send({
					error: "PaymentGatewayError",
					message: reg.errorMessage || "Платёжный шлюз отклонил регистрацию оплаты.",
				});
			}
			const orderId = reg.orderId;
			const formUrl = reg.formUrl;
			if (!orderId || !formUrl) {
				return reply.status(502).send({
					error: "PaymentGatewayError",
					message: "Платёжный шлюз не вернул ссылку на форму оплаты.",
				});
			}

			await withTenantWriteCtx(auth.organizationId, async (tx) => {
				await tx
					.insert(sberbankTransactions)
					.values({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						invoiceId: invoiceCheck.invoice.id,
						visitId: invoiceCheck.invoice.visitId ?? null,
						orderId,
						amountKopecks: BigInt(invoiceCheck.amountKopecks),
						status: "WAITING_FOR_CARD",
					})
					.onConflictDoNothing();
			});

			return reply.status(200).send({
				success: true,
				orderId,
				formUrl,
				amountKopecks: invoiceCheck.amountKopecks,
				amountRub: kopecksToRubles(invoiceCheck.amountKopecks),
			});
		},
	});

	// 12. Confirm SBP Payment & Enqueue 54-FZ Fiscal Receipt (Protected)
	// definePublicRoute leaves PG connection unheld during external Sberbank HTTP check
	definePublicRoute(server, {
		method: "POST",
		path: "/payments/confirm-sbp",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const idempotencyKey =
				readHeaderString(request.headers["idempotency-key"]) ??
				readHeaderString(request.headers["x-idempotency-key"]);
			if (!idempotencyKey || !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "IdempotencyKeyRequired",
					message: "Для подтверждения оплаты СБП требуется валидный заголовок Idempotency-Key (UUIDv7).",
				});
			}
			reply.header("Idempotency-Key", idempotencyKey);
			reply.header("X-Idempotency-Key", idempotencyKey);

			const parsedBody = confirmSbpBodySchema.safeParse(request.body ?? {});
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры подтверждения оплаты СБП.",
					details: parsedBody.error.format(),
				});
			}

			const invoiceId = parsedBody.data.invoiceId?.trim() ?? "";
			const stageId = parsedBody.data.stageId?.trim() ?? "";
			const sbpTxId = parsedBody.data.sbpTransactionId?.trim() ?? "";

			if (!invoiceId) {
				return reply.code(400).send({ error: "ValidationError", message: "Параметр invoiceId обязателен для подтверждения оплаты." });
			}
			if (!sbpTxId) {
				return reply.code(400).send({ error: "ValidationError", message: "Идентификатор транзакции СБП (sbpTransactionId) обязателен." });
			}

			const explicitAmount = parsedBody.data.amountRub;

			// External bank gateway check runs BEFORE opening a PostgreSQL transaction
			const sberUser = process.env.SBERBANK_TERMINAL_USER?.trim();
			const sberToken = process.env.SBERBANK_TERMINAL_TOKEN?.trim();
			let externalBankConfirmed = false;
			let externalBankAmountKopecks: number | undefined;
			if (sberUser || sberToken) {
				try {
					const bankStatus = await new SberbankClient().getOrderStatusExtended(sbpTxId);
					if (bankStatus.orderStatus === 2) {
						externalBankConfirmed = true;
						if (typeof bankStatus.amount === "number" && Number.isFinite(bankStatus.amount)) {
							externalBankAmountKopecks = Math.round(bankStatus.amount);
						}
					}
				} catch (bankErr) {
					request.log.warn({ err: bankErr, sbpTxId }, "Failed to query bank gateway for SBP transaction status");
				}
			}

			const now = new Date();
			return withTenantWriteCtx(auth.organizationId, async (tx) => {
				// 1. Lock invoice row (FOR UPDATE)
				const [inv] = await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, invoiceId),
							eq(patientInvoices.organizationId, auth.organizationId),
							eq(patientInvoices.patientId, auth.patientId),
						),
					)
					.for("update")
					.limit(1);

				if (!inv) {
					return reply.code(404).send({ error: "InvoiceNotFound", message: "Счёт на оплату не найден в клинике или не принадлежит пациенту." });
				}
				const invoiceTotalKop = resolveInvoiceTotalKopecks(inv);
				if (invoiceTotalKop <= 0) {
					return reply.code(400).send({ error: "InvalidInvoiceAmount", message: "Сумма счёта должна быть больше нуля." });
				}

				// 2. Lock SBP transaction row and verify patient ownership & invoice binding
				const [sberTx] = await tx
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.organizationId, auth.organizationId),
							or(eq(sberbankTransactions.orderId, sbpTxId), sql`${sberbankTransactions.id}::text = ${sbpTxId}`),
						),
					)
					.for("update")
					.limit(1);

				if (sberTx) {
					if (sberTx.patientId !== auth.patientId) {
						return reply.code(403).send({ error: "Forbidden", message: "Транзакция СБП принадлежит другому пациенту." });
					}
					if (sberTx.invoiceId !== inv.id) {
						return reply.code(400).send({ error: "InvoiceMismatch", message: "Транзакция СБП не соответствует оплачиваемому счёту." });
					}
				}

				// 3. Idempotency check BEFORE any invoice mutation
				const clientMutationId = `sbp:${sbpTxId}`;
				const [existingPayment] = await tx
					.select({
						id: payments.id,
						documentId: payments.documentId,
						amountKopecks: payments.amountKopecks,
						amountRub: payments.amountRub,
					})
					.from(payments)
					.where(and(eq(payments.organizationId, auth.organizationId), eq(payments.clientMutationId, clientMutationId)))
					.for("update")
					.limit(1);

				if (existingPayment) {
					if (existingPayment.documentId && existingPayment.documentId !== inv.id) {
						return reply.code(409).send({ error: "PaymentConflict", message: "Данная транзакция СБП уже учтена по другому счёту." });
					}
					const recordedKop = existingPayment.amountKopecks != null ? Number(existingPayment.amountKopecks) : parseKopecks(existingPayment.amountRub ?? 0);
					return reply.code(200).send(
						buildIdempotentSbpReply({
							paymentId: existingPayment.id,
							invoiceId: inv.id,
							stageId,
							status: inv.status,
							amountKopecks: recordedKop > 0 ? recordedKop : invoiceTotalKop,
							message: "Транзакция СБП уже обработана ранее.",
						}),
					);
				}

				if (inv.status === "paid") {
					return reply.code(200).send(
						buildIdempotentSbpReply({
							paymentId: sbpTxId,
							invoiceId: inv.id,
							stageId,
							status: "paid",
							amountKopecks: invoiceTotalKop,
							message: "Счёт уже был оплачен ранее.",
						}),
					);
				}

				// 4. Compute existing paid totals and verify exact integer kopeck integrity
				const existingInvoicePayments = await tx
					.select({ amountKopecks: payments.amountKopecks, amountRub: payments.amountRub })
					.from(payments)
					.where(and(eq(payments.organizationId, auth.organizationId), eq(payments.documentId, inv.id), eq(payments.status, "paid")));
				const alreadyPaidKop = sumKopecks(
					existingInvoicePayments.map((row) => (row.amountKopecks != null ? Number(row.amountKopecks) : parseKopecks(row.amountRub ?? 0))),
				);
				const remainingInvoiceKop = Math.max(0, invoiceTotalKop - alreadyPaidKop);
				if (remainingInvoiceKop <= 0) {
					await tx
						.update(patientInvoices)
						.set({ status: "paid", paidAt: inv.paidAt ?? now, version: sql`${patientInvoices.version} + 1` })
						.where(and(eq(patientInvoices.id, inv.id), eq(patientInvoices.organizationId, auth.organizationId)));
					return reply.code(200).send(
						buildIdempotentSbpReply({
							paymentId: sbpTxId,
							invoiceId: inv.id,
							stageId,
							status: "paid",
							amountKopecks: invoiceTotalKop,
							paidAmountKopecks: alreadyPaidKop,
							message: "Счёт уже оплачен полностью.",
						}),
					);
				}

				const explicitKopecks = explicitAmount !== undefined ? rublesToKopecks(explicitAmount) : undefined;
				const amountCheck = resolveSbpPaidKopecksNow({
					sberTx,
					explicitKopecks,
					externalBankAmountKopecks,
					remainingInvoiceKop,
				});
				if (!amountCheck.ok) {
					return reply.code(400).send({ error: amountCheck.error, message: amountCheck.message });
				}
				const { paidKopecksNow } = amountCheck;

				// 5. Verify acquiring bank confirmation (from locked DB state or pre-tx external call)
				const sberTxStatusNormalized = sberTx?.status.toLowerCase();
				const isDbBankConfirmed =
					sberTxStatusNormalized === "success" ||
					sberTxStatusNormalized === "deposited" ||
					sberTxStatusNormalized === "paid" ||
					sberTxStatusNormalized === "settled";
				if (!isDbBankConfirmed && !externalBankConfirmed) {
					return reply.code(402).send({ error: "PaymentNotConfirmed", message: "Транзакция СБП не подтверждена банком-эквайером или ожидает оплаты." });
				}

				if (externalBankConfirmed && sberTx && !isDbBankConfirmed) {
					await tx
						.update(sberbankTransactions)
						.set({ status: "success", visitId: sberTx.visitId ?? inv.visitId ?? null, updatedAt: now })
						.where(and(eq(sberbankTransactions.id, sberTx.id), eq(sberbankTransactions.organizationId, auth.organizationId)));
				}

				const paidRubNow = kopecksToRubles(paidKopecksNow);

				// 6. Insert payment record with composite idempotency key (clientMutationId = sbp:${sbpTxId})
				const [insertedPayment] = await tx
					.insert(payments)
					.values({
						organizationId: auth.organizationId,
						patientId: auth.patientId,
						visitId: inv.visitId ?? null,
						documentId: inv.id,
						amountRub: paidRubNow,
						amountKopecks: BigInt(paidKopecksNow),
						method: "online",
						status: "paid",
						paidAt: now,
						clientMutationId,
						fiscalReceiptNumber: null,
						fiscalReceiptIssuedAt: null,
						fiscalReceiptUrl: null,
						fiscalReceipt: null,
						note: `Онлайн-оплата через СБП (${sbpTxId})${stageId ? ` по этапу ${stageId}` : ""}`,
					})
					.onConflictDoNothing({ target: [payments.organizationId, payments.clientMutationId] })
					.returning({ id: payments.id });

				if (!insertedPayment) {
					const [racedPayment] = await tx
						.select({ id: payments.id })
						.from(payments)
						.where(and(eq(payments.organizationId, auth.organizationId), eq(payments.clientMutationId, clientMutationId)))
						.limit(1);
					return reply.code(200).send(
						buildIdempotentSbpReply({
							paymentId: racedPayment?.id ?? sbpTxId,
							invoiceId: inv.id,
							stageId,
							status: inv.status,
							amountKopecks: paidKopecksNow,
							message: "Транзакция СБП уже обработана ранее.",
						}),
					);
				}

				// 7. Atomically update patientInvoices paid totals & status
				const newPaidTotalKop = alreadyPaidKop + paidKopecksNow;
				const isFullyPaid = newPaidTotalKop >= invoiceTotalKop;
				const nextInvoiceStatus = isFullyPaid ? "paid" : "partially_paid";
				await tx
					.update(patientInvoices)
					.set({ status: nextInvoiceStatus, paidAt: isFullyPaid ? now : null, version: sql`${patientInvoices.version} + 1` })
					.where(and(eq(patientInvoices.id, inv.id), eq(patientInvoices.organizationId, auth.organizationId)));

				// 8. Enqueue 54-FZ fiscal receipt into fiscalReceiptQueue within the same transaction
				const ffdPayload = FiscalReceiptFactory.buildFfd12Receipt({
					patientId: auth.patientId,
					invoiceId: inv.id,
					visitId: inv.visitId ?? null,
					clientMutationId,
					operationType: "income",
					taxationSystem: "usn_income",
					cashierFullName: "Онлайн-оплата СБП (Портал)",
					sbpKopecks: paidKopecksNow,
					totalKopecks: paidKopecksNow,
					items: [
						{
							name: `Оплата стоматологических услуг по счёту № ${inv.id.slice(0, 8).toUpperCase()}`.slice(0, 128),
							priceKopecks: paidKopecksNow,
							quantity: 1,
							amountKopecks: paidKopecksNow,
							subject: "service",
							method: "full_payment",
							vatRate: "vat_none",
							measure: "piece",
						},
					],
				});

				const [queuedFiscal] = await tx
					.insert(fiscalReceiptQueue)
					.values({
						organizationId: auth.organizationId,
						paymentId: insertedPayment.id,
						visitId: inv.visitId ?? null,
						receiptType: "income",
						status: "pending_print",
						payloadJson: {
							...ffdPayload,
							clientMutationId,
							invoiceId: inv.id,
							paymentId: insertedPayment.id,
							sbpTransactionId: sbpTxId,
							amountRub: paidRubNow,
							amountKopecks: paidKopecksNow,
							source: "patient_portal_sbp",
						},
						retryCount: 0,
						lastError: null,
						printedAt: null,
					})
					.returning({ id: fiscalReceiptQueue.id });

				// 9. Broadcast real-time UI updates strictly AFTER DB transaction commit
				onTenantTxCommit(() => {
					const wsPayload = {
						event: "portal_sbp_payment_confirmed",
						invoiceId: inv.id,
						paymentId: insertedPayment.id,
						patientId: auth.patientId,
						sbpTransactionId: sbpTxId,
						status: nextInvoiceStatus,
						amountRub: paidRubNow,
						amountKopecks: paidKopecksNow,
						paidAmountRub: kopecksToRubles(newPaidTotalKop),
						paidAmountKopecks: newPaidTotalKop,
						fiscalReceiptQueueId: queuedFiscal?.id ?? null,
						paidAt: now.toISOString(),
					};
					wsBroker.broadcastToOrganization(auth.organizationId, wsPayload);
					wsBroker.broadcastToPatient(auth.organizationId, auth.patientId, wsPayload);
				});

				return {
					success: true,
					paymentId: insertedPayment.id,
					invoiceId: inv.id,
					...(stageId ? { stageId } : {}),
					status: nextInvoiceStatus,
					amountRub: paidRubNow,
					amountKopecks: paidKopecksNow,
					paidAmountRub: kopecksToRubles(newPaidTotalKop),
					paidAmountKopecks: newPaidTotalKop,
					fiscalReceipt: null,
					fiscalReceiptQueueId: queuedFiscal?.id ?? null,
				};
			});
		},
	});

	// 13. Get Payment / Invoice Status (Protected)
	definePublicRoute(server, {
		method: "GET",
		path: "/payments/status",
		handler: async ({ request, reply }) => {
			const auth = await extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const parsedQuery = paymentStatusQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные параметры запроса статуса оплаты.",
					details: parsedQuery.error.format(),
				};
			}

			const invoiceId = parsedQuery.data.invoiceId?.trim();
			const invoiceNumber = parsedQuery.data.invoiceNumber?.trim();

			return withTenantReadCtx(auth.organizationId, async (tx) => {
				let inv: typeof patientInvoices.$inferSelect | undefined;

				if (invoiceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceId)) {
					const [found] = await tx
						.select()
						.from(patientInvoices)
						.where(and(eq(patientInvoices.id, invoiceId), eq(patientInvoices.organizationId, auth.organizationId), eq(patientInvoices.patientId, auth.patientId)))
						.limit(1);
					inv = found;
				}

				if (!inv && invoiceNumber) {
					const cleanId = invoiceNumber.replace(/^СЧ-/i, "").toLowerCase();
					const allPatientInvoices = await tx
						.select()
						.from(patientInvoices)
						.where(and(eq(patientInvoices.organizationId, auth.organizationId), eq(patientInvoices.patientId, auth.patientId)));
					inv = allPatientInvoices.find(
						(i) => i.id.toLowerCase() === cleanId || i.id.toLowerCase().startsWith(cleanId) || `СЧ-${i.id.slice(0, 8).toUpperCase()}` === invoiceNumber,
					);
				}

				if (!inv) {
					// Also check sberbankTransactions if invoice was registered via SBP QR
					const orderIdLookup = invoiceId || invoiceNumber;
					if (orderIdLookup) {
						const [txRow] = await tx
							.select()
							.from(sberbankTransactions)
							.where(and(eq(sberbankTransactions.organizationId, auth.organizationId), eq(sberbankTransactions.patientId, auth.patientId), eq(sberbankTransactions.orderId, orderIdLookup)))
							.limit(1);

						if (txRow) {
							const isSettled = txRow.status === "SETTLED" || txRow.status === "success" || txRow.status === "paid";
							return {
								success: true,
								status: isSettled ? "paid" : txRow.status.toLowerCase(),
								isPaid: isSettled,
								paidAmountRub: isSettled ? kopecksToRubles(txRow.amountKopecks) : 0,
								paidAtIso: txRow.updatedAt?.toISOString() || null,
								fiscalReceiptNumber: undefined,
							};
						}
					}

					reply.status(404);
					return { error: "InvoiceNotFound", message: "Счёт на оплату не найден." };
				}

				const isPaid = inv.status === "paid";
				const totalAmountRub = kopecksToRubles(resolveInvoiceTotalKopecks(inv));
				return {
					success: true,
					status: inv.status,
					isPaid,
					paidAmountRub: isPaid ? totalAmountRub : 0,
					paidAtIso: inv.paidAt?.toISOString() || null,
					fiscalReceiptNumber: undefined,
				};
			});
		},
	});
}
