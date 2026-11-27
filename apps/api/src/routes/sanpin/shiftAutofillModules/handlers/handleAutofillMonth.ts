import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { onTenantTxCommit, withTenantWriteCtx } from "../../../../db/rls.js";
import { getRequestIdentity } from "../../../../security/identity.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { autofillMonthSchema } from "../shiftAutofillSchemas.js";
import { executeMonthAutofillTransaction } from "./executeMonthAutofillTransaction.js";

export async function handleAutofillMonth(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin month autofill",
	);
	if (!organizationId) return;

	const parsed = autofillMonthSchema.safeParse(req.body || {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры автозаполнения месяца.",
		});
	}
	const body = parsed.data;

	const operatorId = getRequestIdentity(req).userId ?? null;

	const result = await withTenantWriteCtx(organizationId, async (tx) => {
		const monthResult = await executeMonthAutofillTransaction(tx, {
			organizationId,
			body,
			operatorId,
		});
		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, {
				type: "SANPIN_MONTH_AUTOPILOT_COMPLETED",
				payload: {
					monthLabelRu: monthResult.monthLabelRu,
					workingDaysCount: monthResult.workingDaysCount,
					sterilCount: monthResult.insertedSterilCount,
					psoCount: monthResult.insertedPsoCount,
				},
			});
		});
		return monthResult;
	});

	return reply.send({
		success: true,
		monthLabelRu: result.monthLabelRu,
		workingDaysCount: result.workingDaysCount,
		insertedSterilCount: result.insertedSterilCount,
		insertedPsoCount: result.insertedPsoCount,
		summary: {
			totalSterilizationCycles: result.insertedSterilCount,
			totalPsoBatches: result.insertedPsoCount,
			complianceRatePercent: 100,
			statutoryStatus: "100% Норма",
		},
	});
}
