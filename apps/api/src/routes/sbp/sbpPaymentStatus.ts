import { and, eq, or } from "drizzle-orm";
import { withSuperuserBypass } from "../../db/rls.js";
import { payments } from "../../db/schema.js";

/** Queries payment status for SBP operation */
export async function getSbpPaymentStatus(
	operationId: string,
	orgId?: string,
): Promise<{
	readonly found: boolean;
	readonly status: string | null;
	readonly amountRub: number | null;
	readonly paidAt: Date | null;
	readonly paymentId: string | null;
} | null> {
	return await withSuperuserBypass(async (tx) => {
		const mutationId = `sbp:${operationId}`;
		const query = tx
			.select()
			.from(payments)
			.where(
				orgId
					? and(
							eq(payments.organizationId, orgId),
							or(
								eq(payments.clientMutationId, mutationId),
								eq(payments.clientMutationId, String(operationId)),
							),
						)
					: or(
							eq(payments.clientMutationId, mutationId),
							eq(payments.clientMutationId, String(operationId)),
						),
			)
			.limit(1);

		const [payment] = await query;
		if (!payment) {
			return {
				found: false,
				status: null,
				amountRub: null,
				paidAt: null,
				paymentId: null,
			};
		}

		return {
			found: true,
			status: payment.status,
			amountRub: Number(payment.amountRub),
			paidAt: payment.paidAt,
			paymentId: payment.id,
		};
	});
}
