import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patients } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { UUID_REGEX, sendMessageSchema } from "../types.js";
import { processSendMessage } from "./inboxMessageSender.js";

export function registerInboxSendHandlers(app: FastifyInstance): void {
	app.post(
		"/api/communications/inbox/:patientId/send",
		async (request, reply) => {
			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications send message",
			);
			if (!orgId) return;
			const { patientId } = request.params as { patientId: string };

			const identity = getRequestIdentity(request);
			if (identity.role === "marketer" || identity.role === "marketing") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "communications.inbox.send",
					role: identity.role,
					message:
						"Отправка сообщений в личный диалог пациента маркетологам запрещена (152-ФЗ / 323-ФЗ ст. 13).",
				});
			}

			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента.",
				});
			}

			const [patient] = await db
				.select({ id: patients.id, status: patients.status })
				.from(patients)
				.where(
					and(eq(patients.id, patientId), eq(patients.organizationId, orgId)),
				)
				.limit(1);
			if (!patient) {
				return reply.code(404).send({
					error: "PatientNotFound",
					message: "Пациент не найден в клинике.",
				});
			}

			if (patient.status === "archived") {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.archived.communications",
					message:
						"Отказ в отправке сообщения архивированному пациенту (152-ФЗ / 323-ФЗ ст. 13).",
				});
			}

			const bodyParsed = sendMessageSchema.safeParse(request.body);
			if (!bodyParsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						bodyParsed.error.issues[0]?.message ||
						"Некорректные параметры сообщения.",
					details: bodyParsed.error.issues,
				});
			}

			const result = await processSendMessage(orgId, patientId, bodyParsed.data);
			if ("status" in result && result.status) {
				return reply.code(result.status).send(result);
			}

			return reply.send(result);
		},
	);
}
