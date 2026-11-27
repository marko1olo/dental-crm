import { kopecksToRub, positiveMoneyRubSchema } from "@dental/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { executeLabOrderPayment } from "./labOrderPayDb.js";

const payParamsSchema = z.object({
	id: z.string().uuid("Идентификатор наряда ЗТЛ должен быть корректным UUID"),
}).strict();

const payBodySchema = z.object({
	cashBoxId: z.string().uuid().optional(),
	amountRub: positiveMoneyRubSchema.optional(),
	amountKopecks: z.union([z.number().int().positive(), z.bigint()]).optional(),
	notes: z.string().trim().max(500).optional(),
}).strict();

export async function labOrderPayHandler(
	request: FastifyRequest,
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

	const rawKey = request.headers["idempotency-key"] ?? request.headers["x-idempotency-key"];
	const idempotencyKey = typeof rawKey === "string" ? rawKey.trim() : Array.isArray(rawKey) ? rawKey[0]?.trim() : undefined;
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
		});
	}

	const parsed = payBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры оплаты наряда ЗТЛ.",
			details: parsed.error.issues,
		});
	}
	const payData = parsed.data;

	const result = await executeLabOrderPayment(orgId, paramsParsed.data.id, {
		...payData,
		...(idempotencyKey ? { idempotencyKey } : {}),
	});

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
	if (result.kind === "amount_exceeds_cost") {
		const maxRub = kopecksToRub(result.maxAllowedKopecks);
		return reply.code(400).send({
			error: "AmountExceedsCost",
			message: `Сумма списания технику не может превышать себестоимость наряда ЗТЛ (${maxRub} ₽). Розница пациента неприкосновенна!`,
			maxAllowedRub: maxRub,
		});
	}
	if (result.kind === "no_cash_box") {
		return reply.code(400).send({
			error: "NoCashBox",
			message: "Кассовые счета организации не найдены.",
		});
	}

	if (idempotencyKey) {
		reply.header("X-Idempotency-Key", idempotencyKey);
	}
	if (result.isReplay) {
		reply.header("idempotency-replayed", "true");
	}

	const payloadData = {
		message: `Оплата наряда ЗТЛ на сумму ${result.operation.amountRub} ₽ успешно проведена по статье 11.`,
		cashOperation: {
			...result.operation,
			amountKopecks: result.amountKopecks,
		},
		labOrder: result.labOrder,
		amountKopecks: result.amountKopecks,
	};

	return reply.send({
		success: true,
		data: payloadData,
		...payloadData,
	});
}
