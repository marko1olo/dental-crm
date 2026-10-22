import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { communicationEvents } from "../../../db/schema.js";

export function registerCallRecordingHandlers(app: FastifyInstance): void {
	app.get("/api/communications/recordings/:id", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const [event] = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.id, id),
					eq(communicationEvents.organizationId, orgId),
				),
			)
			.limit(1);

		if (!event) {
			return reply.code(404).send({ error: "NotFound" });
		}

		if (!event.recordingUrl) {
			return reply.code(404).send({
				error: "NoRecording",
				message: "К этому событию не прикреплена аудиозапись.",
			});
		}

		return reply.send({
			id: event.id,
			recordingUrl: event.recordingUrl,
			durationSeconds: event.durationSeconds,
			audioFormat: event.audioFormat,
		});
	});

	app.get("/api/communications/recordings/:id/stream", async (request, reply) => {
		const orgId = await requireResolvedOrganizationId(request, reply);
		if (!orgId) return;

		const { id } = request.params as { id: string };
		const [event] = await db
			.select()
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.id, id),
					eq(communicationEvents.organizationId, orgId),
				),
			)
			.limit(1);

		if (!event?.recordingUrl) {
			return reply.code(404).send({ error: "NotFound" });
		}

		return reply.redirect(event.recordingUrl);
	});
}
