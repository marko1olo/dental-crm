/**
 * outboxReceiptHandlers.ts — Handlers for statutory REMD registration receipts.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { EgiszOutboxDispatcher } from "../../../services/egisz/EgiszOutboxDispatcher.js";

export async function handleOutboxReceipt(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "egisz outbox receipt read"))) return;
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return;

	const parsed = z.object({ outboxId: z.string().uuid() }).safeParse(request.params);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Параметр outboxId должен быть валидным UUID.",
		});
	}

	const dispatcher = new EgiszOutboxDispatcher();
	const receipt = await dispatcher.getReceiptByOutboxId(orgId, parsed.data.outboxId);
	if (!receipt) {
		return reply.status(404).send({
			error: "ReceiptNotFound",
			message: "Регистрационная квитанция РЭМД не найдена или документ ещё не зарегистрирован в Минздраве.",
		});
	}
	return reply.status(200).send({ ok: true, receipt });
}

export async function handleVisitReceipt(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "egisz visit receipt read"))) return;
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return;

	const parsed = z.object({ visitId: z.string().uuid() }).safeParse(request.params);
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Параметр visitId должен быть валидным UUID.",
		});
	}

	const dispatcher = new EgiszOutboxDispatcher();
	const receipt = await dispatcher.getReceiptByVisitId(orgId, parsed.data.visitId);
	if (!receipt) {
		return reply.status(404).send({
			error: "ReceiptNotFound",
			message: "Регистрационная квитанция РЭМД для указанного приёма не найдена или документ ещё не зарегистрирован в Минздраве.",
		});
	}
	return reply.status(200).send({ ok: true, receipt });
}
