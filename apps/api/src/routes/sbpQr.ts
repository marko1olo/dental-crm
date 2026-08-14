import {
	SbpQrEngine,
	createFiscalReceiptPayloadSchema,
	generateSbpDynamicQrSchema,
	kopecksToNumericString,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import {
	cashLedger,
	digitalReceiptDispatches,
	patientInvoices,
	patients,
	payments,
} from "../db/schema.js";
import { createTelegramQrSvg } from "../telegramQr.js";

/** Helper to map FFD 1.2 Tag 1054 operation types accurately */
function resolveTag1054(operationType: "income" | "income_return" | "expense" | "expense_return"): number {
	switch (operationType) {
		case "income":
			return 1;
		case "income_return":
			return 2;
		case "expense":
			return 3;
		case "expense_return":
			return 4;
	}
}

/** Helper to map FFD 1.2 Tag 1212 payment subject */
function resolveTag1212(subject: "commodity" | "job" | "service" | "payment"): number {
	switch (subject) {
		case "commodity":
			return 1;
		case "job":
			return 3;
		case "service":
			return 4;
		case "payment":
			return 10;
	}
}

/** Helper to map FFD 1.2 Tag 1214 payment method */
function resolveTag1214(method: string): number {
	switch (method) {
		case "full_prepayment":
			return 1;
		case "prepayment":
			return 2;
		case "advance":
			return 3;
		case "full_payment":
			return 4;
		case "partial_payment_and_credit":
			return 5;
		case "credit_handover":
			return 6;
		case "credit_payment":
			return 7;
		default:
			return 4;
	}
}

/** Helper to map FFD 1.2 Tag 1199 VAT rate */
function resolveTag1199(vatRate: string): number {
	switch (vatRate) {
		case "vat_20":
			return 1;
		case "vat_10":
			return 2;
		case "vat_20_120":
			return 3;
		case "vat_10_110":
			return 4;
		case "vat_0":
			return 5;
		case "vat_none":
		default:
			return 6; // Без НДС — ст. 149 п. 2 пп. 2 НК РФ
	}
}

export async function registerSbpQrRoutes(app: FastifyInstance) {
	/**
	 * 1. POST /api/billing/sbp/generate-qr
	 * Генерация полезной нагрузки НСПК СБП (B2C Dynamic QR) с вычислением CRC16
	 * и получением векторного SVG-изображения для отображения на кассе/в счёте.
	 */
	app.post("/api/billing/sbp/generate-qr", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = generateSbpDynamicQrSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "SbpQrValidationError",
				message: "Некорректные параметры генерации QR-кода СБП.",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		const { payloadUrl, cleanOperationId, crc16 } =
			SbpQrEngine.buildNspkDynamicPayload({
				operationId: input.operationId,
				bankMemberId: input.bankMemberId,
				amountKopecks: input.amountKopecks,
				currency: input.currency,
			});

		// Render crisp vector SVG QR code using pure TS engine
		let qrSvg: string | null = null;
		try {
			qrSvg = createTelegramQrSvg(payloadUrl);
		} catch {
			qrSvg = null;
		}

		return reply.code(201).send({
			success: true,
			payloadUrl,
			operationId: cleanOperationId,
			crc16,
			amountKopecks: input.amountKopecks,
			amountRub: Number(kopecksToNumericString(input.amountKopecks)),
			currency: input.currency,
			qrSvg,
			ttlSeconds: input.ttlSeconds,
			expiresAt: new Date(
				Date.now() + input.ttlSeconds * 1000,
			).toISOString(),
		});
	});

	/**
	 * 2. POST /api/billing/sbp/verify-payload
	 * Валидация ссылки/штрихкода СБП и сверка CRC16-CCITT контрольной суммы
	 */
	app.post("/api/billing/sbp/verify-payload", async (request, reply) => {
		const bodySchema = z.object({
			payloadUrl: z.string().trim().url(),
		});
		const parsed = bodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Требуется валидный URL СБП.",
			});
		}

		const verification = SbpQrEngine.verifyNspkPayload(parsed.data.payloadUrl);
		return reply.send({
			success: true,
			verification,
		});
	});

	/**
	 * 3. POST /api/billing/fiscalize-receipt
	 * Формирование фискального чека (54-ФЗ / ФФД 1.2) с тегами 1054, 1212, 1214, 1199 (Без НДС ст. 149 НК РФ)
	 * и категоризацией для налогового вычета по НДФЛ (Код 1 vs Код 2).
	 */
	app.post("/api/billing/fiscalize-receipt", async (request, reply) => {
		const orgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"fiscalize receipt",
		);
		if (!orgId) return;

		const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "FiscalReceiptValidationError",
				message: "Некорректные реквизиты фискального чека (54-ФЗ / ФФД 1.2).",
				details: parsed.error.format(),
			});
		}
		const input = parsed.data;

		// Verify patient exists
		const [patient] = await db
			.select({ id: patients.id, fullName: patients.fullName })
			.from(patients)
			.where(
				and(
					eq(patients.id, input.patientId),
					eq(patients.organizationId, orgId),
				),
			)
			.limit(1);

		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден.",
			});
		}

		// Verify invoice if provided
		if (input.invoiceId) {
			const [invoice] = await db
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.id, input.invoiceId),
						eq(patientInvoices.organizationId, orgId),
					),
				)
				.limit(1);

			if (!invoice) {
				return reply.code(404).send({
					error: "InvoiceNotFound",
					message: "Счёт на оплату не найден в этой клинике.",
				});
			}
		}

		// Idempotency check with payload integrity verification
		if (input.clientMutationId) {
			const [existingPayment] = await db
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.clientMutationId, input.clientMutationId),
					),
				)
				.limit(1);

			if (existingPayment) {
				const expectedAmountRub = Number(kopecksToNumericString(input.totalKopecks));
				if (
					Math.abs(Number(existingPayment.amountRub) - expectedAmountRub) > 0.001 ||
					existingPayment.patientId !== input.patientId
				) {
					return reply.code(409).send({
						error: "IdempotencyConflict",
						message: "Ключ операции (clientMutationId) уже зарегистрирован с другими реквизитами платежа.",
					});
				}
				return reply.code(200).send({
					success: true,
					payment: existingPayment,
					fiscalReceiptNumber: existingPayment.fiscalReceiptNumber,
					isExisting: true,
				});
			}
		}

		const fiscalReceiptNumber = `FD-${Date.now().toString().slice(-6)}`;
		const now = new Date();
		const effectiveMutationId =
			input.clientMutationId || `fiscal:${fiscalReceiptNumber}`;

		const itemizedFfd12Tags = input.items.map((item) => ({
			name: item.name,
			priceKopecks: item.priceKopecks,
			quantity: item.quantity,
			amountKopecks: item.amountKopecks,
			tag1212_paymentSubject: resolveTag1212(item.subject),
			tag1214_paymentMethod: resolveTag1214(item.method),
			tag1199_vatRate: resolveTag1199(item.vatRate),
			medicalServiceCodeMzk: item.medicalServiceCodeMzk || null,
		}));

		const result = await db.transaction(async (tx) => {
			// 2. Блокировка и валидация счёта (если указан)
			if (input.invoiceId) {
				const [lockedInvoice] = await tx
					.select()
					.from(patientInvoices)
					.where(
						and(
							eq(patientInvoices.id, input.invoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);

				if (!lockedInvoice) {
					throw new Error("Счёт на оплату не найден в этой клинике.");
				}
			}

			const isReturn = input.operationType === "income_return";
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: input.patientId,
					clientMutationId: effectiveMutationId,
					amountRub: Number(kopecksToNumericString(input.totalKopecks)),
					method:
						input.sbpKopecks > 0
							? "online"
							: input.electronicCardKopecks > 0
								? "card"
								: "cash",
					status: isReturn ? "refunded" : "paid",
					paidAt: now,
					fiscalReceiptNumber,
					fiscalReceiptIssuedAt: now.toISOString(),
					taxDeductionCode:
						input.taxDeductionSummaryCode === "code_2_expensive_treatment"
							? "2"
							: "1",
					fiscalReceipt: {
						fn: "9999078900012345",
						fd: fiscalReceiptNumber,
						fpd: "FP-987654321",
						cashierName: input.cashierFullName,
						receiptUrl: `https://ofd.ru/check/${fiscalReceiptNumber}`,
						operationType: isReturn ? "income_return" : "income",
					},
					note: isReturn
						? `Возврат прихода 54-ФЗ. Чек ${fiscalReceiptNumber}`
						: `Фискализация 54-ФЗ. Чек ${fiscalReceiptNumber}`,
				})
				.returning();

			if (!payment) {
				throw new Error("Не удалось зарегистрировать фискальный платёж в базе данных.");
			}

			// Record cash ledger entry
			if (input.invoiceId) {
				await tx.insert(cashLedger).values({
					invoiceId: input.invoiceId,
					paymentMethod:
						input.sbpKopecks > 0
							? "card"
							: input.electronicCardKopecks > 0
								? "card"
								: "cash",
					amountRub: isReturn
						? `-${kopecksToNumericString(input.totalKopecks)}`
						: kopecksToNumericString(input.totalKopecks),
					timestamp: now,
				});

				await tx
					.update(patientInvoices)
					.set({
						status: isReturn ? "refunded" : "paid",
						paidAt: now,
					})
					.where(
						and(
							eq(patientInvoices.id, input.invoiceId),
							eq(patientInvoices.organizationId, orgId),
						),
					);
			}

			// Record digital receipt dispatch
			const isEmail = input.customerContact.includes("@");
			await tx.insert(digitalReceiptDispatches).values({
				organizationId: orgId,
				paymentId: payment.id,
				patientName: patient.fullName,
				dispatchChannel: isEmail ? "email" : "sms",
				targetDestination: input.customerContact,
				fiscalReceiptNumber,
				receiptAmountRub: kopecksToNumericString(input.totalKopecks),
				paperPrintSkipped: true,
			});

			return payment;
		});

		return reply.code(201).send({
			success: true,
			payment: result,
			fiscalReceiptNumber,
			ffd12Tags: {
				tag1054_operationType: resolveTag1054(input.operationType),
				tag1008_customerContact: input.customerContact,
				tag1021_cashier: input.cashierFullName,
				tag1031_cashSumKopecks: input.cashKopecks,
				tag1081_electronicSumKopecks: input.electronicCardKopecks + input.sbpKopecks,
				tag1215_prepaidSumKopecks: input.prepaidKopecks,
				items: itemizedFfd12Tags,
			},
		});
	});
}
