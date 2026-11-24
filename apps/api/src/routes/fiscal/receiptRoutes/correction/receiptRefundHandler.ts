/**
 * receiptRefundHandler.ts — 54-FZ Fiscal Return (Tag 1054 = 2) & Cashbox Reversal Engine.
 *
 * Implements 3-Phase Outbox Pattern for LAN KKT physical printing:
 * - Phase 1: withTenantCtx advisory lock + composite SHA-256 idempotency check + pending buffer
 * - Phase 2: LanKktDriverService.printFiscalReceipt strictly OUTSIDE PostgreSQL transaction
 * - Phase 3: withTenantCtx payment reversal + queue finalization + cashbox/shift expense ledger
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
import { isValidUuid } from "../../../../utils/httpIdempotency.js";
import type { ApplyCashBoxRefundParams, DbClientOrTransaction, PrintResultMetadata } from "../types.js";
import { resolvePatientCustomerContact } from "./receiptCorrectionValidation.js";

function resolveSafeBoxBalanceKop(box: {
	balanceKopecks: number | null | undefined;
	balanceRub: number;
}): number {
	const kop = box.balanceKopecks ?? 0;
	const rub = Number(box.balanceRub || 0);
	return kop !== 0 || rub === 0 ? kop : parseKopecks(rub);
}

/**
 * Updates cash box balances, shift expense counters (both rub & kopecks),
 * and records cashOperations on fiscal reversal.
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
	if (data.patientId && isValidUuid(data.patientId)) {
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

	const cashKop = data.refundCashKopecks || 0;
	if (cashKop > 0) {
		const amountRub = kopecksToRub(cashKop);
		const balanceBeforeKop = resolveSafeBoxBalanceKop(mainBox);
		const balanceAfterKop = Math.max(0, balanceBeforeKop - cashKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: kopecksToRub(balanceAfterKop),
				balanceKopecks: balanceAfterKop,
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

		if (activeShift) {
			const prevExpenseKop =
				activeShift.expenseTotalKopecks > 0 || Number(activeShift.expenseTotalRub || 0) === 0
					? activeShift.expenseTotalKopecks
					: parseKopecks(activeShift.expenseTotalRub);
			const nextExpenseKop = prevExpenseKop + cashKop;
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalRub: kopecksToRub(nextExpenseKop),
					expenseTotalKopecks: nextExpenseKop,
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
			amountKopecks: cashKop,
			balanceBeforeRub: kopecksToRub(balanceBeforeKop),
			balanceBeforeKopecks: BigInt(balanceBeforeKop),
			balanceAfterRub: kopecksToRub(balanceAfterKop),
			balanceAfterKopecks: BigInt(balanceAfterKop),
			reasonText: `Возврат по кассовому чеку №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				refundCashKopecks: cashKop,
				totalRefundKopecks: data.totalRefundKopecks,
				isDepositRefund: false,
			},
		});
	}

	const electronicKop = data.refundElectronicKopecks || 0;
	if (electronicKop > 0) {
		const amountRub = kopecksToRub(electronicKop);
		const balanceBeforeKop = resolveSafeBoxBalanceKop(cashlessBox);
		const balanceAfterKop = Math.max(0, balanceBeforeKop - electronicKop);

		await tx
			.update(cashBoxes)
			.set({
				balanceRub: kopecksToRub(balanceAfterKop),
				balanceKopecks: balanceAfterKop,
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

		if (activeShift) {
			const prevExpenseKop =
				activeShift.expenseTotalKopecks > 0 || Number(activeShift.expenseTotalRub || 0) === 0
					? activeShift.expenseTotalKopecks
					: parseKopecks(activeShift.expenseTotalRub);
			const nextExpenseKop = prevExpenseKop + electronicKop;
			await tx
				.update(cashBoxShifts)
				.set({
					expenseTotalRub: kopecksToRub(nextExpenseKop),
					expenseTotalKopecks: nextExpenseKop,
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
			amountKopecks: electronicKop,
			balanceBeforeRub: kopecksToRub(balanceBeforeKop),
			balanceBeforeKopecks: BigInt(balanceBeforeKop),
			balanceAfterRub: kopecksToRub(balanceAfterKop),
			balanceAfterKopecks: BigInt(balanceAfterKop),
			reasonText: `Возврат по кассовому чеку (безналичные) №${printResult.fiscalDocumentNumber || data.originalReceiptNumber || "б/н"}`,
			operatorName: data.cashierFullName || null,
			patientId: validPatientId,
			kkmDocNumber: printResult.fiscalDocumentNumber ? String(printResult.fiscalDocumentNumber) : null,
			kkmReceiptUrl: printResult.ofdVerificationUrl || null,
			metadata: {
				refundElectronicKopecks: electronicKop,
				totalRefundKopecks: data.totalRefundKopecks,
				isDepositRefund: false,
			},
		});
	}
}

async function updateRefundedPaymentRecord(
	tx: DbClientOrTransaction,
	orgId: string,
	originalPaymentId: string,
	refundKopecks: number,
): Promise<string | null> {
	const [existingPayment] = await tx
		.select({
			id: payments.id,
			amountRub: payments.amountRub,
			amountKopecks: payments.amountKopecks,
		})
		.from(payments)
		.where(and(eq(payments.id, originalPaymentId), eq(payments.organizationId, orgId)))
		.for("update")
		.limit(1);

	if (!existingPayment) return null;

	const origKop =
		existingPayment.amountKopecks !== null &&
		existingPayment.amountKopecks !== undefined &&
		existingPayment.amountKopecks !== 0n
			? Number(existingPayment.amountKopecks)
			: parseKopecks(existingPayment.amountRub);
	if (refundKopecks >= origKop) {
		await tx
			.update(payments)
			.set({ status: "refunded" })
			.where(and(eq(payments.id, existingPayment.id), eq(payments.organizationId, orgId)));
	} else {
		const remainingKop = Math.max(0, origKop - refundKopecks);
		await tx
			.update(payments)
			.set({
				amountRub: kopecksToRub(remainingKop),
				amountKopecks: BigInt(remainingKop),
			})
			.where(and(eq(payments.id, existingPayment.id), eq(payments.organizationId, orgId)));
	}

	return existingPayment.id;
}

/**
 * POST /api/fiscal/refund & POST /api/finance/refund
 * Issues 54-FZ Return Receipt (Tag 1054 = 2, income_return) using Outbox Pattern.
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

	if (!effectiveMutationId) {
		return reply.status(400).send({
			error: "IdempotencyKeyRequired",
			message:
				"Для проведения возврата чека обязателен заголовок Idempotency-Key (UUIDv7).",
		});
	}

	const baseKey = effectiveMutationId.includes("#")
		? effectiveMutationId.split("#")[0]
		: effectiveMutationId;
	if (!isValidUuid(baseKey || "")) {
		return reply.status(400).send({
			error: "ValidationError",
			message:
				"Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
		});
	}

	reply.header("Idempotency-Key", effectiveMutationId);
	reply.header("X-Idempotency-Key", effectiveMutationId);

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

	const compiled = FiscalReceiptFactory.buildFfd12Receipt(refundReceiptInput);

	// Phase 1: Advisory lock + idempotency check + pending buffer inside PostgreSQL TX
	const preflight = await withTenantCtx(orgId, async (tx) => {
		const mutationId = effectiveMutationId;
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
				return {
					kind: "replay" as const,
					responseData: {
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
					},
				};
			}
			return { kind: "conflict" as const };
		}

		const [queueRow] = await tx
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				paymentId: null,
				receiptType: "income_return",
				status: "pending_print",
				payloadJson: {
					...compiled,
					clientMutationId: effectiveMutationId,
					originalReceiptNumber: data.originalReceiptNumber ?? null,
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
			message: "Возврат с таким ключом операции уже был зарегистрирован с другими параметрами.",
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
			message: "Не удалось буферизовать возвратный чек в очереди фискализации.",
		});
	}

	const queueRow = preflight.queueRow;

	// Phase 2: Physical KKT network I/O strictly OUTSIDE database transaction
	const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
	const isOffline = printResult.status === "hardware_offline";
	const now = new Date();

	// Phase 3: Atomic payment status reversal, queue finalization & cashbox/shift ledger
	await withTenantCtx(orgId, async (tx) => {
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
			clientMutationId: effectiveMutationId,
			originalReceiptNumber: data.originalReceiptNumber ?? null,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		await tx
			.update(fiscalReceiptQueue)
			.set({
				paymentId: validPaymentId,
				status: printResult.status,
				payloadJson: payloadToStore,
				lastError: isOffline ? printResult.errorMessage || "Касса оффлайн при возврате" : null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
				updatedAt: now,
			})
			.where(
				and(
					eq(fiscalReceiptQueue.id, queueRow.id),
					eq(fiscalReceiptQueue.organizationId, orgId),
				),
			);

		await applyCashBoxFiscalRefund(tx, orgId, data, printResult);
	});

	return reply.status(200).send({
		success: true,
		replayed: false,
		refundQueueId: queueRow.id,
		status: isOffline ? "hardware_offline" : "completed",
		originalReceiptNumber: data.originalReceiptNumber,
		fnSerial: printResult.fnSerial,
		fiscalDocumentNumber: printResult.fiscalDocumentNumber,
		fiscalSign: printResult.fiscalSign,
		ofdVerificationUrl: printResult.ofdVerificationUrl,
		totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
	});
}
