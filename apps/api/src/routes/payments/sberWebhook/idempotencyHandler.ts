import crypto from "node:crypto";
import type { FastifyRequest, FastifyReply } from "fastify";
import { and, eq, or, sql } from "drizzle-orm";
import {
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { requirePermission } from "../../../security/permissions.js";
import {
	organizations,
	patients,
	payments,
	sberbankTransactions,
	fiscalReceiptQueue,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { Fiscal54FzService } from "../../../services/billing/fiscal54fzService.js";
import { formatSberBankSlip, kopecksToRubles } from "@dental/shared";
import type { SberPosOperationType, SberPosTransactionResponse } from "@dental/shared";
import { initiateSberPosPaymentSchema, executeSberPosTransactionSchema } from "./types.js";
import { reconcileInvoiceBalanceInDb } from "./paymentStateTransition.js";

export const initiateSberPosPaymentHandler = async (request: FastifyRequest, reply: FastifyReply) => {
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
		(typeof request.headers["idempotency-key"] === "string"
			? request.headers["idempotency-key"]
			: undefined) ||
		(typeof request.headers["x-idempotency-key"] === "string"
			? request.headers["x-idempotency-key"]
			: undefined) ||
		input.clientMutationId;

	const orderId =
		rawIdempotencyKey?.trim() ||
		`POS-${crypto.randomUUID().slice(0, 18).toUpperCase()}`;
	const idempotencyKey = orderId;

	return await withTenantCtx(orgId, async (tx) => {
		// Advisory transaction-level lock to prevent concurrent double-click races
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${`sberpos:${orgId}:${orderId}`}))`,
		);

		// Check if patient exists in organization
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
				amountKopecks: Number(existingTx.amountKopecks),
				amountRub: kopecksToRubles(existingTx.amountKopecks),
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
			amountKopecks: BigInt(input.amountKopecks),
			status: "WAITING_FOR_CARD",
		});

		return reply.code(201).send({
			success: true,
			isDuplicate: false,
			orderId,
			terminalId: input.terminalId,
			paymentMethodType: input.paymentMethodType,
			amountKopecks: input.amountKopecks,
			amountRub: kopecksToRubles(input.amountKopecks),
			status: "WAITING_FOR_CARD",
			idempotencyKey,
			message: "Терминал готов к приему карты или сканированию SberPay QR.",
		});
	});
};

export const getSberPosStatusHandler = async (request: FastifyRequest, reply: FastifyReply) => {
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

	return await withTenantCtx(orgId, async (tx) => {
		const [txRow] = await tx
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
			amountKopecks: Number(txRow.amountKopecks),
			amountRub: kopecksToRubles(txRow.amountKopecks),
			patientId: txRow.patientId,
			visitId: txRow.visitId,
			documentId: txRow.documentId,
			invoiceId: txRow.invoiceId,
		});
	});
};

export const reconcileRrnHandler = async (request: FastifyRequest, reply: FastifyReply) => {
	const perm = await requirePermission(request, reply, "finance.write");
	if (!perm) return;

	const orgId = await requireResolvedOrganizationId(request, reply, "sberbank pos reconcile");
	if (!orgId) return;

	const body = (request.body as Record<string, unknown> | null) ?? {};
	const rrn = String(body.rrn || "").trim();
	const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";

	if (!rrn || !orderId) {
		return reply.code(400).send({
			error: "MissingRrnOrOrderId",
			message: "Номер RRN и orderId обязательны для сверки транзакции.",
		});
	}

	return await withTenantCtx(orgId, async (tx) => {
		const [txRow] = await tx
			.select()
			.from(sberbankTransactions)
			.where(
				and(
					eq(sberbankTransactions.organizationId, orgId),
					eq(sberbankTransactions.orderId, orderId),
				),
			)
			.limit(1);

		if (txRow) {
			return reply.code(200).send({
				success: true,
				status: txRow.status,
				amountKopecks: Number(txRow.amountKopecks),
				amountKop: Number(txRow.amountKopecks),
				orderId: txRow.orderId,
				rrn,
				message: `Транзакция найдена: статус ${txRow.status}.`,
			});
		}

		return reply.code(404).send({
			error: "TransactionNotFound",
			message: `Транзакция с RRN '${rrn}' и orderId '${orderId}' не найдена.`,
		});
	});
};

export const voidSberPosHandler = async (request: FastifyRequest, reply: FastifyReply) => {
	const perm = await requirePermission(request, reply, "finance.write");
	if (!perm) return;

	const orgId = await requireResolvedOrganizationId(request, reply, "sberbank pos void");
	if (!orgId) return;

	const body = (request.body as Record<string, unknown> | null) ?? {};
	const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
	const rrn = typeof body.rrn === "string" ? body.rrn.trim() : "";

	if (!orderId) {
		return reply.code(400).send({
			error: "MissingOrderId",
			message: "Требуется указать orderId для отмены транзакции.",
		});
	}

	return await withTenantCtx(orgId, async (tx) => {
		const [lockedTx] = await tx
			.select()
			.from(sberbankTransactions)
			.where(
				and(
					eq(sberbankTransactions.organizationId, orgId),
					eq(sberbankTransactions.orderId, orderId),
				),
			)
			.for("update")
			.limit(1);

		if (!lockedTx) {
			return reply.code(404).send({
				error: "TransactionNotFound",
				message: `Транзакция с идентификатором '${orderId || rrn}' не найдена для отмены.`,
			});
		}

		const [lockedPayment] = await tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					or(
						eq(payments.clientMutationId, `sberpos:${lockedTx.orderId}`),
						eq(payments.clientMutationId, `sberbank:${lockedTx.orderId}`),
					),
				),
			)
			.for("update")
			.limit(1);

		await tx
			.update(sberbankTransactions)
			.set({ status: "REVERSED", updatedAt: new Date() })
			.where(
				and(
					eq(sberbankTransactions.id, lockedTx.id),
					eq(sberbankTransactions.organizationId, orgId),
				),
			);

		if (lockedPayment) {
			await tx
				.update(payments)
				.set({ status: "refunded", updatedAt: new Date() })
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.id, lockedPayment.id),
					),
				);

			if (lockedPayment.status === "paid") {
				const refundKopecks =
					lockedPayment.amountKopecks !== null && lockedPayment.amountKopecks > 0n
						? Number(lockedPayment.amountKopecks)
						: Number(lockedTx.amountKopecks);
				const refundRub = kopecksToRubles(refundKopecks);
				const returnPayload = Fiscal54FzService.buildStatutoryFiscalReceipt({
					organizationId: orgId,
					patientId: lockedTx.patientId,
					customerContact: "cardholder@clinic.ru",
					cashierFullName: "Кассир-администратор",
					operationType: "income_return",
					defaultCalculationMethod: "full_payment",
					tenderSplits: { electronicCardRub: refundRub },
					positions: [
						{
							name: `Отмена операции терминала ${lockedTx.orderId}`,
							priceRub: refundRub,
							quantity: 1,
							subject: "service",
							method: "full_payment",
							vatRate: "vat_none",
						},
					],
					visitId: lockedTx.visitId,
					documentId: lockedTx.documentId,
					invoiceId: lockedTx.invoiceId,
					clientMutationId: `sberpos:${lockedTx.orderId}:return`,
				});
				await tx.insert(fiscalReceiptQueue).values({
					organizationId: orgId,
					paymentId: lockedPayment.id,
					visitId: lockedTx.visitId || null,
					receiptType: "income_return",
					status: "pending_print",
					payloadJson: {
						...returnPayload,
						tag1020_totalRub: returnPayload.tag1020_totalRubString,
					},
					retryCount: 0,
				});
			}
		}

		if (lockedTx.invoiceId && isValidUuid(lockedTx.invoiceId)) {
			await reconcileInvoiceBalanceInDb(tx, orgId, lockedTx.invoiceId);
		}

		return reply.code(200).send({
			success: true,
			status: "REVERSED",
			orderId: lockedTx.orderId,
			message: "Операция успешно отменена на терминале.",
		});
	});
};

export const sberPosTransactionHandler = async (request: FastifyRequest, reply: FastifyReply) => {
	const perm = await requirePermission(request, reply, "finance.write");
	if (!perm) return;

	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"sberbank pos transaction",
	);
	if (!orgId) return;

	const parsed = executeSberPosTransactionSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message:
				"Некорректные параметры для выполнения транзакции POS-терминала Сбербанк.",
			details: parsed.error.issues,
		});
	}

	const input = parsed.data;
	const orderId =
		input.orderId ||
		`POS-${crypto.randomUUID().slice(0, 18).toUpperCase()}`;
	const rrn = input.originalRrn || `400${Date.now().toString().slice(-9)}`;
	const authCode =
		input.originalAuthCode ||
		crypto.randomBytes(3).toString("hex").toUpperCase();
	const nowIso = new Date().toISOString();
	const op = (input.operation || "sale") as SberPosOperationType;

	return await withTenantCtx(orgId, async (tx) => {
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

		const status =
			op === "refund" ? "REFUNDED" : op === "void" ? "REVERSED" : "SETTLED";

		if (status === "SETTLED" && input.amountKopecks <= 0) {
			return reply.code(400).send({
				error: "InvalidAmount",
				message: "Сумма продажи POS-терминала должна быть строго больше нуля в копейках.",
			});
		}

		const patientId = input.patientId || existingTx?.patientId;
		if (!patientId) {
			return reply.code(400).send({
				error: "PatientRequired",
				message: "Необходимо указать идентификатор пациента (patientId) для проведения транзакции.",
			});
		}

		if (existingTx) {
			await tx
				.update(sberbankTransactions)
				.set({
					status,
					amountKopecks: BigInt(input.amountKopecks || Number(existingTx.amountKopecks)),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(sberbankTransactions.id, existingTx.id),
						eq(sberbankTransactions.organizationId, orgId),
					),
				);
		} else {
			await tx.insert(sberbankTransactions).values({
				organizationId: orgId,
				patientId,
				visitId: input.visitId || null,
				invoiceId: input.invoiceId || null,
				orderId,
				amountKopecks: BigInt(input.amountKopecks),
				status,
			});
		}

		// Synchronize ledger payments table
		if (status === "SETTLED") {
			const amountRub = kopecksToRubles(input.amountKopecks);
			const clientMutationId = `sberpos:${orderId}`;

			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						or(
							eq(payments.clientMutationId, clientMutationId),
							eq(payments.clientMutationId, `sberbank:${orderId}`),
						),
					),
				)
				.for("update")
				.limit(1);

			if (!existingPayment) {
				const effectiveInvoiceId = input.invoiceId || existingTx?.invoiceId || null;
				const resolvedDocumentId =
					existingTx?.documentId ||
					(effectiveInvoiceId && isValidUuid(effectiveInvoiceId) ? effectiveInvoiceId : null);
				await tx
					.insert(payments)
					.values({
						organizationId: orgId,
						patientId,
						visitId: input.visitId || existingTx?.visitId || null,
						documentId: resolvedDocumentId,
						method: "card",
						status: "paid",
						amountRub,
						amountKopecks: BigInt(input.amountKopecks),
						paidAt: new Date(),
						clientMutationId,
						note: `Оплата через Sberbank POS терминал (заказ ${orderId})`,
					})
					.onConflictDoNothing({
						target: [payments.organizationId, payments.clientMutationId],
					});

				if (effectiveInvoiceId && isValidUuid(effectiveInvoiceId)) {
					await reconcileInvoiceBalanceInDb(tx, orgId, effectiveInvoiceId);
				}
			}
		} else if (status === "REFUNDED" || status === "REVERSED") {
			const [lockedPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						or(
							eq(payments.clientMutationId, `sberpos:${orderId}`),
							eq(payments.clientMutationId, `sberbank:${orderId}`),
						),
					),
				)
				.for("update")
				.limit(1);

			if (lockedPayment) {
				await tx
					.update(payments)
					.set({ status: "refunded", updatedAt: new Date() })
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.id, lockedPayment.id),
						),
					);

				if (lockedPayment.status === "paid") {
					const refundKopecks =
						lockedPayment.amountKopecks !== null && lockedPayment.amountKopecks > 0n
							? Number(lockedPayment.amountKopecks)
							: input.amountKopecks > 0
								? input.amountKopecks
								: Number(existingTx?.amountKopecks ?? 0);
					if (refundKopecks > 0) {
						const refundRub = kopecksToRubles(refundKopecks);
						const returnPayload = Fiscal54FzService.buildStatutoryFiscalReceipt({
							organizationId: orgId,
							patientId,
							customerContact: "cardholder@clinic.ru",
							cashierFullName: "Кассир-администратор",
							operationType: "income_return",
							defaultCalculationMethod: "full_payment",
							tenderSplits: { electronicCardRub: refundRub },
							positions: [
								{
									name: `Возврат POS терминала ${orderId}`,
									priceRub: refundRub,
									quantity: 1,
									subject: "service",
									method: "full_payment",
									vatRate: "vat_none",
								},
							],
							visitId: input.visitId || existingTx?.visitId || null,
							documentId: existingTx?.documentId || null,
							invoiceId: input.invoiceId || existingTx?.invoiceId || null,
							clientMutationId: `sberpos:${orderId}:return`,
						});
						await tx.insert(fiscalReceiptQueue).values({
							organizationId: orgId,
							paymentId: lockedPayment.id,
							visitId: input.visitId || existingTx?.visitId || null,
							receiptType: "income_return",
							status: "pending_print",
							payloadJson: {
								...returnPayload,
								tag1020_totalRub: returnPayload.tag1020_totalRubString,
							},
							retryCount: 0,
						});
					}
				}
			}

			const effectiveInvoiceId = input.invoiceId || existingTx?.invoiceId;
			if (effectiveInvoiceId && isValidUuid(effectiveInvoiceId)) {
				await reconcileInvoiceBalanceInDb(tx, orgId, effectiveInvoiceId);
			}
		}

		const [org] = await tx
			.select({
				name: organizations.name,
				inn: organizations.inn,
				legalAddress: organizations.legalAddress,
			})
			.from(organizations)
			.where(eq(organizations.id, orgId))
			.limit(1);

		const config = {
			terminalId: input.terminalId || "POS-TERM-01",
			merchantId: process.env.SBER_MERCHANT_ID || input.terminalId || "SBER_MERCHANT",
			hostIp: "127.0.0.1",
			hostPort: 4000,
			protocol: "pilot_nt" as const,
			hardwareModel: "sber_smartpos" as const,
			timeoutMs: 60000,
			retryCount: 2,
			clinicName: org?.name || "Клиника",
			clinicAddress: org?.legalAddress || "",
			clinicInn: org?.inn || "",
		};

		const slipData = {
			operation: op,
			amountKop: input.amountKopecks,
			rrn,
			authCode,
			cardHash: input.cardHash || "••••",
			cardIssuer: input.cardIssuer || "BANK_CARD",
			aid: "A0000006581010",
			tvr: "0000008000",
			dateTime: nowIso.slice(0, 19).replace("T", " "),
			responseCode: "00",
			orderId,
		};

		const customerSlip = formatSberBankSlip(config, {
			...slipData,
			isCustomerCopy: true,
		});
		const merchantSlip = formatSberBankSlip(config, {
			...slipData,
			isCustomerCopy: false,
		});

		const responsePayload: SberPosTransactionResponse = {
			success: true,
			responseCode: "00",
			responseMessageRu: "Одобрено",
			terminalId: input.terminalId,
			merchantId: config.merchantId,
			rrn,
			authCode,
			cardHash: input.cardHash || "2200********4819",
			cardIssuer: input.cardIssuer || "МИР",
			aid: "A0000006581010",
			tvr: "0000008000",
			amountKop: input.amountKopecks,
			transactionDateTime: nowIso,
			operationType: op,
			customerSlip,
			merchantSlip,
		};

		return reply.code(200).send(responsePayload);
	});
};
