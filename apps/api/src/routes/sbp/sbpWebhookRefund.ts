import { kopecksToRubles } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { fiscalReceiptQueue, payments, sberbankTransactions } from "../../db/schema.js";
import { isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { Fiscal54FzService } from "../../services/billing/fiscal54fzService.js";
import { reconcileInvoiceBalanceInDb } from "../payments/sberWebhook/paymentStateTransition.js";
import type { SbpWebhookResult } from "./types.js";

/** Handles refund operation in SBP webhook */
export async function handleSbpWebhookRefund(params: {
	tx: TenantDb;
	orgId: string;
	lockedSberTx?: typeof sberbankTransactions.$inferSelect | undefined;
	lockedPayment?: typeof payments.$inferSelect | undefined;
}): Promise<{ statusCode: 200; body: SbpWebhookResult }> {
	const { tx, orgId, lockedSberTx, lockedPayment } = params;

	if (lockedSberTx) {
		await tx
			.update(sberbankTransactions)
			.set({ status: "refunded", updatedAt: new Date() })
			.where(
				and(
					eq(sberbankTransactions.id, lockedSberTx.id),
					eq(sberbankTransactions.organizationId, orgId),
				),
			);
	}

	if (lockedPayment) {
		await tx
			.update(payments)
			.set({ status: "refunded", updatedAt: new Date() })
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.id, lockedPayment.id),
				),
			);

		if (lockedPayment.status === "paid") {
			const refundKopecks =
				lockedPayment.amountKopecks !== null && lockedPayment.amountKopecks > 0n
					? Number(lockedPayment.amountKopecks)
					: Number(lockedSberTx?.amountKopecks ?? 0);
			if (refundKopecks > 0) {
				const refundRub = kopecksToRubles(refundKopecks);
				const refundPayload = Fiscal54FzService.buildStatutoryFiscalReceipt({
					organizationId: orgId,
					patientId: lockedPayment.patientId,
					customerContact: "sbp@clinic.ru",
					cashierFullName: "Кассир-администратор",
					operationType: "income_return",
					defaultCalculationMethod: "full_payment",
					tenderSplits: {
						sberPayQrRub: refundRub,
					},
					positions: [
						{
							name: "Возврат оплаты через СБП QR",
							priceRub: refundRub,
							quantity: 1,
							subject: "service",
							method: "full_payment",
							vatRate: "vat_none",
						},
					],
					visitId: lockedPayment.visitId ?? lockedSberTx?.visitId ?? null,
					documentId: lockedPayment.documentId ?? lockedSberTx?.documentId ?? null,
					invoiceId: lockedSberTx?.invoiceId ?? null,
					clientMutationId: `${lockedPayment.clientMutationId ?? lockedPayment.id}:return`,
				});
				await tx.insert(fiscalReceiptQueue).values({
					organizationId: orgId,
					paymentId: lockedPayment.id,
					visitId: lockedPayment.visitId ?? lockedSberTx?.visitId ?? null,
					receiptType: "income_return",
					status: "pending_print",
					payloadJson: {
						...refundPayload,
						tag1020_totalRub: refundPayload.tag1020_totalRubString,
					},
					retryCount: 0,
				});
			}
		}
	}

	const invoiceIdToReconcile = lockedSberTx?.invoiceId || lockedPayment?.documentId;
	if (invoiceIdToReconcile && isValidUuid(invoiceIdToReconcile)) {
		await reconcileInvoiceBalanceInDb(tx, orgId, invoiceIdToReconcile);
	}

	return {
		statusCode: 200,
		body: {
			success: true,
			processed: true,
			status: "REFUNDED",
		},
	};
}
