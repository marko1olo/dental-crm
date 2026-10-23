import { and, eq, or } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { payments, sberbankTransactions } from "../../db/schema.js";
import { handleSbpWebhookRefund } from "./sbpWebhookRefund.js";
import { handleSbpWebhookSuccess } from "./sbpWebhookSuccess.js";
import type { ProcessSbpWebhookResult } from "./sbpWebhookTypes.js";
import type { SbpWebhookTargetContext } from "./types.js";

/** Processes incoming SBP webhook payment within organization tenant boundary */
export async function processSbpWebhookTransaction(params: {
	orgId: string;
	operationId: string;
	targetContext: SbpWebhookTargetContext;
	payload: Record<string, unknown>;
	logWarn?: (obj: Record<string, unknown>, msg: string) => void;
}): Promise<ProcessSbpWebhookResult> {
	const { orgId, operationId, targetContext, payload, logWarn } = params;
	const mutationId = `sbp:${operationId}`;

	return await withTenantCtx(orgId, async (tx) => {
		let lockedSberTx: typeof sberbankTransactions.$inferSelect | undefined;
		if (targetContext.source === "sberbankTransactions") {
			const [locked] = await tx
				.select()
				.from(sberbankTransactions)
				.where(and(eq(sberbankTransactions.orderId, String(operationId)), eq(sberbankTransactions.organizationId, orgId)))
				.for("update")
				.limit(1);
			lockedSberTx = locked;
		}

		const [lockedPayment] = await tx
			.select()
			.from(payments)
			.where(and(eq(payments.organizationId, orgId), or(eq(payments.clientMutationId, mutationId), eq(payments.clientMutationId, String(operationId)))))
			.for("update")
			.limit(1);

		const incomingAmountKopecks =
			payload.amountKopecks !== undefined && payload.amountKopecks !== null
				? Number(payload.amountKopecks)
				: payload.amount !== undefined && payload.amount !== null
					? Number(payload.amount)
					: payload.sum !== undefined && payload.sum !== null
						? Number(payload.sum)
						: null;

		if (
			incomingAmountKopecks !== null &&
			targetContext.amountKopecks !== null &&
			!Number.isNaN(incomingAmountKopecks) &&
			incomingAmountKopecks !== targetContext.amountKopecks
		) {
			if (logWarn) {
				logWarn({ operationId, expected: targetContext.amountKopecks, received: incomingAmountKopecks }, "[SbpWebhook] Amount mismatch detected");
			}
			return {
				statusCode: 400,
				body: { error: "AmountMismatch", message: "Сумма в уведомлении СБП не совпадает с суммой зарегистрированной операции." },
			};
		}

		const operation = String(payload.operation ?? "").toLowerCase();
		const rawStatus = String(payload.status ?? payload.operation ?? "PAID").toLowerCase();

		if (operation === "refunded" || operation === "refund" || rawStatus === "refunded" || rawStatus === "refund") {
			return await handleSbpWebhookRefund({ tx, orgId, lockedSberTx, lockedPayment });
		}

		const isSuccess = ["deposited", "paid", "success", "accepted", "2", "0"].includes(rawStatus) || ["deposited", "paid"].includes(operation);
		if (isSuccess) {
			return await handleSbpWebhookSuccess({
				tx,
				orgId,
				operationId,
				mutationId,
				targetContext,
				payload,
				incomingAmountKopecks,
				lockedSberTx,
				lockedPayment,
			});
		}

		if (lockedSberTx) {
			await tx
				.update(sberbankTransactions)
				.set({ status: "failed", updatedAt: new Date() })
				.where(eq(sberbankTransactions.id, lockedSberTx.id));
		}

		return {
			statusCode: 200,
			body: { success: true, processed: true, status: "FAILED" },
		};
	});
}
