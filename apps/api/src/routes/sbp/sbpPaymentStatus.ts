import { and, eq, or } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { payments } from "../../db/schema.js";

/** Queries payment status for SBP operation with mandatory tenant isolation */
export async function getSbpPaymentStatus(
	operationId: string,
	orgId: string,
): Promise<{
	readonly found: boolean;
	readonly status: string | null;
	readonly amountRub: number | null;
	readonly paidAt: Date | null;
	readonly paymentId: string | null;
} | null> {
	if (!orgId || typeof orgId !== "string" || !orgId.trim()) {
		throw new Error("Контекст организации (orgId) обязателен для проверки статуса СБП.");
	}

	return await withTenantCtx(orgId, async (tx) => {
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
