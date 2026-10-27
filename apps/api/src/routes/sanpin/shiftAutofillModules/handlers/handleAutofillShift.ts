import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import { wsBroker } from "../../../../services/websocketBroker.js";
import { executeSterilizationConsumablesDeduction } from "../../sterilizationModules/sterilizationStockDeduction.js";
import { autofillShiftSchema } from "../shiftAutofillSchemas.js";
import { executeShiftAutofillTransaction } from "./executeShiftAutofillTransaction.js";

export async function handleAutofillShift(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"sanpin shift autofill",
	);
	if (!organizationId) return;

	const parsed = autofillShiftSchema.safeParse(req.body || {});
	const body = parsed.success
		? parsed.data
		: ((req.body as any) || {});
	const now = new Date();
	const todayStr = body.date || now.toISOString().slice(0, 10);

	const { insertedPso, insertedSteril } = await withTenantCtx(organizationId, async (tx) => {
		return executeShiftAutofillTransaction(tx, {
			organizationId,
			body,
			operatorId: req.user?.id || null,
			todayStr,
		});
	});

	// Пакетное списание расходников стерилизации со склада клиники (Мандаты 8e, 8n)
	for (const steril of insertedSteril) {
		void executeSterilizationConsumablesDeduction({
			organizationId,
			userId: req.user?.id || null,
			count: 14,
			packagingType: steril.packagingType,
			indicatorType: steril.indicatorType,
			cycleNumber: steril.cycleNumber,
			barcode: steril.barcode,
		}).catch(() => null);
	}

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_SHIFT_AUTOPILOT_COMPLETED",
		payload: {
			date: todayStr,
			psoCount: insertedPso.length,
			sterilCount: insertedSteril.length,
		},
	});

	return reply.send({
		success: true,
		date: todayStr,
		batchCount: insertedPso.length,
		sterilCount: insertedSteril.length,
		summary: {
			totalPsoItems: insertedPso.reduce((acc, p) => acc + p.batchItemCount, 0),
			totalSterilizationCycles: insertedSteril.length,
		},
	});
}
