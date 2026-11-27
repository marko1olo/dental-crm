import { kopecksToRubles } from "@dental/shared";
import { and, eq, or } from "drizzle-orm";
import { withTenantReadCtx } from "../../db/rls.js";
import { payments, sberbankTransactions } from "../../db/schema.js";

/** Queries payment status for SBP operation with mandatory tenant isolation */
export async function getSbpPaymentStatus(
	operationId: string,
	orgId: string,
): Promise<{
	readonly found: boolean;
	readonly status: string | null;
	readonly amountRub: number | null;
	readonly amountKopecks: number | null;
	readonly paidAt: Date | null;
	readonly paymentId: string | null;
} | null> {
	if (!orgId || typeof orgId !== "string" || !orgId.trim()) {
		throw new Error("Контекст организации (orgId) обязателен для проверки статуса СБП.");
	}

	return await withTenantReadCtx(orgId, async (tx) => {
		const mutationId = `sbp:${operationId}`;
		const query = tx
			.select()
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					or(
						eq(payments.clientMutationId, mutationId),
						eq(payments.clientMutationId, String(operationId)),
					),
				),
			)
			.limit(1);

		const [payment] = await query;
		if (!payment) {
			const [sberTx] = await tx
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, orgId),
						eq(sberbankTransactions.orderId, operationId),
					),
				)
				.limit(1);

			if (sberTx) {
				const txAmountKopecks = Number(sberTx.amountKopecks);
				return {
					found: true,
					status: sberTx.status,
					amountRub: kopecksToRubles(txAmountKopecks),
					amountKopecks: txAmountKopecks,
					paidAt: null,
					paymentId: null,
				};
			}

			return {
				found: false,
				status: null,
				amountRub: null,
				amountKopecks: null,
				paidAt: null,
				paymentId: null,
			};
		}

		const paymentAmountKopecks =
			payment.amountKopecks !== null && payment.amountKopecks !== undefined
				? Number(payment.amountKopecks)
				: null;

		return {
			found: true,
			status: payment.status,
			amountRub:
				paymentAmountKopecks !== null && paymentAmountKopecks > 0
					? kopecksToRubles(paymentAmountKopecks)
					: Number(payment.amountRub),
			amountKopecks: paymentAmountKopecks,
			paidAt: payment.paidAt,
			paymentId: payment.id,
		};
	});
}
