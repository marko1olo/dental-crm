import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { defineTenantMutation } from "../../core/routeFactories.js";
import { onTenantTxCommit, type TenantDb } from "../../db/rls.js";
import { patientRecalls } from "../../db/schema.js";
import { isMachineDeliverableChannel } from "../../services/communications/channelRouter.js";
import { enqueueMessage } from "../../services/communications/dispatcher.js";
import type { EnqueueMessageResult } from "../../services/communications/dispatch/types.js";
import { recallCandidateBelongsTo } from "../../services/patients/recallCandidates.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { badRequest, inviteSchema } from "./types.js";

export function registerInviteRoutes(app: FastifyInstance) {
	const handleInvite = async (ctx: {
		tx: TenantDb;
		organizationId: string;
		request: FastifyRequest;
		reply: FastifyReply;
	}) => {
		const { tx, organizationId, request, reply } = ctx;
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

		const now = new Date();
		const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

		if (!(await recallCandidateBelongsTo(organizationId, patientId, tx))) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		const enqueueRes: EnqueueMessageResult = await enqueueMessage(
			{
				organizationId,
				patientId,
				channel,
				intent: "recall",
				scope: "marketing",
				body,
				dedupeKey: `recall:${patientId}:${period}`,
			},
			tx,
		);

		if (!enqueueRes.ok) {
			return badRequest(reply, enqueueRes.reason ?? "Ошибка при постановке сообщения.");
		}

		const existingRecalls = await tx
			.select({ id: patientRecalls.id })
			.from(patientRecalls)
			.where(
				and(
					eq(patientRecalls.organizationId, organizationId),
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
						eq(patientRecalls.organizationId, organizationId),
					),
				);
		} else {
			await tx.insert(patientRecalls).values({
				organizationId,
				patientId,
				status: "invited",
				dueDate: now,
				channel,
				notes,
			});
		}

		onTenantTxCommit(() => {
			try {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "PATIENT_RECALL_UPDATED",
					payload: {
						patientId,
						status: "invited",
						channel,
						note: `Приглашение отправлено через ${channel}`,
						updatedAt: now.toISOString(),
					},
				});
			} catch (wsErr) {
				request.log.warn(
					{ err: wsErr, patientId, orgId: organizationId },
					"[patientRecall] Ошибка отправки WS-уведомления о приглашении",
				);
			}
		});

		return reply.code(200).send({
			ok: true,
			outboxId: enqueueRes.outboxId,
			duplicate: enqueueRes.duplicate,
			message: enqueueRes.duplicate
				? "Этого пациента уже приглашали в этом месяце — второе сообщение не отправлено."
				: "Приглашение поставлено в очередь. Оно уйдёт, если пациент давал согласие на такие сообщения.",
		});
	};

	const inviteAuthOptions = {
		allowClinicTokenWithoutStaff: true,
		allowAdminSecretBypass: true,
	} as const;

	// door-validation: none — Валидация параметров приглашения пациента выполняется внутри handleInvite
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/recalls/invite",
		permission: "communications.write",
		authOptions: inviteAuthOptions,
		idempotency: "optional_header",
		handler: async (ctx) => handleInvite(ctx),
	});
	// door-validation: none — Валидация параметров приглашения пациента выполняется внутри handleInvite
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/patients/recall-candidates/invite",
		permission: "communications.write",
		authOptions: inviteAuthOptions,
		idempotency: "optional_header",
		handler: async (ctx) => handleInvite(ctx),
	});
}
