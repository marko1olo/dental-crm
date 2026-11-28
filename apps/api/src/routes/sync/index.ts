import {
	syncPushBatchRequestSchema,
} from "@dental/shared";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../../core/routeFactories.js";
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

const SYNC_AUTH_OPTIONS = {
	allowAdminSecretBypass: true,
	allowClinicTokenWithoutStaff: true,
} as const;

const SYNC_WRITE_PERMISSION = {
	anyOf: ["clinical.write" as const, "schedule.write" as const, "patients.write" as const],
};

const SYNC_READ_PERMISSION = {
	anyOf: ["clinical.read" as const, "schedule.read" as const, "patients.read" as const],
};

export async function registerSyncRoutes(app: FastifyInstance) {
	/**
	 * Главный шлюз синхронизации офлайн-очереди (Push Batch).
	 * Принимает пачку изменений с клиентскими Idempotency-Key и векторами мутаций.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/gateway",
		permission: SYNC_WRITE_PERMISSION,
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ principal, organizationId, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "AuthRequired" });
			}

			const parsed = syncPushBatchRequestSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "SyncBatchValidationError",
					message:
						"Пакет синхронизации не прошел проверку: проверьте структуру очередей, idempotencyKey и payloadHash.",
					issues: parsed.error.issues,
				});
			}

			const result = await SyncGatewayService.processPushBatch(
				organizationId,
				parsed.data,
				principal?.userId || undefined,
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
		permission: SYNC_WRITE_PERMISSION,
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ principal, organizationId, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "AuthRequired" });
			}

			const parsed = syncPushBatchRequestSchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "SyncBatchValidationError",
					message:
						"Пакет синхронизации не прошел проверку: проверьте структуру очередей, idempotencyKey и payloadHash.",
					issues: parsed.error.issues,
				});
			}

			const result = await SyncGatewayService.processPushBatch(
				organizationId,
				parsed.data,
				principal?.userId || undefined,
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
		permission: SYNC_READ_PERMISSION,
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ organizationId, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "AuthRequired" });
			}

			const parsed = syncPullQuerySchema.safeParse(request.query ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса синхронизации.",
					issues: parsed.error.issues,
				});
			}

			const result = await SyncStreamTransport.pullChanges(organizationId, parsed.data.since, {
				limit: parsed.data.limit,
				cursor: parsed.data.cursor,
			});
			return reply.code(200).send(result);
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/pull",
		permission: SYNC_READ_PERMISSION,
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ organizationId, request, reply }) => {
			if (!organizationId) {
				return reply.code(401).send({ error: "AuthRequired" });
			}

			const parsed = syncPullQuerySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректное тело запроса синхронизации.",
					issues: parsed.error.issues,
				});
			}
			const result = await SyncStreamTransport.pullChanges(organizationId, parsed.data.since, {
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
		permission: "settings.read",
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.getQueueStats(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sync/admin/dlq",
		permission: "settings.read",
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.getDeadLetterQueue(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/admin/replay",
		permission: "settings.write",
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.replaySyncJob(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/sync/admin/vectors",
		permission: "settings.read",
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.getEntityVectorsAudit(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/admin/recover-stale",
		permission: "settings.write",
		authOptions: SYNC_AUTH_OPTIONS,
		handler: async ({ request, reply }) => SyncAdministrativeHandlers.recoverStaleTasks(request, reply),
	});
}

export { SyncAdministrativeHandlers } from "./syncAdministrativeHandlers.js";
export { RouteSyncQueueManager } from "./syncQueueManager.js";
export default registerSyncRoutes;
