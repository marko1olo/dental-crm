import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { telephonyWebhookSchema } from "../types.js";
import { processTelephonyWebhook } from "./telephonyWebhookProcessor.js";

export function registerTelephonyWebhookHandlers(app: FastifyInstance): void {
	app.post("/api/communications/telephony/webhook", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"telephony webhook",
		);
		if (!orgId) return;

		const parsed = telephonyWebhookSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректный формат данных вебхука телефонии.",
				details: parsed.error.issues,
			});
		}

		const result = await processTelephonyWebhook(orgId, parsed.data);
		if ("duplicate" in result) {
			return reply.code(200).send({
				success: true,
				duplicate: true,
				event: result.event,
			});
		}

		if ("error" in result) {
			return reply.code(500).send({
				error: result.error,
				message: "Не удалось привязать звонок к карточке пациента.",
			});
		}

		return reply.code(201).send(result);
	});
}
