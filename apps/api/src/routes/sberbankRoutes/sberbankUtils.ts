import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { fiscalReceiptQueue, sberbankTransactions } from "../../db/schema.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";

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
