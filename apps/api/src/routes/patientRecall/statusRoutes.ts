import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { auditEvents, communicationEvents } from "../../db/schema.js";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { recallCandidateBelongsTo } from "../../services/patients/recallCandidates.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { badRequest, statusUpdateSchema } from "./types.js";

export function registerStatusRoutes(app: FastifyInstance) {
	const handleStatusUpdate = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"recall status update",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "patients.write") &&
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		) {
			return;
		}

		const { patientId } = request.params as { patientId: string };
		if (!patientId) {
			return badRequest(reply, "Не указан идентификатор пациента.");
		}

		if (
			!(await recallCandidateBelongsTo(
				context.organizationId,
				patientId,
			))
		) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		const parsed = statusUpdateSchema.safeParse(request.body);
		if (!parsed.success) {
			return badRequest(reply, "Укажите новый статус пациента.");
		}

		const { status, channel, note } = parsed.data;
		const normalizedAction = `RECALL_STATUS_${status.toUpperCase()}`;
		const actorUserId = (request.user as { id?: string } | undefined)?.id ?? null;

		const validCommChannels = ["sms", "whatsapp", "telegram", "phone", "email"] as const;
		const commChannel = channel
			? validCommChannels.find((c) => c === channel.toLowerCase())
			: undefined;

		await db.transaction(async (tx) => {
			await tx.insert(auditEvents).values({
				organizationId: context.organizationId,
				actorUserId,
				entityType: "patient_recall",
				entityId: patientId,
				action: normalizedAction,
				reason: note ?? `Обновление статуса профосмотра: ${status}`,
			});

			if (commChannel) {
				let commStatus: "queued" | "sent" | "delivered" | "failed" = "queued";
				const lowerStatus = status.toLowerCase();
				if (["sent", "reached", "contacted", "confirmed", "scheduled"].includes(lowerStatus)) {
					commStatus = "delivered";
				} else if (["cancelled", "declined", "no_answer", "failed"].includes(lowerStatus)) {
					commStatus = "failed";
				}

				await tx.insert(communicationEvents).values({
					organizationId: context.organizationId,
					patientId,
					actorUserId,
					channel: commChannel,
					direction: "outbound",
					status: commStatus,
					message: note ?? `Контрольный вызов: ${status}`,
				});
			}
		});

		const updatedAt = new Date().toISOString();
		wsBroker.broadcastToOrganization(context.organizationId, {
			type: "PATIENT_RECALL_UPDATED",
			payload: {
				patientId,
				status,
				channel: commChannel ?? channel ?? null,
				note: note ?? null,
				updatedAt,
			},
		});

		return reply.code(200).send({
			ok: true,
			patientId,
			status,
			updatedAt,
			message: "Статус контрольного осмотра сохранён.",
		});
	};

	app.patch("/api/patients/recall-candidates/:patientId/status", handleStatusUpdate);
	app.post("/api/patients/recall-candidates/:patientId/status", handleStatusUpdate);
	app.patch("/api/recalls/:patientId/status", handleStatusUpdate);
	app.post("/api/recalls/:patientId/status", handleStatusUpdate);
}
