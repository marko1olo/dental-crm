import {
	syncPushBatchRequestSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { getRequestIdentity } from "../../security/identity.js";
import { SyncStreamTransport } from "../../services/sync/syncGateway/syncStreamTransport.js";
import { SyncGatewayService } from "../../services/sync/syncGatewayService.js";
import { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
import { RouteSyncQueueManager } from "./syncQueueManager.js";

const syncPullQuerySchema = z
	.object({
		since: z.string().optional(),
		cursor: z.string().optional(),
		limit: z.coerce.number().int().min(1).max(1000).optional(),
	})
	.strict();

export async function registerSyncRoutes(app: FastifyInstance) {
	/**
	 * Главный шлюз синхронизации офлайн-очереди (Push Batch).
	 * Принимает пачку изменений с клиентскими Idempotency-Key и векторами мутаций.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/gateway",
		permission: "public",
		handler: async ({ request, reply }) => {
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
		},
	});

	/**
	 * Альтернативный алиас для push синхронизации (/api/sync/push).
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/push",
		permission: "public",
		handler: async ({ request, reply }) => {
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
		},
	});

	/**
	 * Получение серверных изменений для догоняющей синхронизации офлайн-клиента (Pull).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sync/pull",
		permission: "public",
		handler: async ({ request, reply }) => {
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

			const result = await SyncStreamTransport.pullChanges(orgId, parsed.data.since, {
				limit: parsed.data.limit,
				cursor: parsed.data.cursor,
			});
			return reply.code(200).send(result);
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/pull",
		permission: "public",
		handler: async ({ request, reply }) => {
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
			const result = await SyncStreamTransport.pullChanges(orgId, parsed.data.since, {
				limit: parsed.data.limit,
				cursor: parsed.data.cursor,
			});
			return reply.code(200).send(result);
		},
	});

	/**
	 * Административные маршруты управления очередью синхронизации и аудита коллизий.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sync/admin/queue/stats",
		permission: "public",
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.getQueueStats(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sync/admin/dlq",
		permission: "public",
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.getDeadLetterQueue(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/admin/replay",
		permission: "public",
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.replaySyncJob(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sync/admin/vectors",
		permission: "public",
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.getEntityVectorsAudit(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/admin/recover-stale",
		permission: "public",
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.recoverStaleTasks(request, reply),
	});
}

export { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
export { RouteSyncQueueManager } from "./syncQueueManager.js";
export default registerSyncRoutes;
