/**
 * n3HealthRoutes.ts — N3.Health ViPNet EGISZ Fastify Routes.
 * Mandate 8b compliant (<= 120 lines). Decomposed into ./n3/
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { requireOrganizationId } from "../../security/identity.js";
import { n3HealthVipnetConfigSchema } from "@dental/shared";
import { maskSecretToken, n3ConfigUpdateBodySchema, resolveN3HealthConfig } from "./n3/n3Config.js";
import { registerN3EmkRoutes } from "./n3/n3EmkRoutes.js";
import { registerN3PixRoutes } from "./n3/n3PixRoutes.js";
import { registerN3EventLogAndNsiRoutes } from "./n3/n3EventLogAndNsiRoutes.js";

export { n3ConfigUpdateBodySchema, resolveN3HealthConfig } from "./n3/n3Config.js";

export async function registerN3HealthRoutes(app: FastifyInstance) {
	app.get("/api/egisz/n3health/status", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz n3health status"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const { config, source } = await resolveN3HealthConfig(orgId);
		if (!config) {
			return reply.status(200).send({
				ok: true, configured: false, source, isVipnetChannelActive: false, clinicOid: null,
				idLpu: null, authGuidMasked: null, eventLogTokenMasked: null,
				emkServiceUrl: "http://b2b.n3health.ru/emk/EMKService.svc", pixServiceUrl: "http://b2b.n3health.ru/emk/PixService.svc",
				nsiFhirUrl: "http://b2b.n3health.ru/nsi/fhir/term/", eventLogApiUrl: "https://api.n3health.ru/eventlog/",
				message: "Интеграция N3.Health ViPNet не настроена. Укажите GUID и idLPU в настройках или .env.",
			});
		}

		return reply.status(200).send({
			ok: true, configured: true, source, isVipnetChannelActive: config.isVipnetChannelActive,
			clinicOid: config.clinicOid, idLpu: config.idLpu, authGuidMasked: maskSecretToken(config.authGuid),
			eventLogTokenMasked: maskSecretToken(config.eventLogToken), emkServiceUrl: config.emkServiceUrl,
			pixServiceUrl: config.pixServiceUrl, nsiFhirUrl: config.nsiFhirUrl, eventLogApiUrl: config.eventLogApiUrl, timeoutMs: config.timeoutMs,
		});
	});

	app.post("/api/egisz/n3health/config", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health config update"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = n3ConfigUpdateBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ ok: false, error: "ValidationError", message: "Некорректный формат параметров конфигурации N3.Health.", issues: parsed.error.issues });
		}

		const orgRows = await db.select({ flags: schema.organizations.workspaceFeatureFlags }).from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
		const existingFlags = (orgRows[0]?.flags ?? {}) as Record<string, unknown>;
		const existingN3 = (existingFlags.n3HealthVipnetConfig ?? {}) as Record<string, unknown>;
		const mergedN3Config = { ...existingN3, ...parsed.data };
		const validation = n3HealthVipnetConfigSchema.safeParse(mergedN3Config);
		if (!validation.success) {
			return reply.status(400).send({ ok: false, error: "InvalidConfig", message: "Неполная конфигурация: требуются authGuid, idLpu, clinicOid и eventLogToken.", issues: validation.error.issues });
		}

		const updatedFlags = { ...existingFlags, n3HealthVipnetConfig: validation.data };
		await db.update(schema.organizations).set({ workspaceFeatureFlags: updatedFlags, updatedAt: new Date() }).where(eq(schema.organizations.id, orgId));
		return reply.status(200).send({ ok: true, configured: true, message: "Параметры интеграции N3.Health ViPNet успешно сохранены.", clinicOid: validation.data.clinicOid, idLpu: validation.data.idLpu });
	});

	registerN3EmkRoutes(app);
	registerN3PixRoutes(app);
	registerN3EventLogAndNsiRoutes(app);
}
