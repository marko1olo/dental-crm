import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { withTenantCtx } from "../../../../db/rls.js";
import { getRequestIdentity } from "../../../../security/identity.js";
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
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры автозаполнения смены.",
		});
	}
	const body = parsed.data;
	const now = new Date();
	const todayStr = (body.shiftDate as string) || (body.date as string) || now.toISOString().slice(0, 10);
	const resolvedUserId = getRequestIdentity(req).userId ?? null;

	const { insertedPso, insertedSteril } = await withTenantCtx(organizationId, async (tx) => {
		const result = await executeShiftAutofillTransaction(tx, {
			organizationId,
			body,
			operatorId: (body.operatorId as string) || resolvedUserId,
			todayStr,
		});

		// Пакетное списание расходников стерилизации со склада клиники в единой транзакции (Мандаты 8e, 8n, 8bo)
		for (const steril of result.insertedSteril) {
			await executeSterilizationConsumablesDeduction({
				organizationId,
				userId: resolvedUserId,
				count: 14,
				packagingType: steril.packagingType,
				indicatorType: steril.indicatorType,
				cycleNumber: steril.cycleNumber,
				barcode: steril.barcode,
				logger: req.log,
			}, tx);
		}

		return result;
	});

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
