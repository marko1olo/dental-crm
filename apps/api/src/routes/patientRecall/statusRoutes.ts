import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { auditEvents, communicationEvents, patientRecalls } from "../../db/schema.js";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { roleHasPermission } from "../../security/permissions.js";
import { getRequestIdentity } from "../../security/identity.js";
import { recallCandidateBelongsTo } from "../../services/patients/recallCandidates.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { badRequest, statusUpdateSchema } from "./types.js";

const uuidSchema = z.string().uuid();

export function registerStatusRoutes(app: FastifyInstance) {
	const handleStatusUpdate = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"recall status update",
		);
		if (!context) return;
		const identity = getRequestIdentity(request);
		if (
			identity?.role &&
			!roleHasPermission(identity.role, "patients.write") &&
			!roleHasPermission(identity.role, "communications.write")
		) {
			return reply.code(403).send({
				error: "Forbidden",
				message: "Недостаточно прав: требуется право 'patients.write' или 'communications.write'.",
			});
		}

		const { patientId } = request.params as { patientId: string };
		if (!patientId || !uuidSchema.safeParse(patientId).success) {
			return badRequest(reply, "Некорректный идентификатор пациента.");
		}

		const parsed = statusUpdateSchema.safeParse(request.body);
		if (!parsed.success) {
			return badRequest(reply, "Укажите новый статус пациента.");
		}

		const { status, channel, note } = parsed.data;
		const normalizedAction = `RECALL_STATUS_${status.toUpperCase()}`;
		const actorUserId = identity.userId ?? null;

		const validCommChannels = ["sms", "whatsapp", "telegram", "phone", "email"] as const;
		const commChannel = channel
			? validCommChannels.find((c) => c === channel.toLowerCase())
			: undefined;

		const updatedAt = new Date();
		const updatedAtIso = updatedAt.toISOString();

		const belongs = await withTenantCtx(context.organizationId, async (tx) => {
			if (
				!(await recallCandidateBelongsTo(
					context.organizationId,
					patientId,
				))
			) {
				return false;
			}

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

			// Реальная персистентность статуса в PostgreSQL 18 patient_recalls (Дефект 3)
			const existingRecalls = await tx
				.select({ id: patientRecalls.id })
				.from(patientRecalls)
				.where(
					and(
						eq(patientRecalls.organizationId, context.organizationId),
						eq(patientRecalls.patientId, patientId),
					),
				)
				.orderBy(desc(patientRecalls.createdAt))
				.limit(1);

			const isCompletedState = ["completed", "reached", "scheduled"].includes(status.toLowerCase());
			if (existingRecalls.length > 0 && existingRecalls[0]) {
				await tx
					.update(patientRecalls)
					.set({
						status,
						channel: commChannel ?? channel ?? null,
						notes: note ?? null,
						completedAt: isCompletedState ? updatedAt : null,
						updatedAt,
					})
					.where(
						and(
							eq(patientRecalls.id, existingRecalls[0].id),
							eq(patientRecalls.organizationId, context.organizationId),
						),
					);
			} else {
				await tx.insert(patientRecalls).values({
					organizationId: context.organizationId,
					patientId,
					status,
					dueDate: updatedAt,
					channel: commChannel ?? channel ?? null,
					notes: note ?? `Обновление статуса профосмотра: ${status}`,
					completedAt: isCompletedState ? updatedAt : null,
				});
			}

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(context.organizationId, {
					type: "PATIENT_RECALL_UPDATED",
					payload: {
						patientId,
						status,
						channel: commChannel ?? channel ?? null,
						note: note ?? null,
						updatedAt: updatedAtIso,
					},
				});
			});

			return true;
		});

		if (!belongs) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		return reply.code(200).send({
			ok: true,
			patientId,
			status,
			updatedAt: updatedAtIso,
			message: "Статус контрольного осмотра сохранён.",
		});
	};

	app.patch("/api/patients/recall-candidates/:patientId/status", handleStatusUpdate);
	app.post("/api/patients/recall-candidates/:patientId/status", handleStatusUpdate);
	app.patch("/api/recalls/:patientId/status", handleStatusUpdate);
	app.post("/api/recalls/:patientId/status", handleStatusUpdate);
}
