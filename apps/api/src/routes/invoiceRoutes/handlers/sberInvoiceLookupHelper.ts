import { and, eq } from "drizzle-orm";
import type { db as dbType } from "../../../db/client.js";
import { payments, sberbankTransactions } from "../../../db/schema/billing.js";

/** Looks up payment status in sberbankTransactions by orderId */
export async function lookupSberTransactionInvoice(params: {
	db: typeof dbType;
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

	const isPaid = txRow.status === "SETTLED";
	const amountRub = txRow.amount / 100;

	let actualFiscalReceiptNumber: string | null = null;
	if (isPaid) {
		const [linkedPayment] = await db
			.select({ fiscalReceiptNumber: payments.fiscalReceiptNumber })
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.clientMutationId, txRow.orderId),
				),
			)
			.limit(1);
		actualFiscalReceiptNumber = linkedPayment?.fiscalReceiptNumber || null;
	}

	return {
		id: txRow.orderId,
		status: isPaid ? "paid" : txRow.status.toLowerCase(),
		isPaid,
		totalAmountRub: amountRub,
		paidAmountRub: isPaid ? amountRub : 0,
		remainingAmountRub: isPaid ? 0 : amountRub,
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
