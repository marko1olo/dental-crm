/**
 * receiptCorrectionHandlers.ts — Layer 2: 54-FZ Refund & Correction Receipts & Cash Register Reversal.
 *
 * Implements:
 * - Statutory 54-FZ return receipts (Tag 1054 = 2, income_return)
 * - Composite Idempotency-Key (<uuid>#<sha256(payload)>)
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
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	cashBoxes,
	cashBoxShifts,
	cashOperations,
	fiscalReceiptQueue,
	patients,
	payments,
} from "../../../db/schema.js";
import { ensureOrganizationCashBoxes } from "../../../db/seeds/seed_cash_and_reasons.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { LanKktDriverService } from "../../../services/hardware/index.js";
import type { ApplyCashBoxRefundParams, PrintResultMetadata } from "./types.js";

export async function applyCashBoxFiscalRefund(
	tx: any,
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
	if (data.patientId) {
		const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.patientId);
		if (isUuid) {
			const [p] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (p) {
				validPatientId = p.id;
			}
		}
	}

	const mainBox = allBoxes.find((b: any) => b.isMain || b.type === "main") || allBoxes[0];
	const cashlessBox = allBoxes.find((b: any) => b.isCashless || b.type === "cashless") || mainBox;

	const cashKop = data.refundCashKopecks || 0;
	if (cashKop > 0) {
		const amountRub = kopecksToRub(cashKop);
		const balanceBeforeKop = parseKopecks(mainBox.balanceRub);
		const balanceAfterKop = Math.max(0, balanceBeforeKop - cashKop);
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

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
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText: `Возврат по фискальному чеку 54-ФЗ №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
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

	const electronicKop = data.refundElectronicKopecks || 0;
	if (electronicKop > 0) {
		const amountRub = kopecksToRub(electronicKop);
		const balanceBeforeKop = parseKopecks(cashlessBox.balanceRub);
		const balanceAfterKop = Math.max(0, balanceBeforeKop - electronicKop);
		const balanceBefore = kopecksToRub(balanceBeforeKop);
		const balanceAfter = kopecksToRub(balanceAfterKop);

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
			balanceBeforeRub: balanceBefore,
			balanceAfterRub: balanceAfter,
			reasonText: `Возврат по фискальному чеку 54-ФЗ (безналичные) №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
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
			message: "Некорректные параметры возврата чека 54-ФЗ",
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

	// Idempotency check for refund
	if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
		const mutationId = data.clientMutationId.trim();

		return await withTenantCtx(orgId, async (tx) => {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
			);

			const existingQueueRows = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, orgId),
						sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${mutationId}`,
					),
				)
				.limit(1);

			const existingRow = existingQueueRows[0];
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
						message: "Возврат с таким ключом операции (clientMutationId) уже был зарегистрирован с другими параметрами.",
					});
				}
			}

			const totalElectronicKopecks = data.refundElectronicKopecks;

			const refundReceiptInput: CreateFiscalReceiptPayloadInput = createFiscalReceiptPayloadSchema.parse({
				clientMutationId: data.clientMutationId,
				patientId: data.patientId,
				operationType: "income_return",
				customerContact: "+79990000000",
				cashierFullName: data.cashierFullName,
				items: data.items,
				cashKopecks: data.refundCashKopecks,
				electronicCardKopecks: totalElectronicKopecks,
				sbpKopecks: 0,
				prepaidKopecks: data.refundPrepaidKopecks,
				creditKopecks: 0,
				totalKopecks: data.totalRefundKopecks,
				taxationSystem: "usn_income",
				taxDeductionSummaryCode: "code_1_standard",
				isCorrection: false,
			});

			const compiled = FiscalReceiptFactory.buildFfd12Receipt(refundReceiptInput);
			const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
			const isOffline = printResult.status === "hardware_offline";
			const now = new Date();

			let validPaymentId: string | null = null;
			if (data.originalPaymentId) {
				const [existingPayment] = await tx
					.select({ id: payments.id, amountRub: payments.amountRub })
					.from(payments)
					.where(and(eq(payments.id, data.originalPaymentId), eq(payments.organizationId, orgId)))
					.limit(1);
				if (existingPayment) {
					validPaymentId = existingPayment.id;
					const origKop = parseKopecks(existingPayment.amountRub);
					if (data.totalRefundKopecks >= origKop) {
						await tx
							.update(payments)
							.set({ status: "refunded" })
							.where(
								and(
									eq(payments.id, validPaymentId),
									eq(payments.organizationId, orgId),
								),
							);
					} else {
						const remainingKop = Math.max(0, origKop - data.totalRefundKopecks);
						await tx
							.update(payments)
							.set({ amountRub: kopecksToRub(remainingKop) })
							.where(
								and(
									eq(payments.id, validPaymentId),
									eq(payments.organizationId, orgId),
								),
							);
					}
				}
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
					lastError: isOffline ? printResult.errorMessage || "KKT offline on refund" : null,
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

	const totalElectronicKopecks = data.refundElectronicKopecks;

	const refundReceiptInput: CreateFiscalReceiptPayloadInput = createFiscalReceiptPayloadSchema.parse({
		clientMutationId: data.clientMutationId,
		patientId: data.patientId,
		operationType: "income_return",
		customerContact: "+79990000000",
		cashierFullName: data.cashierFullName,
		items: data.items,
		cashKopecks: data.refundCashKopecks,
		electronicCardKopecks: totalElectronicKopecks,
		sbpKopecks: 0,
		prepaidKopecks: data.refundPrepaidKopecks,
		creditKopecks: 0,
		totalKopecks: data.totalRefundKopecks,
		taxationSystem: "usn_income",
		taxDeductionSummaryCode: "code_1_standard",
		isCorrection: false,
	});

	const compiled = FiscalReceiptFactory.buildFfd12Receipt(refundReceiptInput);
	const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
	const isOffline = printResult.status === "hardware_offline";
	const now = new Date();

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

	return await withTenantCtx(orgId, async (tx) => {
		let validPaymentId: string | null = null;
		if (data.originalPaymentId) {
			const [existingPayment] = await tx
				.select({ id: payments.id, amountRub: payments.amountRub })
				.from(payments)
				.where(and(eq(payments.id, data.originalPaymentId), eq(payments.organizationId, orgId)))
				.limit(1);
			if (existingPayment) {
				validPaymentId = existingPayment.id;
				const origKop = parseKopecks(existingPayment.amountRub);
				if (data.totalRefundKopecks >= origKop) {
					await tx
						.update(payments)
						.set({ status: "refunded" })
						.where(
							and(
								eq(payments.id, validPaymentId),
								eq(payments.organizationId, orgId),
							),
						);
				} else {
					const remainingKop = Math.max(0, origKop - data.totalRefundKopecks);
					await tx
						.update(payments)
						.set({ amountRub: kopecksToRub(remainingKop) })
						.where(
							and(
								eq(payments.id, validPaymentId),
								eq(payments.organizationId, orgId),
							),
						);
				}
			}
		}

		const [queueRow] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				paymentId: validPaymentId,
				receiptType: "income_return",
				status: printResult.status,
				payloadJson: payloadToStore,
				lastError: isOffline ? printResult.errorMessage || "KKT offline on refund" : null,
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
