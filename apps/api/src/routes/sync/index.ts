import {
	syncPushBatchRequestSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { SyncGatewayService } from "../../services/sync/syncGatewayService.js";
import { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
import { RouteSyncQueueManager } from "./syncQueueManager.js";

const syncPullQuerySchema = z
	.object({
		since: z.string().optional(),
	})
	.strict();

export async function registerSyncRoutes(app: FastifyInstance) {
	/**
	 * Главный шлюз синхронизации офлайн-очереди (Push Batch).
	 * Принимает пачку изменений с клиентскими Idempotency-Key и векторами мутаций.
	 */
	app.post("/api/sync/gateway", async (request: FastifyRequest, reply: FastifyReply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"sync gateway push",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync gateway push",
		);
		if (!orgId) return;

		const parsed = syncPushBatchRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "SyncBatchValidationError",
				message:
					"Пакет синхронизации не прошел проверку: проверьте структуру очередей, idempotencyKey и payloadHash.",
				issues: parsed.error.issues,
			});
		}

		const identity = getRequestIdentity(request);
		const result = await SyncGatewayService.processPushBatch(
			orgId,
			parsed.data,
			identity.userId || undefined,
			{ logger: request.log },
		);

		return reply.code(200).send(result);
	});

	/**
	 * Альтернативный алиас для push синхронизации (/api/sync/push).
	 */
	app.post("/api/sync/push", async (request: FastifyRequest, reply: FastifyReply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"sync push",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync push",
		);
		if (!orgId) return;

		const parsed = syncPushBatchRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "SyncBatchValidationError",
				message:
					"Пакет синхронизации не прошел проверку: проверьте структуру очередей, idempotencyKey и payloadHash.",
				issues: parsed.error.issues,
			});
		}

		const identity = getRequestIdentity(request);
		const result = await SyncGatewayService.processPushBatch(
			orgId,
			parsed.data,
			identity.userId || undefined,
			{ logger: request.log },
		);

		return reply.code(200).send(result);
	});

	/**
	 * Получение серверных изменений для догоняющей синхронизации офлайн-клиента (Pull).
	 */
	app.get("/api/sync/pull", async (request: FastifyRequest, reply: FastifyReply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"sync pull",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync pull",
		);
		if (!orgId) return;

		const parsed = syncPullQuerySchema.safeParse(request.query ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры запроса синхронизации.",
				issues: parsed.error.issues,
			});
		}
		const since = parsed.data.since;

		const result = await SyncGatewayService.pullChanges(orgId, since);
		return reply.code(200).send(result);
	});

	app.post("/api/sync/pull", async (request: FastifyRequest, reply: FastifyReply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"sync pull post",
			))
		) {
			return;
		}

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"sync pull post",
		);
		if (!orgId) return;

		const parsed = syncPullQuerySchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректное тело запроса синхронизации.",
				issues: parsed.error.issues,
			});
		}
		const result = await SyncGatewayService.pullChanges(orgId, parsed.data.since);
		return reply.code(200).send(result);
	});

	/**
	 * Административные маршруты управления очередью синхронизации и аудита коллизий.
	 */
	app.get("/api/sync/admin/queue/stats", SyncAdministrativeHandlers.getQueueStats);
	app.get("/api/sync/admin/dlq", SyncAdministrativeHandlers.getDeadLetterQueue);
	app.post("/api/sync/admin/replay", SyncAdministrativeHandlers.replaySyncJob);
	app.get("/api/sync/admin/vectors", SyncAdministrativeHandlers.getEntityVectorsAudit);
	app.post("/api/sync/admin/recover-stale", SyncAdministrativeHandlers.recoverStaleTasks);
}

export { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
export { RouteSyncQueueManager } from "./syncQueueManager.js";
export default registerSyncRoutes;
