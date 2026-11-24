/**
 * receiptFiscalizeHandlers.ts — Layer 5: Canonical Facade for 54-FZ Fiscal Receipt Printing.
 *
 * Handles:
 * - Direct LAN KKT communication (ATOL / Shtrikh-M / Dreamkas)
 * - Composite Idempotency-Key (<uuid>#<sha256(payload)>) with atomic PostgreSQL advisory locking
 * - 100% warranty discount / 0.00 ₽ internal warranty acts (Mandate 8e)
 * - Hardware offline buffering into fiscalReceiptQueue without blocking clinical checkout
 * - Cash box balance and shift totals mutation
 *
 * Decomposed into:
 * - receiptCashBoxLedger.ts (cash box balances & shift ledger updates)
 * - receiptFfdValidator.ts (FFD 1.2 payload validation & warranty act building)
 * - receiptKktSender.ts (LAN KKT driver printing, FN QR-code & idempotency check)
 */

import { sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { fiscalReceiptQueue } from "../../../db/schema.js";
import { FiscalReceiptFactory } from "../../../services/kkt/FiscalReceiptFactory.js";
import { applyCashBoxFiscalReceipt } from "./receiptCashBoxLedger.js";
import {
	buildWarrantyZeroActPayload,
	validateAndPrepareFiscalData,
} from "./receiptFfdValidator.js";
import {
	bufferPendingFiscalReceipt,
	checkExistingIdempotentReceipt,
	finalizeKktPrintAndBuffer,
} from "./receiptKktSender.js";
import { LanKktDriverService } from "../../../services/hardware/index.js";

// Re-export ledger function for backward compatibility
export { applyCashBoxFiscalReceipt } from "./receiptCashBoxLedger.js";
export * from "./receiptFfdValidator.js";
export * from "./receiptKktSender.js";

/**
 * POST /api/fiscal/receipts & POST /api/finance/receipts
 * Creates, validates, and prints 54-FZ FFD 1.2 receipt via direct LAN KKT.
 * Enforces composite Idempotency-Key (<uuid>#<sha256(payload)>) to guarantee strictly single execution in PostgreSQL.
 * If KKT is offline or out of paper, buffers receipt in fiscal_receipt_queue without blocking checkout.
 */
export async function handleFiscalReceipt(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal receipt create");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const prepared = await validateAndPrepareFiscalData(request, orgId);
	if (!prepared.success) {
		return reply.status(prepared.statusCode || 400).send(prepared.errorResponse);
	}
	const data = prepared.data!;

	// ─────────────────────────────────────────────────────────────────────────
	// 54-FZ & FFD 1.2: 100% WARRANTY DISCOUNT / 0.00 ₽ INTERNAL ACT (MANDATE 8E)
	// Zero-total receipts must NEVER be sent to physical KKT (causes hardware errors).
	// An internal statutory warranty/write-off act is generated instead.
	// ─────────────────────────────────────────────────────────────────────────
	if (data.totalKopecks === 0) {
		const now = new Date();
		const { actNumber, compiled, payloadToStore } = buildWarrantyZeroActPayload(data, now);

		return await withTenantCtx(orgId, async (tx) => {
			if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
				const mutationId = data.clientMutationId.trim();
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
				);

				const check = await checkExistingIdempotentReceipt(tx, orgId, mutationId, data);
				if (check.isExisting) {
					return reply.status(check.statusCode || 200).send(check.responseData);
				}
			}

			const [queueRow] = await tx
				.insert(fiscalReceiptQueue)
				.values({
					organizationId: orgId,
					visitId: data.visitId || null,
					receiptType: "warranty_act",
					status: "printed",
					payloadJson: payloadToStore,
					lastError: null,
					retryCount: 0,
					printedAt: now,
				})
				.returning();

			await applyCashBoxFiscalReceipt(tx, orgId, data, {
				fiscalDocumentNumber: "0",
				ofdVerificationUrl: "",
			});

			return reply.status(201).send({
				success: true,
				replayed: false,
				isWarrantyZeroAct: true,
				warrantyActNumber: actNumber,
				queueId: queueRow?.id,
				status: "printed",
				queueStatus: "printed",
				fnSerial: "0000000000000000",
				fiscalDocumentNumber: "0",
				fiscalSign: "0000000000",
				receiptIssuedAt: now.toISOString(),
				ofdVerificationUrl: "",
				qrString: null,
				compiledReceipt: compiled,
				hardwareWarning: null,
			});
		});
	}

	// ─────────────────────────────────────────────────────────────────────────
	// STANDARD 54-FZ FISCAL RECEIPT WITH IDEMPOTENCY LOCK & OUTBOX LAN KKT DISPATCH
	// Network I/O to physical KKT is decoupled from PostgreSQL transactions (Mandate 8bo).
	// ─────────────────────────────────────────────────────────────────────────
	const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);

	if (!data.clientMutationId || data.clientMutationId.trim().length === 0) {
		return reply.status(400).send({
			error: "IdempotencyKeyRequired",
			message:
				"Для проведения фискального чека 54-ФЗ требуется обязательный заголовок Idempotency-Key или поле clientMutationId (Мандат 8bo / RFC 9562).",
		});
	}

	const mutationId = data.clientMutationId.trim();

	// Phase 1: Fast Transaction (Advisory Lock + Idempotency Check + Outbox Buffer)
	const preflight = await withTenantCtx(orgId, async (tx) => {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
		);

		const check = await checkExistingIdempotentReceipt(tx, orgId, mutationId, data);
		if (check.isExisting) {
			return {
				isExisting: true,
				statusCode: check.statusCode || 200,
				responseData: check.responseData,
				queueRow: undefined,
			};
		}

		const queueRow = await bufferPendingFiscalReceipt(tx, orgId, data, compiled);
		return { isExisting: false, queueRow };
	});

	if (preflight.isExisting) {
		const statusCode = preflight.statusCode ?? 200;
		return reply.status(statusCode).send(preflight.responseData);
	}

	if (!preflight.queueRow) {
		return reply.status(500).send({
			error: "FiscalBufferError",
			message: "Не удалось буферизовать чек в очереди фискализации",
		});
	}

	// Phase 2: Network I/O OUTSIDE of database transaction (Outbox Pattern)
	const printResult = await LanKktDriverService.printFiscalReceipt(compiled);

	// Phase 3: Fast Transaction (Finalize Queue Item + Cashbox Ledger)
	const finalResult = await withTenantCtx(orgId, async (tx) => {
		return await finalizeKktPrintAndBuffer(
			tx,
			orgId,
			preflight.queueRow.id,
			data,
			compiled,
			printResult,
		);
	});

	return reply.status(201).send(finalResult);
}
