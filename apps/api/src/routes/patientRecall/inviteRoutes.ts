import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patientRecalls } from "../../db/schema.js";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { isMachineDeliverableChannel } from "../../services/communications/channelRouter.js";
import { enqueueMessage } from "../../services/communications/dispatcher.js";
import type { EnqueueMessageResult } from "../../services/communications/dispatch/types.js";
import { recallCandidateBelongsTo } from "../../services/patients/recallCandidates.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import { badRequest, inviteSchema } from "./types.js";

export function registerInviteRoutes(app: FastifyInstance) {
	const handleInvite = async (request: FastifyRequest, reply: FastifyReply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"recall invite",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const idempotencyKey = extractIdempotencyKey(request);
		if (idempotencyKey && !isValidUuid(idempotencyKey)) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Заголовок Idempotency-Key должен содержать валидный UUID/UUIDv7.",
			});
		}
		if (idempotencyKey) {
			reply.header("Idempotency-Key", idempotencyKey);
		}

		const parsed = inviteSchema.safeParse(request.body);
		if (!parsed.success)
			return badRequest(reply, "Укажите пациента, канал и текст приглашения.");

		const { channel, patientId, body } = parsed.data;

		if (!isMachineDeliverableChannel(channel)) {
			return badRequest(
				reply,
				`Канал «${channel}» не отправляется автоматически — по нему нужно позвонить или пригласить лично.`,
			);
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

		const now = new Date();
		const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

		let result: EnqueueMessageResult | undefined;

		await db.transaction(async (tx) => {
			result = await enqueueMessage(
				{
					organizationId: context.organizationId,
					patientId,
					channel,
					intent: "recall",
					scope: "marketing",
					body,
					dedupeKey: `recall:${patientId}:${period}`,
				},
				tx,
			);

			if (!result.ok) return;

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

			const notes = `Приглашение отправлено через ${channel}: ${body.slice(0, 100)}`;
			if (existingRecalls.length > 0 && existingRecalls[0]) {
				await tx
					.update(patientRecalls)
					.set({
						status: "invited",
						channel,
						notes,
						updatedAt: now,
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
					status: "invited",
					dueDate: now,
					channel,
					notes,
				});
			}
		});

		if (!result || !result.ok) {
			return badRequest(reply, result?.reason ?? "Ошибка при постановке сообщения.");
		}

		try {
			wsBroker.broadcastToOrganization(context.organizationId, {
				type: "PATIENT_RECALL_UPDATED",
				payload: {
					patientId,
					status: "invited",
					channel,
					note: `Приглашение отправлено через ${channel}`,
					updatedAt: now.toISOString(),
				},
			});
		} catch {
			// Не блокирует ответ
		}

		return reply.code(200).send({
			ok: true,
			outboxId: result.outboxId,
			duplicate: result.duplicate,
			message: result.duplicate
				? "Этого пациента уже приглашали в этом месяце — второе сообщение не отправлено."
				: "Приглашение поставлено в очередь. Оно уйдёт, если пациент давал согласие на такие сообщения.",
		});
	};

	// door-validation: none — Валидация параметров приглашения пациента выполняется внутри handleInvite
	app.post("/api/recalls/invite", async (request, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleInvite(request, reply);
	});
	// door-validation: none — Валидация параметров приглашения пациента выполняется внутри handleInvite
	app.post("/api/patients/recall-candidates/invite", async (request, reply) => {
		// requireClinicalMutationContext / organizationId / Idempotency-Key
		return handleInvite(request, reply);
	});
}
