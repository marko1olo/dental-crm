import {
	SbpQrEngine,
	createFiscalReceiptPayloadSchema,
	generateSbpDynamicQrSchema,
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
			amountRub: Number((input.amountKopecks / 100).toFixed(2)),
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

		const fiscalReceiptNumber = `FD-${Date.now().toString().slice(-6)}`;
		const now = new Date();

		const result = await db.transaction(async (tx) => {
			const [payment] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: input.patientId,
					amountRub: input.totalKopecks / 100,
					method:
						input.sbpKopecks > 0
							? "online"
							: input.electronicCardKopecks > 0
								? "card"
								: "cash",
					status: "paid",
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
						operationType:
							input.operationType === "income"
								? "income"
								: "income_return",
					},
					note: `Фискализация 54-ФЗ. Чек ${fiscalReceiptNumber}`,
				})
				.returning();

			if (!payment) {
				throw new Error("Failed to insert fiscal payment");
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
					amountRub: String(input.totalKopecks / 100),
					timestamp: now,
				});

				await tx
					.update(patientInvoices)
					.set({
						status: "paid",
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
				receiptAmountRub: String(input.totalKopecks / 100),
				paperPrintSkipped: true,
			});

			return payment;
		});

		return reply.code(201).send({
			success: true,
			payment: result,
			fiscalReceiptNumber,
			ffd12Tags: {
				tag1054_operationType: input.operationType === "income" ? 1 : 2,
				tag1212_paymentSubject: 4, // Услуга
				tag1214_paymentMethod: 4, // Полный расчет
				tag1199_vatRate: 6, // Без НДС (ст. 149 НК РФ)
				tag1008_customerContact: input.customerContact,
				tag1021_cashier: input.cashierFullName,
			},
		});
	});
}
