/**
 * receiptSelfCorrectionHandler.ts — 54-FZ Self-Initiated Correction Receipts (Tag 1173 = 0).
 * Implements 3-Phase Outbox Pattern + SHA-256 Composite Idempotency Conflict Guard.
 */

import {
	buildFiscalReceiptPayloadSignature,
	type CreateFiscalReceiptPayloadInput,
	kopecksToNumericString,
	verifyFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import { fiscalReceiptQueue } from "../../../../db/schema.js";
import { LanKktDriverService } from "../../../../services/hardware/index.js";
import { FiscalReceiptFactory } from "../../../../services/kkt/FiscalReceiptFactory.js";
import { isValidUuid } from "../../../../utils/httpIdempotency.js";
import {
	fiscalCorrectionPayloadSchema,
	resolvePatientCustomerContact,
	validateCorrectionKopecks,
} from "./receiptCorrectionValidation.js";

/**
 * POST /api/fiscal/correction/self-calculation
 * Issues 54-FZ Self-Initiated Correction Receipt (Tag 1173 = 0, self_initiated).
 */
export async function handleFiscalSelfCorrection(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal self correction create");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const rawBody = request.body;
	const body: Record<string, unknown> =
		rawBody && typeof rawBody === "object" && !Array.isArray(rawBody)
			? (rawBody as Record<string, unknown>)
			: {};
	const normalizedInput = {
		...body,
		isCorrection: true,
		correctionType: "self_initiated",
		correctionDocDate:
			typeof body["correctionDocDate"] === "string"
				? body["correctionDocDate"]
				: new Date().toISOString().slice(0, 10),
		correctionDocNumber:
			typeof body["correctionDocNumber"] === "string"
				? body["correctionDocNumber"]
				: "АКТ-САМОКОРРЕКЦИЯ",
	};

	const parsed = fiscalCorrectionPayloadSchema.safeParse(normalizedInput);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры чека самостоятельной коррекции",
			details: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);
	const rawMutationId = data.clientMutationId?.trim() || headerIdempotencyKey?.trim();
	const baseMutationId = rawMutationId?.includes("#")
		? rawMutationId.split("#")[0]
		: rawMutationId;

	if (!rawMutationId || !isValidUuid(baseMutationId || "")) {
		return reply.status(400).send({
			error: "IdempotencyKeyRequired",
			message: "Для чека коррекции обязателен валидный заголовок Idempotency-Key (UUIDv7)",
		});
	}
	const clientMutationId = rawMutationId;

	const kopecksValidation = validateCorrectionKopecks(data);
	if (!kopecksValidation.valid) {
		return reply.status(400).send({
			error: "ValidationError",
			message: kopecksValidation.error,
		});
	}

	reply.header("Idempotency-Key", clientMutationId);
	reply.header("X-Idempotency-Key", clientMutationId);

	const patientContact = await resolvePatientCustomerContact(orgId, data.patientId);
	const preparedInput: CreateFiscalReceiptPayloadInput = {
		...data,
		clientMutationId,
		customerContact: patientContact || data.customerContact || null,
		isCorrection: true,
		correctionType: "self_initiated",
		correctionDocDate: data.correctionDocDate,
		correctionDocNumber: data.correctionDocNumber,
	};

	const compiled = FiscalReceiptFactory.buildFfd12Receipt(preparedInput);
	const expectedSignature = buildFiscalReceiptPayloadSignature({
		patientId: data.patientId,
		operationType: data.operationType,
		taxationSystem: data.taxationSystem,
		totalKopecks: data.totalKopecks,
		cashKopecks: data.cashKopecks,
		electronicCardKopecks: data.electronicCardKopecks,
		sbpKopecks: data.sbpKopecks,
		prepaidKopecks: data.prepaidKopecks,
		creditKopecks: data.creditKopecks,
		items: data.items,
	});

	// Phase 1: Fast Transaction (Advisory Lock + Idempotency + Conflict Check + Outbox Buffer)
	const preflight = await withTenantCtx(orgId, async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${clientMutationId}))`,
		);

		const [existingRow] = await tx
			.select()
			.from(fiscalReceiptQueue)
			.where(
				and(
					eq(fiscalReceiptQueue.organizationId, orgId),
					sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${clientMutationId}`,
				),
			)
			.limit(1);

		if (existingRow) {
			const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
			const verification = verifyFiscalCompositeIdempotencyKey(
				clientMutationId,
				expectedSignature,
			);
			const totalKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalKopecks;
			if (!verification.isValid || !totalKopecksMatch) {
				return { kind: "conflict" as const };
			}
			return {
				kind: "replay" as const,
				responseData: {
					success: true,
					replayed: true,
					correctionQueueId: existingRow.id,
					status: existingRow.status === "hardware_offline" ? "hardware_offline" : "completed",
					fnSerial: (storedPayload["fnSerial"] as string) || undefined,
					fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || undefined,
					fiscalSign: (storedPayload["fiscalSign"] as string) || undefined,
					ofdVerificationUrl: (storedPayload["ofdVerificationUrl"] as string) || undefined,
					totalRub: kopecksToNumericString(data.totalKopecks),
					message: "Чек коррекции успешно сформирован (повтор)",
				},
			};
		}

		const [queueRow] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				receiptType: "correction",
				status: "pending_print",
				payloadJson: {
					...compiled,
					clientMutationId,
				},
				lastError: null,
				retryCount: 0,
				printedAt: null,
			})
			.returning();

		return { kind: "buffered" as const, queueRow };
	});

	if (preflight.kind === "conflict") {
		return reply.status(409).send({
			error: "FiscalReceiptConflictError",
			message: "Чек коррекции с таким ключом операции уже зарегистрирован с другими параметрами.",
		});
	}

	if (preflight.kind === "replay") {
		reply.header("idempotency-replayed", "true");
		reply.header("x-idempotency-replayed", "true");
		return reply.status(200).send(preflight.responseData);
	}

	if (!preflight.queueRow) {
		return reply.status(500).send({
			error: "FiscalBufferError",
			message: "Не удалось буферизовать чек коррекции в очереди фискализации",
		});
	}

	const queueRow = preflight.queueRow;

	// Phase 2: Hardware Network I/O OUTSIDE database transaction
	const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
	const isOffline = printResult.status === "hardware_offline";
	const now = new Date();

	// Phase 3: Fast Transaction (Finalize Queue Item)
	await withTenantCtx(orgId, async (tx) => {
		await tx
			.update(fiscalReceiptQueue)
			.set({
				status: printResult.status,
				payloadJson: {
					...compiled,
					clientMutationId,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					receiptIssuedAt: printResult.receiptIssuedAt,
				},
				lastError: isOffline ? printResult.errorMessage || "Касса оффлайн при коррекции" : null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
				updatedAt: now,
			})
			.where(and(eq(fiscalReceiptQueue.id, queueRow.id), eq(fiscalReceiptQueue.organizationId, orgId)));
	});

	return reply.status(201).send({
		success: true,
		replayed: false,
		correctionQueueId: queueRow.id,
		status: isOffline ? "hardware_offline" : "completed",
		fnSerial: printResult.fnSerial,
		fiscalDocumentNumber: printResult.fiscalDocumentNumber,
		fiscalSign: printResult.fiscalSign,
		ofdVerificationUrl: printResult.ofdVerificationUrl,
		totalRub: kopecksToNumericString(data.totalKopecks),
		message: "Чек коррекции успешно сформирован",
	});
}
