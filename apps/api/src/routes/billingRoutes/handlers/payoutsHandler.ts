import type { FastifyReply, FastifyRequest } from "fastify";
import {
	doctorPayouts,
	resolvePayoutPeriod,
} from "../../../services/finance/doctorPayouts.js";
import { explainNegativePayouts } from "../../../services/finance/payoutNegativeExplain.js";
import { clinicTimeZone } from "../../../services/reports/managerReports.js";
import { resolvePeriodBoundary } from "../../reports.js";
import { requirePayoutAccess } from "../paymentProcessingService.js";
import { payoutQuerySchema } from "../types.js";

export async function handleGetPayouts(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const access = await requirePayoutAccess(request, reply);
	if (reply.sent) return reply;
	if (!access) return reply;

	const parsedQuery = payoutQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		return reply.code(400).send({
			error: "PayoutValidationError",
			message:
				"Проверьте период расчёта: начало и конец передаются датой со временем.",
		});
	}

	const timeZone = await clinicTimeZone(access.organizationId);
	const bounds: { from?: string; to?: string } = {};
	for (const edge of ["from", "to"] as const) {
		const raw = parsedQuery.data[edge];
		if (raw === undefined) continue;
		const resolved = resolvePeriodBoundary(raw, edge, timeZone);
		if (resolved === null) {
			return reply.code(400).send({
				error: "PayoutValidationError",
				message:
					"Границы периода не разобраны. Передайте календарную дату вида ГГГГ-ММ-ДД либо дату со временем и смещением.",
			});
		}
		bounds[edge] = resolved.toISOString();
	}
	const period = resolvePayoutPeriod(bounds, new Date(), timeZone);
	if (!period.ok) {
		return reply
			.code(400)
			.send({ error: "PayoutValidationError", message: period.message });
	}

	try {
		const report = await doctorPayouts({
			organizationId: access.organizationId,
			from: period.from,
			to: period.to,
			onlyDoctorUserId: access.scope === "own" ? access.userId : null,
		});
		const explained = explainNegativePayouts(report, { scope: access.scope });
		return { scope: access.scope, ...explained };
	} catch (error) {
		request.log.error({ err: error }, "billing payouts calculation failed");
		return reply.code(500).send({
			error: "PayoutCalculationFailed",
			message:
				"Расчёт выплат не выполнен: сервер не смог посчитать суммы по базе. " +
				"Это отказ расчёта, а не отсутствие заработка — покажите сообщение администратору системы.",
		});
	}
}
