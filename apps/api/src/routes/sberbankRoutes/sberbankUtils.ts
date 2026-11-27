import { sumPaymentFlowBigInt } from "@dental/shared";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { withSavepoint, type TenantDb } from "../../db/rls.js";
import {
	fiscalReceiptQueue,
	patientInvoices,
	payments,
	sberbankTransactions,
	treatmentItems,
} from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import {
	reconcileInvoiceBalanceInDb,
	revertTreatmentItemsOnFullRefundTx,
} from "../billingRoutes/invoiceBalanceReconciler.js";
import { reverseVisitConsumablesTx } from "../inventory/storno/stornoOperationHandlers.js";

export function normalizeSberStatus(status: string | null | undefined): string {
	return (status ?? "").trim().toLowerCase();
}

export function isSberTerminalRefundedOrReversed(status: string | null | undefined): boolean {
	const s = normalizeSberStatus(status);
	return s === "refunded" || s === "reversed";
}

export function isSberSettledOrPaid(status: string | null | undefined): boolean {
	const s = normalizeSberStatus(status);
	return s === "success" || s === "settled" || s === "paid";
}

export function isSberPendingOrHeld(status: string | null | undefined): boolean {
	const s = normalizeSberStatus(status);
	return s === "pending" || s === "approved" || s === "authorized" || s === "waiting_for_card";
}

export function mapSberbankOrderStatus(code: number | undefined): string {
	if (code === 2) return "success";
	if (code === 3 || code === 6) return "failed";
	if (code === 1) return "approved";
	if (code === 4) return "refunded";
	return "pending";
}

export function resolveSberReturnUrl(originHeader: string | undefined): string | null {
	const configuredBase =
		process.env.APP_URL?.trim() ||
		process.env.PUBLIC_WEB_URL?.trim() ||
		process.env.FRONTEND_URL?.trim();
	const trimmedOrigin = originHeader?.trim();
	if (trimmedOrigin && /^https?:\/\/[^/\s]+$/i.test(trimmedOrigin)) {
		return `${trimmedOrigin}/cabinet`;
	}
	if (configuredBase && /^https?:\/\/[^/\s]+/i.test(configuredBase)) {
		return `${configuredBase.replace(/\/+$/, "")}/cabinet`;
	}
	if (process.env.NODE_ENV === "production") {
		return null;
	}
	return "http://localhost:3000/cabinet";
}

export async function findUniqueSberbankTxInTenant(
	tx: TenantDb,
	organizationId: string,
	orderId: string,
	lock = false,
): Promise<
	| { kind: "ok"; txRow: typeof sberbankTransactions.$inferSelect }
	| { kind: "not_found" }
	| { kind: "ambiguous" }
> {
	const baseQuery = tx
		.select()
		.from(sberbankTransactions)
		.where(
			and(
				eq(sberbankTransactions.orderId, orderId),
				eq(sberbankTransactions.organizationId, organizationId),
			),
		);
	const rows = lock ? await baseQuery.for("update").limit(2) : await baseQuery.limit(2);
	if (rows.length > 1) return { kind: "ambiguous" };
	if (!rows[0]) return { kind: "not_found" };
	return { kind: "ok", txRow: rows[0] };
}

/** Acquires transaction-scoped 64-bit PG advisory lock for acquiring orderId within organization */
export async function acquireSberTxAdvisoryLock(
	tx: TenantDb,
	organizationId: string,
	orderId: string,
): Promise<void> {
	await tx.execute(
		sql`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${`sber_tx:${orderId}`}))`,
	);
}

/**
 * Reconciles invoice balance and reverts treatment items on full refund —
 * handles both invoice-linked acquiring transactions and visit-only transactions without invoiceId.
 */
export async function reconcileAcquiringRefundInDb(
	tx: TenantDb,
	organizationId: string,
	params: {
		invoiceId?: string | null | undefined;
		visitId?: string | null | undefined;
	},
): Promise<void> {
	const rawInvoiceId = params.invoiceId?.trim() || null;
	const rawVisitId = params.visitId?.trim() || null;

	let matchedInvoiceId: string | null = null;
	if (rawInvoiceId && isValidUuid(rawInvoiceId)) {
		const [invoiceRow] = await tx
			.select({ id: patientInvoices.id, visitId: patientInvoices.visitId })
			.from(patientInvoices)
			.where(
				and(
					eq(patientInvoices.id, rawInvoiceId),
					eq(patientInvoices.organizationId, organizationId),
				),
			)
			.limit(1);
		if (invoiceRow) {
			matchedInvoiceId = invoiceRow.id;
			await reconcileInvoiceBalanceInDb(tx, organizationId, invoiceRow.id);
			if (rawVisitId && isValidUuid(rawVisitId) && !invoiceRow.visitId) {
				await revertTreatmentItemsOnFullRefundTx(tx, organizationId, {
					invoiceId: invoiceRow.id,
					visitId: rawVisitId,
				});
			}
		}
	}

	if (!rawVisitId || !isValidUuid(rawVisitId)) {
		return;
	}

	if (!matchedInvoiceId) {
		await revertTreatmentItemsOnFullRefundTx(tx, organizationId, {
			invoiceId: null,
			visitId: rawVisitId,
		});
	}

	// Acquiring webhooks perform in-place status="refunded" updates on positive amountKopecks rows,
	// which sumPaymentFlowBigInt(..., "ledger") classifies as 0n ignored; verify net ledger <= 0 and
	// at least one refunded payment in "flow" mode before reverting visit treatment items.
	const visitInvoices = await tx
		.select({ id: patientInvoices.id, status: patientInvoices.status })
		.from(patientInvoices)
		.where(
			and(
				eq(patientInvoices.organizationId, organizationId),
				eq(patientInvoices.visitId, rawVisitId),
				ne(patientInvoices.status, "voided"),
			),
		);
	if (visitInvoices.some((inv) => inv.status === "paid" || inv.status === "partially_paid")) {
		return;
	}

	const visitPayments = await tx
		.select({
			amountRub: payments.amountRub,
			amountKopecks: payments.amountKopecks,
			status: payments.status,
			fiscalReceipt: payments.fiscalReceipt,
		})
		.from(payments)
		.where(
			and(
				eq(payments.organizationId, organizationId),
				eq(payments.visitId, rawVisitId),
				or(eq(payments.status, "paid"), eq(payments.status, "refunded")),
			),
		);
	const ledgerFlow = sumPaymentFlowBigInt(visitPayments, "ledger");
	const fullFlow = sumPaymentFlowBigInt(visitPayments, "flow");
	const hasRefundedPayment = visitPayments.some(
		(row) => (row.status ?? "").trim().toLowerCase() === "refunded",
	);
	if (ledgerFlow.netKopecks <= 0n && (fullFlow.refundedKopecks > 0n || hasRefundedPayment)) {
		const reverted = await tx
			.update(treatmentItems)
			.set({
				status: "approved",
				version: sql`${treatmentItems.version} + 1`,
			})
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					eq(treatmentItems.visitId, rawVisitId),
					eq(treatmentItems.status, "completed"),
				),
			)
			.returning({ id: treatmentItems.id });

		if (reverted.length > 0) {
			try {
				await withSavepoint(tx, async (spTx) => {
					await reverseVisitConsumablesTx(spTx, {
						organizationId,
						visitId: rawVisitId,
						userId: null,
						reason: "full_refund",
						notes: "Авто-сторно расходников при полном возврате эквайринговой оплаты визита",
					});
				});
			} catch {
				// Non-blocking savepoint: payment refund and treatment rollback remain atomic
			}
		}
	}
}

export async function enqueueSberbankFiscalReceiptInTx(
	tx: TenantDb,
	params: {
		organizationId: string;
		patientId: string;
		orderId: string;
		paymentId: string | null;
		visitId: string | null;
		documentId: string | null;
		invoiceId: string | null;
		amountKopecks: bigint | number;
		operationType: "income" | "income_return";
	},
): Promise<void> {
	const totalKopecks = Number(params.amountKopecks);
	const isReturn = params.operationType === "income_return";
	const clientMutationId = isReturn
		? `sberbank:${params.orderId}:return`
		: `sberbank:${params.orderId}`;
	const ffdPayload = FiscalReceiptFactory.buildFfd12Receipt({
		patientId: params.patientId,
		visitId: params.visitId || undefined,
		documentId: params.documentId || undefined,
		invoiceId: params.invoiceId || undefined,
		clientMutationId,
		customerContact: "cardholder@clinic.ru",
		cashierFullName: "Кассир-администратор",
		operationType: params.operationType,
		taxationSystem: "usn_income",
		electronicCardKopecks: totalKopecks,
		totalKopecks,
		items: [
			{
				name: isReturn
					? `Возврат оплаты заказа №${params.orderId} (Сбербанк Эквайринг)`
					: `Оплата заказа №${params.orderId} (Сбербанк Эквайринг)`,
				priceKopecks: totalKopecks,
				quantity: 1,
				amountKopecks: totalKopecks,
				subject: "service",
				method: "full_payment",
				vatRate: "vat_none",
				measure: "piece",
			},
		],
	});

	await tx.insert(fiscalReceiptQueue).values({
		organizationId: params.organizationId,
		paymentId: params.paymentId,
		visitId: params.visitId || null,
		receiptType: params.operationType,
		status: "pending_print",
		payloadJson: {
			...ffdPayload,
			clientMutationId,
			orderId: params.orderId,
			invoiceId: params.invoiceId,
		},
		retryCount: 0,
	});
}
