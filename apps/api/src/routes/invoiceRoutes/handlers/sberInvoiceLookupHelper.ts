import { kopecksToRubles } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import type { db as dbType } from "../../../db/client.js";
import type { TenantDb } from "../../../db/rls.js";
import { payments, sberbankTransactions } from "../../../db/schema/billing.js";

/** Looks up payment status in sberbankTransactions by orderId */
export async function lookupSberTransactionInvoice(params: {
	db: TenantDb | typeof dbType;
	orgId: string;
	id: string;
}): Promise<Record<string, unknown> | null> {
	const { db, orgId, id } = params;

	const [txRow] = await db
		.select()
		.from(sberbankTransactions)
		.where(
			and(
				eq(sberbankTransactions.organizationId, orgId),
				eq(sberbankTransactions.orderId, id),
			),
		)
		.limit(1);

	if (!txRow) return null;

	const normalizedStatus = txRow.status.toLowerCase();
	const isPaid =
		txRow.status === "SETTLED" ||
		normalizedStatus === "success" ||
		normalizedStatus === "paid";
	const amountKopecks = Number(txRow.amountKopecks);
	const amountRub = kopecksToRubles(txRow.amountKopecks);

	let actualFiscalReceiptNumber: string | null = null;
	if (isPaid) {
		const [linkedPayment] = await db
			.select({ fiscalReceiptNumber: payments.fiscalReceiptNumber })
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					or(
						eq(payments.clientMutationId, txRow.orderId),
						eq(payments.clientMutationId, `sberbank:${txRow.orderId}`),
						eq(payments.clientMutationId, `sberpos:${txRow.orderId}`),
						eq(payments.clientMutationId, `sbp:${txRow.orderId}`),
					),
				),
			)
			.limit(1);
		actualFiscalReceiptNumber = linkedPayment?.fiscalReceiptNumber || null;
	}

	return {
		id: txRow.orderId,
		status: isPaid ? "paid" : normalizedStatus,
		isPaid,
		totalAmountRub: amountRub,
		totalAmountKopecks: amountKopecks,
		paidAmountRub: isPaid ? amountRub : 0,
		paidAmountKopecks: isPaid ? amountKopecks : 0,
		remainingAmountRub: isPaid ? 0 : amountRub,
		remainingAmountKopecks: isPaid ? 0 : amountKopecks,
		paidAtIso:
			txRow.updatedAt?.toISOString() ||
			txRow.createdAt?.toISOString() ||
			null,
		fiscalReceiptNumber: actualFiscalReceiptNumber,
		fiscalReceiptId: actualFiscalReceiptNumber,
		patientId: txRow.patientId,
		visitId: txRow.visitId,
	};
}
