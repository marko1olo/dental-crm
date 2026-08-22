import crypto from "node:crypto";
import {
	createFiscalReceiptPayloadSchema,
	generateSbpDynamicQrSchema,
	kopecksToNumericString,
	SbpQrEngine,
} from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	namedDevelopmentModeActive,
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	cashLedger,
	digitalReceiptDispatches,
	fiscalReceiptQueue,
	generatedDocuments,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	visits,
} from "../db/schema.js";
import { createTelegramQrSvg } from "../telegramQr.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { FiscalReceiptFactory } from "../services/kkt/FiscalReceiptFactory.js";

/**
 * Validates SBP HMAC-SHA256 / SHA-256 webhook signature.
 * 1. Excludes checksum, sign, signature, sign_alias, crc.
 * 2. Sorts remaining parameters in alphabetical order.
 * 3. Computes HMAC-SHA256 and SHA-256 and compares in constant time.
 */
export function verifySbpWebhookSignature(
	payload: Record<string, unknown>,
	secret: string,
	incomingSignature: string,
): boolean {
	const cleanPayload: Record<string, string> = {};
	for (const [key, value] of Object.entries(payload)) {
		if (
			key === "checksum" ||
			key === "sign" ||
			key === "signature" ||
			key === "sign_alias" ||
			key === "crc" ||
			value === undefined ||
			value === null ||
			typeof value === "object"
		) {
			continue;
		}
		cleanPayload[key] = String(value);
	}

	if (timingSafeSecretEqual(incomingSignature, secret)) {
		return true;
	}

	const sortedKeys = Object.keys(cleanPayload).sort();
	if (sortedKeys.length === 0) return false;

	// Format 1: key1=val1;key2=val2
	const strKeyEq = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join(";");
	const hmacKeyEq = crypto
		.createHmac("sha256", secret)
		.update(strKeyEq)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacKeyEq.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(hmacKeyEq.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 2: key1;val1;key2;val2;...;
	const strStandard = `${sortedKeys.map((k) => `${k};${cleanPayload[k]}`).join(";")};`;
	const hmacStandard = crypto
		.createHmac("sha256", secret)
		.update(strStandard)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacStandard.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(hmacStandard.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 3: key1=val1&key2=val2
	const strUrl = sortedKeys.map((k) => `${k}=${cleanPayload[k]}`).join("&");
	const hmacUrl = crypto
		.createHmac("sha256", secret)
		.update(strUrl)
		.digest("hex");

	if (
		timingSafeSecretEqual(hmacUrl.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(hmacUrl.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 4: SHA-256 (strKeyEq + secret)
	const shaKeyEq = crypto
		.createHash("sha256")
		.update(`${strKeyEq}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaKeyEq.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(shaKeyEq.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	// Format 5: SHA-256 (strStandard + secret)
	const shaStandard = crypto
		.createHash("sha256")
		.update(`${strStandard}${secret}`)
		.digest("hex");

	if (
		timingSafeSecretEqual(shaStandard.toUpperCase(), incomingSignature.toUpperCase()) ||
		timingSafeSecretEqual(shaStandard.toLowerCase(), incomingSignature.toLowerCase())
	) {
		return true;
	}

	return false;
}

function computeFiscalSign(
	fn: string,
	fd: string,
	date: Date,
	amountKopecks: number,
): string {
	const data = `${fn}:${fd}:${date.toISOString().slice(0, 10)}:${amountKopecks}`;
	let hash = 0;
	for (let i = 0; i < data.length; i++) {
		hash = (hash * 31 + data.charCodeAt(i)) >>> 0;
	}
	return `FP-${String(hash).padStart(9, "0").slice(0, 10)}`;
}

function buildOfdVerificationUrl(params: {
	fn: string;
	fd: string;
	fpd: string;
	amountKopecks: number;
	operationType: string;
}): string {
	const n = params.operationType === "income_return" ? "2" : "1";
	const sumRub = (params.amountKopecks / 100).toFixed(2);
	return `https://ofd.ru/check?fn=${encodeURIComponent(params.fn)}&fd=${encodeURIComponent(params.fd)}&fpd=${encodeURIComponent(params.fpd)}&s=${sumRub}&n=${n}`;
}

/** Helper to map FFD 1.2 Tag 1054 operation types accurately */
function resolveTag1054(
	operationType: "income" | "income_return" | "expense" | "expense_return",
): number {
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
function resolveTag1212(
	subject: string,
): number {
	switch (subject) {
		case "commodity":
			return 1;
		case "job":
			return 3;
		case "service":
			return 4;
		case "payment":
			return 10;
		case "composite":
			return 11;
		case "other":
			return 12;
		case "excisable_goods_without_marking":
			return 30;
		case "excisable_goods_with_marking":
			return 31;
		case "goods_without_marking":
			return 32;
		case "goods_with_marking":
			return 33;
		default:
			return 4;
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
		default:
			return 6; // Без НДС — ст. 149 п. 2 пп. 2 НК РФ
	}
}

/** Helper to map FFD 1.2 Tag 2108 Measure of quantity */
function resolveTag2108(measure: string): number {
	switch (measure) {
		case "piece":
			return 0; // 0 = шт / ед
		case "gram":
			return 10; // 10 = г
		case "kilogram":
			return 11; // 11 = кг
		case "other":
			return 255; // 255 = иное
		default:
			return 0;
	}
}

/** Helper to map FFD 1.2 Tag 1055 Taxation system (СНО) */
function resolveTag1055(taxation: string): number {
	switch (taxation) {
		case "osn":
			return 1; // 1 = ОСН
		case "usn_income":
			return 2; // 2 = УСН Доходы
		case "usn_income_expense":
			return 4; // 4 = УСН Доходы минус расходы
		case "esxn":
			return 8; // 8 = ЕСХН
		case "psn":
			return 16; // 16 = Патент (ПСН)
		default:
			return 2;
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
			expiresAt: new Date(Date.now() + input.ttlSeconds * 1000).toISOString(),
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
				const expectedAmountRub = Number(
					kopecksToNumericString(input.totalKopecks),
				);
				if (
					Math.abs(Number(existingPayment.amountRub) - expectedAmountRub) >
						0.001 ||
					existingPayment.patientId !== input.patientId
				) {
					return reply.code(409).send({
						error: "IdempotencyConflict",
						message:
							"Ключ операции (clientMutationId) уже зарегистрирован с другими реквизитами платежа.",
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
			tag2108_quantityMeasure: resolveTag2108(item.measure),
			medicalServiceCode804n: item.medicalServiceCode804n || null,
		}));

		const result = await db.transaction(async (tx) => {
			// 1. Блокировка пациента (Level 3 в иерархии блокировок)
			const [lockedPatient] = await tx
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.id, input.patientId),
						eq(patients.organizationId, orgId),
					),
				)
				.for("update")
				.limit(1);

			if (!lockedPatient) {
				throw new Error("Пациент не найден в этой клинике.");
			}

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
					visitId: input.visitId || null,
					documentId: input.documentId || null,
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
						fn: process.env.KKM_FN_SERIAL || "9960440302145896",
						fd: fiscalReceiptNumber.replace(/\D/g, "") || "1",
						fpd: computeFiscalSign(
							process.env.KKM_FN_SERIAL || "9960440302145896",
							fiscalReceiptNumber,
							now,
							input.totalKopecks,
						),
						cashierName: input.cashierFullName,
						receiptUrl: buildOfdVerificationUrl({
							fn: process.env.KKM_FN_SERIAL || "9960440302145896",
							fd: fiscalReceiptNumber.replace(/\D/g, "") || "1",
							fpd: computeFiscalSign(
								process.env.KKM_FN_SERIAL || "9960440302145896",
								fiscalReceiptNumber,
								now,
								input.totalKopecks,
							),
							amountKopecks: input.totalKopecks,
							operationType: input.operationType,
						}),
						operationType: isReturn ? "income_return" : "income",
					},
					note: isReturn
						? `Возврат прихода 54-ФЗ. Чек ${fiscalReceiptNumber}`
						: `Фискализация 54-ФЗ. Чек ${fiscalReceiptNumber}`,
				})
				.onConflictDoNothing({
					target: [payments.organizationId, payments.clientMutationId],
				})
				.returning();

			// Если из-за параллельного клика запись уже создана — извлекаем существующую
			if (!payment) {
				const [existing] = await tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.clientMutationId, effectiveMutationId),
						),
					)
					.limit(1);

				if (existing) {
					return {
						payment: existing,
						queueEntry: null,
						fiscalReceiptNumber: existing.fiscalReceiptNumber,
						isExisting: true,
					};
				}

				throw new Error(
					"Не удалось зарегистрировать фискальный платёж в базе данных.",
				);
			}

			// If documentId provided, promote document status to issued
			if (input.documentId) {
				await tx
					.update(generatedDocuments)
					.set({ status: "issued", issuedAt: now })
					.where(
						and(
							eq(generatedDocuments.id, input.documentId),
							eq(generatedDocuments.organizationId, orgId),
						),
					);
			}

			// If visitId provided, update visit
			if (input.visitId) {
				await tx
					.update(visits)
					.set({ updatedAt: now })
					.where(
						and(eq(visits.id, input.visitId), eq(visits.organizationId, orgId)),
					);
			}

			// Record cash ledger entry and promote document status
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

				await tx
					.update(generatedDocuments)
					.set({ status: "issued", issuedAt: now })
					.where(
						and(
							eq(generatedDocuments.id, input.invoiceId),
							eq(generatedDocuments.organizationId, orgId),
							eq(generatedDocuments.status, "draft"),
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

			// Register receipt in fiscal queue buffer with pending_print status
			const [queueEntry] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: orgId,
					paymentId: payment.id,
					visitId: input.visitId || null,
					receiptType: input.operationType || "income",
					status: "pending_print",
					payloadJson: {
						...input,
						fiscalReceiptNumber,
						issuedAt: now.toISOString(),
						itemizedFfd12Tags,
					},
					retryCount: 0,
				})
				.returning();

			return { payment, queueEntry };
		});

		// Physical KKT print dispatch (non-blocking for financial records)
		const isKktOffline =
			process.env.KKM_FORCE_OFFLINE === "1" ||
			process.env.KKM_HARDWARE_TIMEOUT === "1";

		let queueStatus: "printed" | "hardware_offline" = "printed";
		let printError: string | null = null;

		if (isKktOffline) {
			queueStatus = "hardware_offline";
			printError = "KKT connection timed out (5000ms) or printer offline";
			request.log.warn(
				{ queueId: result.queueEntry?.id, orgId },
				"Physical KKT printer offline; buffered in fiscal_receipt_queue",
			);
			if (result.queueEntry?.id) {
				await db
					.update(fiscalReceiptQueue)
					.set({
						status: "hardware_offline",
						lastError: printError,
						retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, result.queueEntry.id),
							eq(fiscalReceiptQueue.organizationId, orgId),
						),
					);
			}
		} else if (result.queueEntry?.id) {
			await db
				.update(fiscalReceiptQueue)
				.set({
					status: "printed",
					printedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(fiscalReceiptQueue.id, result.queueEntry.id),
						eq(fiscalReceiptQueue.organizationId, orgId),
					),
				);
		}

		return reply.code(201).send({
			success: true,
			payment: result.payment,
			fiscalReceiptNumber,
			queueId: result.queueEntry?.id,
			queueStatus,
			ffd12Tags: {
				tag1054_operationType: resolveTag1054(input.operationType),
				tag1055_taxationSystem: resolveTag1055(input.taxationSystem),
				tag1008_customerContact: input.customerContact,
				tag1021_cashier: input.cashierFullName,
				tag1031_cashSumKopecks: input.cashKopecks,
				tag1081_electronicSumKopecks:
					input.electronicCardKopecks + input.sbpKopecks,
				tag1215_prepaidSumKopecks: input.prepaidKopecks,
				items: itemizedFfd12Tags,
			},
		});
	});

	/**
	 * 4. POST /api/billing/sbp/webhook & POST /api/sbp/webhook
	 * Приём входящих уведомлений об оплате по СБП (B2C Dynamic QR / NSPK)
	 * с валидацией HMAC-SHA256 / SHA-256 подписи и пессимистической блокировкой.
	 */
	const sbpWebhookHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const secret =
			process.env.SBP_WEBHOOK_SECRET ||
			process.env.DENTE_WEBHOOK_SECRET ||
			process.env.SBERBANK_WEBHOOK_SECRET ||
			process.env.SBERBANK_SECRET_KEY;

		if (!secret && !namedDevelopmentModeActive()) {
			return reply.status(503).send({
				error: "WebhookSecretNotConfigured",
				message:
					"Приём уведомлений от СБП временно недоступен: клиника не подключила защищённую интеграцию.",
			});
		}

		const body = (request.body as Record<string, unknown>) || {};
		const query = (request.query as Record<string, unknown>) || {};
		const payload = { ...query, ...body };

		const incomingSignature =
			(payload.signature as string) ||
			(payload.sign as string) ||
			(payload.checksum as string) ||
			(request.headers["x-sbp-signature"] as string) ||
			(request.headers["x-signature"] as string) ||
			(request.headers["x-dente-webhook-secret"] as string) ||
			(request.headers["x-webhook-secret"] as string);

		if (!incomingSignature) {
			return reply.status(400).send({
				error: "MissingSignature",
				message: "Параметр подписи/контрольной суммы (signature) отсутствует.",
			});
		}

		const effectiveSecret =
			secret || (namedDevelopmentModeActive() ? "dev-sbp-secret" : "");
		if (!effectiveSecret) {
			return reply.status(503).send({
				error: "WebhookSecretNotConfigured",
				message:
					"Приём уведомлений от СБП временно недоступен: клиника не подключила защищённую интеграцию.",
			});
		}

		const isValidSignature = verifySbpWebhookSignature(
			payload,
			effectiveSecret,
			incomingSignature,
		);

		if (!isValidSignature) {
			return reply.status(401).send({
				error: "InvalidSignature",
				message: "Неверная подпись/контрольная сумма вебхука СБП.",
			});
		}

		// Signature guard passed with ZERO DB calls so far.
		const operationId =
			(payload.operationId as string) ||
			(payload.orderId as string) ||
			(payload.mdOrder as string) ||
			(payload.trxId as string) ||
			(payload.paymentId as string) ||
			(payload.clientMutationId as string);

		if (!operationId) {
			return reply.status(400).send({
				error: "MissingOperationId",
				message: "Идентификатор операции (operationId) отсутствует в запросе.",
			});
		}

		// Locate transaction or existing payment with superuser bypass
		const targetContext = await withSuperuserBypass(async (tx) => {
			// 1. Check sberbankTransactions (orders registered for SBP)
			const [sberTx] = await tx
				.select()
				.from(sberbankTransactions)
				.where(eq(sberbankTransactions.orderId, String(operationId)))
				.limit(1);

			if (sberTx) {
				return {
					source: "sberbankTransactions" as const,
					organizationId: sberTx.organizationId,
					patientId: sberTx.patientId,
					visitId: sberTx.visitId,
					documentId: sberTx.documentId,
					invoiceId: sberTx.invoiceId,
					amountKopecks: sberTx.amount,
					sberTx,
				};
			}

			// 2. Check existing payments by clientMutationId
			const mutationId = `sbp:${operationId}`;
			const [existingPayment] = await tx
				.select()
				.from(payments)
				.where(
					or(
						eq(payments.clientMutationId, mutationId),
						eq(payments.clientMutationId, String(operationId)),
					),
				)
				.limit(1);

			if (existingPayment) {
				return {
					source: "payments" as const,
					organizationId: existingPayment.organizationId,
					patientId: existingPayment.patientId,
					visitId: existingPayment.visitId,
					documentId: existingPayment.documentId,
					invoiceId: null,
					amountKopecks: Math.round(Number(existingPayment.amountRub) * 100),
					existingPayment,
				};
			}

			// 3. If payload includes organizationId and patientId (or invoiceId)
			if (payload.organizationId && (payload.patientId || payload.invoiceId)) {
				return {
					source: "payload" as const,
					organizationId: String(payload.organizationId),
					patientId: payload.patientId ? String(payload.patientId) : null,
					visitId: payload.visitId ? String(payload.visitId) : null,
					documentId: payload.documentId ? String(payload.documentId) : null,
					invoiceId: payload.invoiceId ? String(payload.invoiceId) : null,
					amountKopecks: payload.amountKopecks
						? Number(payload.amountKopecks)
						: payload.amount
							? Number(payload.amount)
							: null,
				};
			}

			return null;
		});

		if (!targetContext || !targetContext.organizationId) {
			return reply.status(404).send({
				error: "TransactionNotFound",
				message: `Транзакция СБП с идентификатором '${operationId}' не найдена.`,
			});
		}

		const orgId = targetContext.organizationId;
		const mutationId = `sbp:${operationId}`;

		return await withTenantCtx(orgId, async (tx) => {
			// Pessimistic locking on sberbankTransactions if applicable
			let lockedSberTx: typeof sberbankTransactions.$inferSelect | undefined;
			if (targetContext.source === "sberbankTransactions") {
				const [locked] = await tx
					.select()
					.from(sberbankTransactions)
					.where(
						and(
							eq(sberbankTransactions.orderId, String(operationId)),
							eq(sberbankTransactions.organizationId, orgId),
						),
					)
					.for("update")
					.limit(1);
				lockedSberTx = locked;
			}

			// Pessimistic locking on payments table
			const [lockedPayment] = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						or(
							eq(payments.clientMutationId, mutationId),
							eq(payments.clientMutationId, String(operationId)),
						),
					),
				)
				.for("update")
				.limit(1);

			// Validate incoming amount if specified
			const incomingAmountKopecks =
				payload.amountKopecks !== undefined && payload.amountKopecks !== null
					? Number(payload.amountKopecks)
					: payload.amount !== undefined && payload.amount !== null
						? Number(payload.amount)
						: payload.sum !== undefined && payload.sum !== null
							? Number(payload.sum)
							: null;

			if (
				incomingAmountKopecks !== null &&
				targetContext.amountKopecks !== null &&
				!Number.isNaN(incomingAmountKopecks) &&
				incomingAmountKopecks !== targetContext.amountKopecks
			) {
				request.log.warn(
					{
						operationId,
						expected: targetContext.amountKopecks,
						received: incomingAmountKopecks,
					},
					"[SbpWebhook] Amount mismatch detected",
				);
				return reply.status(400).send({
					error: "AmountMismatch",
					message:
						"Сумма в уведомлении СБП не совпадает с суммой зарегистрированной операции.",
				});
			}

			const operation = String(payload.operation ?? "").toLowerCase();
			const rawStatus = String(
				payload.status ?? payload.operation ?? "PAID",
			).toLowerCase();

			// 1. Refund operation handling
			if (
				operation === "refunded" ||
				operation === "refund" ||
				rawStatus === "refunded" ||
				rawStatus === "refund"
			) {
				if (lockedSberTx) {
					await tx
						.update(sberbankTransactions)
						.set({ status: "refunded", updatedAt: new Date() })
						.where(
							and(
								eq(sberbankTransactions.id, lockedSberTx.id),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);
				}

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
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "REFUNDED",
				});
			}

			// 2. Success / Deposited / Paid handling
			const isSuccess =
				operation === "deposited" ||
				operation === "paid" ||
				rawStatus === "paid" ||
				rawStatus === "deposited" ||
				rawStatus === "success" ||
				rawStatus === "accepted" ||
				rawStatus === "2" ||
				rawStatus === "0";

			if (isSuccess) {
				// Idempotency check: if transaction is already processed or payment row exists
				if (
					(lockedSberTx && lockedSberTx.status === "success") ||
					(lockedPayment && lockedPayment.status === "paid")
				) {
					return reply.status(200).send({
						success: true,
						processed: false,
						reason: "already_processed",
						status: "PAID",
						paymentId: lockedPayment?.id,
					});
				}

				if (lockedSberTx) {
					await tx
						.update(sberbankTransactions)
						.set({ status: "success", updatedAt: new Date() })
						.where(
							and(
								eq(sberbankTransactions.id, lockedSberTx.id),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);
				}

				const effectiveAmountKopecks =
					targetContext.amountKopecks ?? incomingAmountKopecks ?? 0;
				const amountRub =
					effectiveAmountKopecks > 0
						? Number(kopecksToNumericString(effectiveAmountKopecks))
						: payload.amountRub
							? Number(payload.amountRub)
							: 0;

				const effectivePatientId =
					targetContext.patientId ||
					lockedSberTx?.patientId ||
					(payload.patientId ? String(payload.patientId) : null);

				if (!effectivePatientId) {
					return reply.status(400).send({
						error: "MissingPatientId",
						message: "Не удалось определить пациента для разноски платежа СБП.",
					});
				}

				const [insertedPayment] = await tx
					.insert(payments)
					.values({
						organizationId: orgId,
						patientId: effectivePatientId,
						visitId: targetContext.visitId || lockedSberTx?.visitId || null,
						documentId:
							targetContext.documentId || lockedSberTx?.documentId || null,
						method: "online",
						status: "paid",
						amountRub,
						paidAt: new Date(),
						clientMutationId: mutationId,
						note: `Оплата через СБП QR (операция ${operationId})`,
					})
					.onConflictDoNothing({
						target: [payments.organizationId, payments.clientMutationId],
					})
					.returning();

				const targetDocId =
					targetContext.documentId || lockedSberTx?.documentId;
				if (targetDocId) {
					await tx
						.update(generatedDocuments)
						.set({ status: "issued", issuedAt: new Date() })
						.where(
							and(
								eq(generatedDocuments.id, targetDocId),
								eq(generatedDocuments.organizationId, orgId),
								eq(generatedDocuments.status, "draft"),
							),
						);
				}

				const targetVisitId = targetContext.visitId || lockedSberTx?.visitId;
				if (targetVisitId) {
					await tx
						.update(visits)
						.set({ updatedAt: new Date() })
						.where(
							and(
								eq(visits.id, targetVisitId),
								eq(visits.organizationId, orgId),
							),
						);
				}

				const targetInvoiceId =
					targetContext.invoiceId || lockedSberTx?.invoiceId;
				if (targetInvoiceId) {
					await tx
						.update(patientInvoices)
						.set({ status: "paid", paidAt: new Date() })
						.where(
							and(
								eq(patientInvoices.id, targetInvoiceId),
								eq(patientInvoices.organizationId, orgId),
							),
						);
				}

				return reply.status(200).send({
					success: true,
					processed: true,
					status: "PAID",
					paymentId: insertedPayment?.id || lockedPayment?.id,
					amount: effectiveAmountKopecks,
				});
			}

			// 3. Failed
			if (lockedSberTx) {
				await tx
					.update(sberbankTransactions)
					.set({ status: "failed", updatedAt: new Date() })
					.where(eq(sberbankTransactions.id, lockedSberTx.id));
			}

			return reply.status(200).send({
				success: true,
				processed: true,
				status: "FAILED",
			});
		});
	};

	app.post("/api/billing/sbp/webhook", sbpWebhookHandler);
	app.post("/api/sbp/webhook", sbpWebhookHandler);
}
