/**
 * receiptCorrectionPrescription.ts — Layer 2: 54-FZ Tax Authority Prescription Correction Receipts.
 *
 * Implements:
 * - Correction receipts issued by instruction/prescription of tax authority (Tag 1173 = 1, by_instruction).
 * - Enforces mandatory prescription document number (Tag 1179) and date (Tag 1178).
 * - Composite Idempotency-Key support with PostgreSQL advisory locking.
 * - Hardware offline fallback to fiscalReceiptQueue without blocking checkout (Mandate 8e).
 * - Unified master handler handleFiscalCorrection dispatching by correctionType.
 */

import {
	type CreateFiscalReceiptPayloadInput,
	kopecksToNumericString,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import { fiscalReceiptQueue } from "../../../../db/schema.js";
import { LanKktDriverService } from "../../../../services/hardware/index.js";
import { FiscalReceiptFactory } from "../../../../services/kkt/FiscalReceiptFactory.js";
import { handleFiscalSelfCorrection } from "./receiptCorrectionSelfCalculation.js";
import {
	fiscalCorrectionPayloadSchema,
	resolvePatientCustomerContact,
	validateCorrectionKopecks,
	validatePrescriptionRequirements,
} from "./receiptCorrectionValidation.js";

/**
 * POST /api/fiscal/correction/prescription
 * Issues 54-FZ Correction Receipt by tax authority prescription (Tag 1173 = 1, by_instruction).
 */
export async function handleFiscalPrescriptionCorrection(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal prescription correction create");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const body = (request.body || {}) as Record<string, unknown>;
	const normalizedInput = {
		...body,
		isCorrection: true,
		correctionType: "by_instruction",
	};

	const parsed = fiscalCorrectionPayloadSchema.safeParse(normalizedInput);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры чека коррекции по предписанию",
			details: parsed.error.issues,
		});
	}

	const data = parsed.data;

	// Explicit check for tax authority prescription details
	const prescriptionCheck = validatePrescriptionRequirements(
		"by_instruction",
		data.correctionDocNumber,
		data.correctionDocDate,
	);
	if (!prescriptionCheck.valid) {
		return reply.status(400).send({
			error: "ValidationError",
			message: prescriptionCheck.error,
		});
	}

	const kopecksValidation = validateCorrectionKopecks(data);
	if (!kopecksValidation.valid) {
		return reply.status(400).send({
			error: "ValidationError",
			message: kopecksValidation.error,
		});
	}

	const patientContact = await resolvePatientCustomerContact(orgId, data.patientId);
	const preparedInput: CreateFiscalReceiptPayloadInput = {
		...data,
		customerContact: patientContact || data.customerContact || "+79990000000",
		isCorrection: true,
		correctionType: "by_instruction",
		correctionDocDate: data.correctionDocDate,
		correctionDocNumber: data.correctionDocNumber,
	};

	return await withTenantCtx(orgId, async (tx) => {
		if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
			const mutationId = data.clientMutationId.trim();
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
			);

			const [existingRow] = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, orgId),
						sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${mutationId}`,
					),
				)
				.limit(1);

			if (existingRow) {
				const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
				return reply.status(200).send({
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
				});
			}
		}

		const compiled = FiscalReceiptFactory.buildFfd12Receipt(preparedInput);
		const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
		const isOffline = printResult.status === "hardware_offline";
		const now = new Date();

		const [queueRow] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				receiptType: "correction",
				status: printResult.status,
				payloadJson: {
					...compiled,
					clientMutationId: data.clientMutationId ?? null,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					receiptIssuedAt: printResult.receiptIssuedAt,
				},
				lastError: isOffline ? printResult.errorMessage || "Касса оффлайн при коррекции по предписанию" : null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
			})
			.returning();

		return reply.status(201).send({
			success: true,
			replayed: false,
			correctionQueueId: queueRow?.id,
			status: isOffline ? "hardware_offline" : "completed",
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			totalRub: kopecksToNumericString(data.totalKopecks),
			message: "Чек коррекции по предписанию успешно сформирован",
		});
	});
}

/**
 * POST /api/fiscal/correction & POST /api/finance/correction
 * Unified master handler for all 54-FZ correction receipts.
 * Routes dynamically to self_initiated or by_instruction logic.
 */
export async function handleFiscalCorrection(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const body = (request.body || {}) as Record<string, unknown>;
	const correctionType = body["correctionType"];

	if (correctionType === "by_instruction") {
		return await handleFiscalPrescriptionCorrection(request, reply);
	}

	return await handleFiscalSelfCorrection(request, reply);
}
