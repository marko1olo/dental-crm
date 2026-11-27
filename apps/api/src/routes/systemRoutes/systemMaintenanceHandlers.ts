import type { FastifyInstance } from "fastify";
import { requireSuperadmin } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import {
	buildPersistentStateExport,
	getPersistentStateIntegrityReport,
} from "../../persistentState.js";
import { recordPersistenceExportAudit } from "./systemAuditHandlers.js";

export function timestampForDownloadName(value = new Date()): string {
	return value.toISOString().slice(0, 19).replace(/[-:T]/g, "");
}

export function registerSystemMaintenanceRoutes(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/system/persistence/verify",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (
				!(await requireSuperadmin(request, reply, "persistence verify"))
			) {
				return;
			}
			return await getPersistentStateIntegrityReport();
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/system/persistence/export",
		permission: "public",
		handler: async ({ request, reply }) => {
			if (
				!(await requireSuperadmin(request, reply, "persistence export"))
			) {
				return;
			}
			await recordPersistenceExportAudit(request);
			const snapshot = await buildPersistentStateExport();
			if (!snapshot.payload) {
				return reply.code(404).send({
					error: "PersistenceExportUnavailable",
					message:
						"Файл состояния не читается. Сначала запустите проверку резервных копий в настройках.",
					integrity: snapshot.integrity,
				});
			}

			return reply
				.type("application/json; charset=utf-8")
				.header(
					"Content-Disposition",
					`attachment; filename="dental-crm-state-${timestampForDownloadName()}.json"`,
				)
				.send(snapshot);
		},
	});
}
