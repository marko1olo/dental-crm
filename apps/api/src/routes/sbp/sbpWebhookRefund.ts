import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../db/rls.js";
import { payments, sberbankTransactions } from "../../db/schema.js";
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
