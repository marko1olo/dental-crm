import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { fiscalReceiptQueue, patients, payments, sberbankTransactions } from "../../db/schema.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";
import { applyAcquiringCashboxLedgerInTx } from "../cashbox/cashlessAcquiringLedger.js";
import {
	isSberTerminalRefundedOrReversed,
	reconcileAcquiringRefundInDb,
} from "../sberbankRoutes/sberbankUtils.js";
import type { SbpWebhookResult } from "./types.js";

/** Handles refund operation in SBP webhook */
export async function handleSbpWebhookRefund(params: {
	tx: TenantDb;
	orgId: string;
	lockedSberTx?: typeof sberbankTransactions.$inferSelect | undefined;
	lockedPayment?: typeof payments.$inferSelect | undefined;
}): Promise<{ statusCode: 200; body: SbpWebhookResult }> {
	const { tx, orgId, lockedSberTx, lockedPayment } = params;

	if (
		((lockedSberTx && isSberTerminalRefundedOrReversed(lockedSberTx.status)) ||
			lockedPayment?.status === "refunded") &&
		lockedPayment?.status !== "paid"
	) {
		return {
			statusCode: 200,
			body: {
				success: true,
				processed: false,
				reason: "already_refunded",
				status: "REFUNDED",
				paymentId: lockedPayment?.id ?? undefined,
			},
		};
	}

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
				await applyAcquiringCashboxLedgerInTx(tx, {
					organizationId: orgId,
					direction: "refund",
					amountKopecks: refundKopecks,
					paymentMethod: "online",
					patientId: lockedPayment.patientId,
					paymentId: lockedPayment.id,
					invoiceId: lockedSberTx?.invoiceId ?? lockedPayment.documentId,
					reasonText: `Возврат оплаты через СБП QR (${lockedSberTx?.orderId ?? lockedPayment.id})`,
					sourceTag: lockedPayment.clientMutationId ?? `sbp:${lockedPayment.id}`,
				});

				const [refundPatient] = await tx
					.select({ phone: patients.phone, email: patients.email })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, orgId),
							eq(patients.id, lockedPayment.patientId),
						),
					)
					.limit(1);
				const resolvedContact =
					refundPatient?.phone?.trim() || refundPatient?.email?.trim() || null;

				const ffdRefundPayload = FiscalReceiptFactory.buildFfd12Receipt({
					patientId: lockedPayment.patientId,
					visitId: lockedPayment.visitId ?? lockedSberTx?.visitId ?? undefined,
					invoiceId: lockedSberTx?.invoiceId ?? undefined,
					clientMutationId: `${lockedPayment.clientMutationId ?? lockedPayment.id}:return`,
					operationType: "income_return",
					taxationSystem: "usn_income",
					cashierFullName: "Кассир-администратор",
					customerContact: resolvedContact,
					sbpKopecks: refundKopecks,
					totalKopecks: refundKopecks,
					items: [
						{
							name: "Возврат оплаты через СБП QR",
							priceKopecks: refundKopecks,
							quantity: 1,
							amountKopecks: refundKopecks,
							subject: "service",
							method: "full_payment",
							vatRate: "vat_none",
							measure: "piece",
						},
					],
				});
				await tx.insert(fiscalReceiptQueue).values({
					organizationId: orgId,
					paymentId: lockedPayment.id,
					visitId: lockedPayment.visitId ?? lockedSberTx?.visitId ?? null,
					receiptType: "income_return",
					status: "pending_print",
					payloadJson: {
						...ffdRefundPayload,
						clientMutationId: `${lockedPayment.clientMutationId ?? lockedPayment.id}:return`,
						originalPaymentId: lockedPayment.id,
						invoiceId: lockedSberTx?.invoiceId ?? lockedPayment.documentId ?? null,
					},
					retryCount: 0,
				});
			}
		}
	}

	const invoiceIdToReconcile = lockedSberTx?.invoiceId || lockedPayment?.documentId || null;
	const visitIdToReconcile = lockedPayment?.visitId ?? lockedSberTx?.visitId ?? null;
	await reconcileAcquiringRefundInDb(tx, orgId, {
		invoiceId: invoiceIdToReconcile,
		visitId: visitIdToReconcile,
	});

	return {
		statusCode: 200,
		body: {
			success: true,
			processed: true,
			status: "REFUNDED",
		},
	};
}
