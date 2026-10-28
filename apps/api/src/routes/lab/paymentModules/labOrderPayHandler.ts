import { positiveMoneyRubSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { executeLabOrderPayment } from "./labOrderPayDb.js";

const payParamsSchema = z.object({
	id: z.string().uuid("Идентификатор наряда ЗТЛ должен быть корректным UUID"),
});

const payBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema.optional(),
	amountKopecks: z.union([z.number().int().positive(), z.bigint()]).optional(),
	notes: z.string().trim().max(500).optional(),
});

export async function labOrderPayHandler(
	request: FastifyRequest<{ Params: { id: string } }>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab order pay from cashbox",
	);
	if (reply.sent || !orgId) return reply;

	const paramsParsed = payParamsSchema.safeParse(request.params);
	if (!paramsParsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор наряда ЗТЛ.",
			details: paramsParsed.error.issues,
		});
	}

	const parsed = payBodySchema.safeParse(request.body || {});
	const payData = parsed.success ? parsed.data : {};

	const result = await executeLabOrderPayment(orgId, paramsParsed.data.id, payData);

	if (result.kind === "order_not_found") {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд ЗТЛ не найден.",
		});
	}
	if (result.kind === "already_paid") {
		return reply.code(409).send({
			error: "LabOrderAlreadyPaid",
			message: "Заказ-наряд ЗТЛ уже был оплачен ранее.",
		});
	}
	if (result.kind === "invalid_amount") {
		return reply.code(400).send({
			error: "InvalidAmount",
			message: "Сумма оплаты заказ-наряда ЗТЛ должна быть больше нуля.",
		});
	}
	if (result.kind === "no_cash_box") {
		return reply.code(400).send({
			error: "NoCashBox",
			message: "Кассовые счета организации не найдены.",
		});
	}

	return reply.send({
		success: true,
		message: `Оплата наряда ЗТЛ на сумму ${result.operation.amountRub} ₽ успешно проведена по статье 11.`,
		cashOperation: {
			...result.operation,
			amountKopecks: result.amountKopecks,
		},
		labOrder: result.labOrder,
		amountKopecks: result.amountKopecks,
	});
}
