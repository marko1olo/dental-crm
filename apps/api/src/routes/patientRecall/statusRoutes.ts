import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { defineTenantMutation } from "../../core/routeFactories.js";
import { onTenantTxCommit, type TenantDb } from "../../db/rls.js";
import { auditEvents, communicationEvents, patientRecalls } from "../../db/schema.js";
import type { VerifiedPrincipal } from "../../security/unifiedAuthPerimeter.js";
import { recallCandidateBelongsTo } from "../../services/patients/recallCandidates.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { badRequest, recallStatusParamsSchema, statusUpdateSchema } from "./types.js";

export function registerStatusRoutes(app: FastifyInstance) {
	const handleStatusUpdate = async (ctx: {
		tx: TenantDb;
		principal: VerifiedPrincipal;
		organizationId: string;
		request: FastifyRequest;
		reply: FastifyReply;
	}) => {
		const { tx, principal, organizationId, request, reply } = ctx;

		const parsedParams = recallStatusParamsSchema.safeParse(request.params ?? {});
		if (!parsedParams.success) {
			return badRequest(reply, "Некорректный идентификатор пациента.");
		}
		const { patientId } = parsedParams.data;

		const parsed = statusUpdateSchema.safeParse(request.body);
		if (!parsed.success) {
			return badRequest(reply, "Укажите допустимый статус профосмотра пациента.");
		}

		const { status, channel, note } = parsed.data;
		const normalizedAction = `RECALL_STATUS_${status.toUpperCase()}`;
		const actorUserId = principal.userId ?? null;

		const validCommChannels = ["sms", "whatsapp", "telegram", "phone", "email"] as const;
		const commChannel = channel
			? validCommChannels.find((c) => c === channel.toLowerCase())
			: undefined;

		const updatedAt = new Date();
		const updatedAtIso = updatedAt.toISOString();

		if (!(await recallCandidateBelongsTo(organizationId, patientId, tx))) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		await tx.insert(auditEvents).values({
			organizationId,
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
				organizationId,
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
					eq(patientRecalls.organizationId, organizationId),
					eq(patientRecalls.patientId, patientId),
				),
			)
			.orderBy(desc(patientRecalls.createdAt))
			.limit(1);

		const isCompletedState = ["completed", "scheduled", "converted"].includes(status.toLowerCase());
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
						eq(patientRecalls.organizationId, organizationId),
					),
				);
		} else {
			await tx.insert(patientRecalls).values({
				organizationId,
				patientId,
				status,
				dueDate: updatedAt,
				channel: commChannel ?? channel ?? null,
				notes: note ?? `Обновление статуса профосмотра: ${status}`,
				completedAt: isCompletedState ? updatedAt : null,
			});
		}

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(organizationId, {
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

		return reply.code(200).send({
			ok: true,
			patientId,
			status,
			updatedAt: updatedAtIso,
			message: "Статус контрольного осмотра сохранён.",
		});
	};

	const statusAuthOptions = {
		allowClinicTokenWithoutStaff: true,
		allowAdminSecretBypass: true,
	} as const;
	const statusPermission = {
		anyOf: ["patients.write", "communications.write"],
	} as const;

	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/patients/recall-candidates/:patientId/status",
		permission: statusPermission,
		authOptions: statusAuthOptions,
		idempotency: "optional_header",
		handler: async (ctx) => handleStatusUpdate(ctx),
	});
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/patients/recall-candidates/:patientId/status",
		permission: statusPermission,
		authOptions: statusAuthOptions,
		idempotency: "optional_header",
		handler: async (ctx) => handleStatusUpdate(ctx),
	});
	defineTenantMutation(app, {
		method: "PATCH",
		path: "/api/recalls/:patientId/status",
		permission: statusPermission,
		authOptions: statusAuthOptions,
		idempotency: "optional_header",
		handler: async (ctx) => handleStatusUpdate(ctx),
	});
	defineTenantMutation(app, {
		method: "POST",
		path: "/api/recalls/:patientId/status",
		permission: statusPermission,
		authOptions: statusAuthOptions,
		idempotency: "optional_header",
		handler: async (ctx) => handleStatusUpdate(ctx),
	});
}
