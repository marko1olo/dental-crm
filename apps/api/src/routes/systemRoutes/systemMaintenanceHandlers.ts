import type { FastifyInstance } from "fastify";
import { requireClinicalReadAccess } from "../../accessGuard.js";
import {
	buildPersistentStateExport,
	getPersistentStateIntegrityReport,
} from "../../persistentState.js";
import { recordPersistenceExportAudit } from "./systemAuditHandlers.js";

export function timestampForDownloadName(value = new Date()): string {
	return value.toISOString().slice(0, 19).replace(/[-:T]/g, "");
}

export function registerSystemMaintenanceRoutes(app: FastifyInstance): void {
	app.get("/api/system/persistence/verify", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(request, reply, "persistence verify"))
		)
			return;
		return await getPersistentStateIntegrityReport();
	});

	app.get("/api/system/persistence/export", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(request, reply, "persistence export"))
		)
			return;
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
	});
}
