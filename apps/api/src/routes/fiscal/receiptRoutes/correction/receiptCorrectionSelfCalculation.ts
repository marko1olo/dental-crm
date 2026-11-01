/**
 * receiptCorrectionSelfCalculation.ts — Layer 2: 54-FZ Self-Initiated Correction & Cash Register Reversal.
 *
 * Implements:
 * - Autonomous self-initiated correction receipts (Tag 1173 = 0, self_initiated)
 *   used after cash register offline recovery, power outage, or non-fiscalized offline payments.
 * - Statutory 54-FZ return receipts (Tag 1054 = 2, income_return)
 * - Composite Idempotency-Key (<uuid>#<sha256(payload)>) with PostgreSQL advisory locks
 * - Non-blocking checkout fallback to fiscalReceiptQueue upon hardware disconnection (Mandate 8e)
 * - Proportional & full payment reversal in payments table
 * - Cash box balance deduction and shift expense recording
 */

import {
	buildFiscalRefundPayloadSignature,
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
	fiscalRefundPayloadSchema,
	kopecksToNumericString,
	kopecksToRub,
	parseKopecks,
	verifyFiscalCompositeIdempotencyKey,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	patients,
	payments,
} from "../../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../../db/seeds/seed_cash_and_reasons.js";
import { LanKktDriverService } from "../../../../services/hardware/index.js";
import { FiscalReceiptFactory } from "../../../../services/kkt/FiscalReceiptFactory.js";
import type { ApplyCashBoxRefundParams, DbClientOrTransaction, PrintResultMetadata } from "../types.js";
import {
	fiscalCorrectionPayloadSchema,
	resolvePatientCustomerContact,
	validateCorrectionKopecks,
} from "./receiptCorrectionValidation.js";

/**
 * Updates cash box balances, shift expense counters, and records cashOperations on fiscal reversal.
 */
export async function applyCashBoxFiscalRefund(
	tx: DbClientOrTransaction,
	orgId: string,
	data: ApplyCashBoxRefundParams,
	printResult: PrintResultMetadata,
): Promise<void> {
	await ensureOrganizationCashBoxes(tx, orgId);
	const allBoxes = await tx
		.select()
		.from(cashBoxes)
		.where(eq(cashBoxes.organizationId, orgId))
		.for("update");

	if (!allBoxes || allBoxes.length === 0) return;

	let validPatientId: string | null = null;
	if (data.patientId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.patientId)) {
		const [p] = await tx
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
			.limit(1);
		if (p) validPatientId = p.id;
	}

	const firstBox = allBoxes[0];
	if (!firstBox) return;

	const mainBox = allBoxes.find((b) => b.isMain || b.type === "main") ?? firstBox;
	const cashlessBox = allBoxes.find((b) => b.isCashless || b.type === "cashless") ?? mainBox;

	// Cash tender reversal
	const cashKop = data.refundCashKopecks || 0;
	if (cashKop > 0) {
		const amountRub = kopecksToRub(cashKop);
		const balanceBeforeKop = parseKopecks(mainBox.balanceRub);
		const balanceAfterKop = Math.max(0, balanceBeforeKop - cashKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} - ${amountRub})::numeric, 2)`,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, mainBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, mainBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalRub: sql`round((${cashBoxShifts.expenseTotalRub} + ${amountRub})::numeric, 2)`,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: mainBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "expense",
			amountRub,
			balanceBeforeRub: kopecksToRub(balanceBeforeKop),
			balanceAfterRub: kopecksToRub(balanceAfterKop),
			reasonText: `Возврат по кассовому чеку №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				refundCashKopecks: cashKop,
				totalRefundKopecks: data.totalRefundKopecks,
			},
		});
	}

	// Electronic card tender reversal
	const electronicKop = data.refundElectronicKopecks || 0;
	if (electronicKop > 0) {
		const amountRub = kopecksToRub(electronicKop);
		const balanceBeforeKop = parseKopecks(cashlessBox.balanceRub);
		const balanceAfterKop = Math.max(0, balanceBeforeKop - electronicKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: sql`round((${cashBoxes.balanceRub} - ${amountRub})::numeric, 2)`,
				updatedAt: new Date(),
			})
			.where(and(eq(cashBoxes.id, cashlessBox.id), eq(cashBoxes.organizationId, orgId)));

		const [activeShift] = await tx
			.select()
			.from(cashBoxShifts)
			.where(
				and(
					eq(cashBoxShifts.organizationId, orgId),
					eq(cashBoxShifts.cashBoxId, cashlessBox.id),
					eq(cashBoxShifts.status, "open"),
				),
			)
			.for("update")
			.limit(1);

		if (activeShift && amountRub > 0) {
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalRub: sql`round((${cashBoxShifts.expenseTotalRub} + ${amountRub})::numeric, 2)`,
					updatedAt: new Date(),
				})
				.where(and(eq(cashBoxShifts.id, activeShift.id), eq(cashBoxShifts.organizationId, orgId)));
		}

		await tx.insert(cashOperations).values({
			organizationId: orgId,
			cashBoxId: cashlessBox.id,
			shiftId: activeShift?.id ?? null,
			operationType: "expense",
			amountRub,
			balanceBeforeRub: kopecksToRub(balanceBeforeKop),
			balanceAfterRub: kopecksToRub(balanceAfterKop),
			reasonText: `Возврат по кассовому чеку (безналичные) №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				refundElectronicKopecks: electronicKop,
				totalRefundKopecks: data.totalRefundKopecks,
			},
		});
	}
}

/**
 * Handles payment record status and balance mutation on refund.
 */
async function updateRefundedPaymentRecord(
	tx: DbClientOrTransaction,
	orgId: string,
	originalPaymentId: string,
	refundKopecks: number,
): Promise<string | null> {
	const [existingPayment] = await tx
		.select({ id: payments.id, amountRub: payments.amountRub })
		.from(payments)
		.where(and(eq(payments.id, originalPaymentId), eq(payments.organizationId, orgId)))
		.limit(1);

	if (!existingPayment) return null;

	const origKop = parseKopecks(existingPayment.amountRub);
	if (refundKopecks >= origKop) {
		await tx
			.update(payments)
			.set({ status: "refunded" })
			.where(and(eq(payments.id, existingPayment.id), eq(payments.organizationId, orgId)));
	} else {
		const remainingKop = Math.max(0, origKop - refundKopecks);
		await tx
			.update(payments)
			.set({ amountRub: kopecksToRub(remainingKop) })
			.where(and(eq(payments.id, existingPayment.id), eq(payments.organizationId, orgId)));
	}

	return existingPayment.id;
}

/**
 * POST /api/fiscal/refund & POST /api/finance/refund
 * Issues 54-FZ Return Receipt (Tag 1054 = 2, income_return) with composite Idempotency-Key.
 */
export async function handleFiscalRefund(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal refund create");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const parsed = fiscalRefundPayloadSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры возврата чека",
			details: parsed.error.issues,
		});
	}

	const rawData = parsed.data;
	const headerIdempotencyKey =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined);
	const effectiveMutationId =
		rawData.clientMutationId?.trim() || headerIdempotencyKey?.trim() || undefined;

	const data = {
		...rawData,
		clientMutationId: effectiveMutationId,
	};

	const patientContact = await resolvePatientCustomerContact(orgId, data.patientId);

	const refundReceiptInput: CreateFiscalReceiptPayloadInput = createFiscalReceiptPayloadSchema.parse({
		clientMutationId: data.clientMutationId,
		patientId: data.patientId,
		operationType: "income_return",
		customerContact: patientContact || "+79990000000",
		cashierFullName: data.cashierFullName,
		items: data.items,
		cashKopecks: data.refundCashKopecks,
		electronicCardKopecks: data.refundElectronicKopecks,
		sbpKopecks: 0,
		prepaidKopecks: data.refundPrepaidKopecks,
		creditKopecks: 0,
		totalKopecks: data.totalRefundKopecks,
		taxationSystem: "usn_income",
		taxDeductionSummaryCode: "code_1_standard",
		isCorrection: false,
	});

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
				const signature = buildFiscalRefundPayloadSignature(data);
				const verification = verifyFiscalCompositeIdempotencyKey(mutationId, signature);

				const refundKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalRefundKopecks;
				if (verification.isValid && refundKopecksMatch) {
					return reply.status(200).send({
						success: true,
						replayed: true,
						refundQueueId: existingRow.id,
						status: existingRow.status === "hardware_offline" ? "hardware_offline" : "completed",
						originalReceiptNumber: data.originalReceiptNumber,
						fnSerial: (storedPayload["fnSerial"] as string) || undefined,
						fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || undefined,
						fiscalSign: (storedPayload["fiscalSign"] as string) || undefined,
						ofdVerificationUrl: (storedPayload["ofdVerificationUrl"] as string) || undefined,
						totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
					});
				} else {
					return reply.status(409).send({
						error: "FiscalReceiptConflictError",
						message: "Возврат с таким ключом операции уже был зарегистрирован с другими параметрами.",
					});
				}
			}
		}

		const compiled = FiscalReceiptFactory.buildFfd12Receipt(refundReceiptInput);
		const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
		const isOffline = printResult.status === "hardware_offline";
		const now = new Date();

		let validPaymentId: string | null = null;
		if (data.originalPaymentId) {
			validPaymentId = await updateRefundedPaymentRecord(
				tx,
				orgId,
				data.originalPaymentId,
				data.totalRefundKopecks,
			);
		}

		const payloadToStore: Record<string, unknown> = {
			...compiled,
			clientMutationId: data.clientMutationId ?? null,
			originalReceiptNumber: data.originalReceiptNumber ?? null,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		const [queueRow] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				paymentId: validPaymentId,
				receiptType: "income_return",
				status: printResult.status,
				payloadJson: payloadToStore,
				lastError: isOffline ? printResult.errorMessage || "Касса оффлайн при возврате" : null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
			})
			.returning();

		await applyCashBoxFiscalRefund(tx, orgId, data, printResult);

		return reply.status(200).send({
			success: true,
			replayed: false,
			refundQueueId: queueRow?.id,
			status: isOffline ? "hardware_offline" : "completed",
			originalReceiptNumber: data.originalReceiptNumber,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
		});
	});
}

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

	const body = (request.body || {}) as Record<string, unknown>;
	const normalizedInput = {
		...body,
		isCorrection: true,
		correctionType: "self_initiated",
		correctionDocDate: (body["correctionDocDate"] as string) || new Date().toISOString().slice(0, 10),
		correctionDocNumber: (body["correctionDocNumber"] as string) || "АКТ-САМОКОРРЕКЦИЯ",
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
		correctionType: "self_initiated",
		correctionDocDate: data.correctionDocDate,
		correctionDocNumber: data.correctionDocNumber,
	};

	const compiled = FiscalReceiptFactory.buildFfd12Receipt(preparedInput);
	const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
	const isOffline = printResult.status === "hardware_offline";
	const now = new Date();

	return await withTenantCtx(orgId, async (tx) => {
		const [queueRow] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				receiptType: "correction",
				status: printResult.status,
				payloadJson: {
					...compiled,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					receiptIssuedAt: printResult.receiptIssuedAt,
				},
				lastError: isOffline ? printResult.errorMessage || "Касса оффлайн при коррекции" : null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
			})
			.returning();

		return reply.status(201).send({
			success: true,
			correctionQueueId: queueRow?.id,
			status: isOffline ? "hardware_offline" : "completed",
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			totalRub: kopecksToNumericString(data.totalKopecks),
			message: "Чек коррекции успешно сформирован",
		});
	});
}
