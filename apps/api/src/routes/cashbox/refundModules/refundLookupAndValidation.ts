/**
 * apps/api/src/routes/cashbox/refundModules/refundLookupAndValidation.ts
 * Stage 1: Idempotent replay check & row-locked over-refund guards for payments/invoices.
 */

import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { kopecksToNumericString, rublesToKopecks } from "@dental/shared";
import {
	cashBoxes,
	cashOperations,
	fiscalReceiptQueue,
	patientInvoices,
	payments,
} from "../../../db/schema.js";
import type { TenantDb } from "../../../db/rls.js";
import { isValidUuid } from "../../../utils/httpIdempotency.js";
import type { CashRefundTxResult } from "./types.js";

function resolveSignedPaymentKopecks(row: {
	amountKopecks: bigint | number | null | undefined;
	amountRub: number | string | null | undefined;
}): bigint {
	if (row.amountKopecks !== null && row.amountKopecks !== undefined && BigInt(row.amountKopecks) !== 0n) {
		return BigInt(row.amountKopecks);
	}
	return BigInt(rublesToKopecks(Number(row.amountRub || 0)));
}

export function resolveInvoiceTotalKopecks(inv: typeof patientInvoices.$inferSelect): bigint {
	if (inv.totalPriceKopecks > 0n) {
		return inv.totalPriceKopecks;
	}
	return BigInt(rublesToKopecks(Number(inv.totalAmountRub || inv.totalRub || 0)));
}

export async function checkCashRefundReplay(
	tx: TenantDb,
	orgId: string,
	effectiveMutationId: string,
	requestedCashBoxId?: string,
): Promise<Extract<CashRefundTxResult, { kind: "replay" }> | null> {
	const [existingRefund] = await tx
		.select()
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, orgId),
				eq(payments.clientMutationId, effectiveMutationId),
			),
		)
		.limit(1);

	if (!existingRefund) {
		return null;
	}

	const [opByMeta] = await tx
		.select()
		.from(cashOperations)
		.where(
			and(
				eq(cashOperations.organizationId, orgId),
				sql`${cashOperations.metadata}->>'idempotencyKey' = ${effectiveMutationId}`,
			),
		)
		.limit(1);

	let existingOp = opByMeta;
	if (!existingOp) {
		const rawExistingNote = existingRefund.note || "";
		const strippedExistingNote = rawExistingNote.replace(/\s*\[ref:[^\]]+\]$/, "");
		const [opByNote] = await tx
			.select()
			.from(cashOperations)
			.where(
				and(
					eq(cashOperations.organizationId, orgId),
					or(
						eq(cashOperations.reasonText, rawExistingNote),
						eq(cashOperations.reasonText, strippedExistingNote),
					),
				),
			)
			.limit(1);
		existingOp = opByNote;
	}

	const replayBoxId = existingOp?.cashBoxId || requestedCashBoxId;
	let currentBox: typeof cashBoxes.$inferSelect | undefined;
	if (replayBoxId && isValidUuid(replayBoxId)) {
		const [foundBox] = await tx
			.select()
			.from(cashBoxes)
			.where(and(eq(cashBoxes.organizationId, orgId), eq(cashBoxes.id, replayBoxId)))
			.limit(1);
		currentBox = foundBox;
	}

	const [queuedReceipt] = await tx
		.select({ id: fiscalReceiptQueue.id })
		.from(fiscalReceiptQueue)
		.where(
			and(
				eq(fiscalReceiptQueue.organizationId, orgId),
				eq(fiscalReceiptQueue.paymentId, existingRefund.id),
			),
		)
		.limit(1);

	return {
		kind: "replay",
		operation: existingOp,
		cashBox: currentBox,
		refundPaymentId: existingRefund.id,
		queuedReceiptId: queuedReceipt?.id,
		fiscalReceiptNumber: existingRefund.fiscalReceiptNumber,
	};
}

export interface LockedRefundTargets {
	readonly linkedPayment: typeof payments.$inferSelect | undefined;
	readonly inferredPayment: typeof payments.$inferSelect | undefined;
	readonly linkedInvoice: typeof patientInvoices.$inferSelect | undefined;
}

export type LockTargetsOutcome =
	| { ok: true; targets: LockedRefundTargets }
	| { ok: false; failure: CashRefundTxResult };

export async function lockAndValidateRefundTargets(
	tx: TenantDb,
	orgId: string,
	refundKop: number,
	paymentId?: string,
	invoiceId?: string,
): Promise<LockTargetsOutcome> {
	let linkedPayment: typeof payments.$inferSelect | undefined;

	if (paymentId) {
		const [p] = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.id, paymentId), eq(payments.organizationId, orgId)))
			.for("update")
			.limit(1);
		if (!p) {
			return {
				ok: false,
				failure: { kind: "payment_not_found", paymentId },
			};
		}
		linkedPayment = p;

		// Защита от Over-Refund по исходному платежу через метаданные очереди и детерминированный маркер [ref:<paymentId>]
		const paymentRefTag = `[ref:${linkedPayment.id}]`;
		const [taggedRefunds, fiscalLinkedRefunds] = await Promise.all([
			tx
				.select({
					id: payments.id,
					amountKopecks: payments.amountKopecks,
					amountRub: payments.amountRub,
				})
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						or(sql`${payments.amountKopecks} < 0`, sql`${payments.amountRub} < 0`),
						sql`strpos(coalesce(${payments.note}, ''), ${paymentRefTag}) > 0`,
					),
				),
			tx
				.select({ paymentId: fiscalReceiptQueue.paymentId })
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, orgId),
						sql`${fiscalReceiptQueue.payloadJson}->>'originalPaymentId' = ${linkedPayment.id}`,
					),
				),
		]);

		const countedIds = new Set(taggedRefunds.map((r) => r.id));
		let prevRefundKop = 0n;
		for (const row of taggedRefunds) {
			const signed = resolveSignedPaymentKopecks(row);
			prevRefundKop += signed < 0n ? -signed : signed;
		}

		const extraPaymentIds = fiscalLinkedRefunds
			.map((r) => r.paymentId)
			.filter((id): id is string => typeof id === "string" && id.length > 0)
			.filter((id) => !countedIds.has(id));
		if (extraPaymentIds.length > 0) {
			const extraRows = await tx
				.select({
					id: payments.id,
					amountKopecks: payments.amountKopecks,
					amountRub: payments.amountRub,
				})
				.from(payments)
				.where(and(eq(payments.organizationId, orgId), inArray(payments.id, extraPaymentIds)));
			for (const row of extraRows) {
				const signed = resolveSignedPaymentKopecks(row);
				if (signed < 0n) prevRefundKop += -signed;
			}
		}

		const rawOrigPaidKop = resolveSignedPaymentKopecks(linkedPayment);
		const availableToRefundKop =
			rawOrigPaidKop <= 0n || linkedPayment.status === "refunded"
				? 0n
				: rawOrigPaidKop - prevRefundKop;

		if (BigInt(refundKop) > availableToRefundKop) {
			const safeAvail = availableToRefundKop > 0n ? Number(availableToRefundKop) : 0;
			return {
				ok: false,
				failure: {
					kind: "over_refund_forbidden",
					availableRub: kopecksToNumericString(safeAvail),
					requestedRub: kopecksToNumericString(refundKop),
				},
			};
		}
	}

	let linkedInvoice: typeof patientInvoices.$inferSelect | undefined;
	let inferredPayment: typeof payments.$inferSelect | undefined;
	const targetInvoiceId = invoiceId || linkedPayment?.documentId;
	if (targetInvoiceId) {
		const [inv] = await tx
			.select()
			.from(patientInvoices)
			.where(and(eq(patientInvoices.id, targetInvoiceId), eq(patientInvoices.organizationId, orgId)))
			.for("update")
			.limit(1);

		if (!inv) {
			if (invoiceId) {
				return {
					ok: false,
					failure: { kind: "invoice_not_found", invoiceId },
				};
			}
		} else {
			linkedInvoice = inv;

			const [paidRows, refundRows] = await Promise.all([
				tx
					.select()
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.documentId, linkedInvoice.id),
							eq(payments.status, "paid"),
							or(sql`${payments.amountKopecks} > 0`, sql`${payments.amountRub} > 0`),
						),
					)
					.orderBy(desc(payments.paidAt), desc(payments.createdAt)),
				tx
					.select({
						amountKopecks: payments.amountKopecks,
						amountRub: payments.amountRub,
					})
					.from(payments)
					.where(
						and(
							eq(payments.organizationId, orgId),
							eq(payments.documentId, linkedInvoice.id),
							or(sql`${payments.amountKopecks} < 0`, sql`${payments.amountRub} < 0`),
						),
					),
			]);
			if (!linkedPayment && paidRows.length > 0) {
				inferredPayment = paidRows[0];
			}

			const invoiceTotalKop = resolveInvoiceTotalKopecks(linkedInvoice);
			let paidOnInvoiceKop = 0n;
			for (const row of paidRows) {
				const val = resolveSignedPaymentKopecks(row);
				if (val > 0n) paidOnInvoiceKop += val;
			}
			let prevRefundKop = 0n;
			for (const row of refundRows) {
				const val = resolveSignedPaymentKopecks(row);
				prevRefundKop += val < 0n ? -val : val;
			}

			const invoiceCapKop =
				paidOnInvoiceKop > 0n
					? paidOnInvoiceKop < invoiceTotalKop
						? paidOnInvoiceKop
						: invoiceTotalKop
					: linkedInvoice.status === "paid" || linkedInvoice.status === "partially_refunded"
						? invoiceTotalKop
						: 0n;
			const availableToRefundKop = invoiceCapKop - prevRefundKop;

			if (BigInt(refundKop) > availableToRefundKop) {
				const safeAvail = availableToRefundKop > 0n ? Number(availableToRefundKop) : 0;
				return {
					ok: false,
					failure: {
						kind: "over_refund_forbidden",
						availableRub: kopecksToNumericString(safeAvail),
						requestedRub: kopecksToNumericString(refundKop),
					},
				};
			}
		}
	}

	return {
		ok: true,
		targets: { linkedPayment, inferredPayment, linkedInvoice },
	};
}
