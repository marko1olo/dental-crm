/**
 * n3EventLogAndNsiRoutes.ts — Fastify routes for N3.Health EventLog and NSI FHIR services.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { N3EventLogClient, N3FhirTerminologyClient } from "@dental/shared";
import { resolveN3HealthConfig } from "./n3Config.js";
import { eventLogReexportBodySchema } from "./n3Schemas.js";

export function registerN3EventLogAndNsiRoutes(app: FastifyInstance): void {
	app.get("/api/egisz/n3health/eventlog/status/:idDocumentMis", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz n3health eventlog status"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { idDocumentMis } = request.params as { idDocumentMis: string };
		if (!idDocumentMis) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметр idDocumentMis обязателен." });

		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
		const client = new N3EventLogClient(config);
		const statusRecord = await client.getDocumentStatus(idDocumentMis);
		return reply.status(200).send({ ok: true, ...statusRecord });
	});

	app.post("/api/egisz/n3health/eventlog/reexport", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health eventlog reexport"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = eventLogReexportBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметры idDocumentMis и queue обязательны." });
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
		const client = new N3EventLogClient(config);
		const result = await client.queueForReexport(parsed.data.idDocumentMis, parsed.data.queue);
		return reply.status(result.success ? 200 : 502).send({ ok: result.success, message: result.message });
	});

	app.get("/api/egisz/n3health/eventlog/queues", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz n3health eventlog queues"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
		const client = new N3EventLogClient(config);
		const stats = await client.getQueueStats();
		return reply.status(200).send({ ok: true, stats });
	});

	app.get("/api/egisz/n3health/nsi/codesystem", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz n3health nsi fhir"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { oid } = request.query as { oid?: string };
		if (!oid) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметр oid обязателен." });
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
		const fhir = new N3FhirTerminologyClient(config);
		const data = await fhir.getCodeSystem(oid);
		if (!data) return reply.status(404).send({ ok: false, error: "NotFound", message: `Справочник НСИ с OID ${oid} не найден.` });
		return reply.status(200).send({ ok: true, data });
	});

	app.get("/api/egisz/n3health/nsi/valueset", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz n3health nsi valueset"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { url, filter } = request.query as { url?: string; filter?: string };
		if (!url) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметр url обязателен." });
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
		const fhir = new N3FhirTerminologyClient(config);
		const data = await fhir.expandValueSet(url, filter);
		if (!data) return reply.status(404).send({ ok: false, error: "NotFound", message: `Набор значений (ValueSet) ${url} не найден.` });
		return reply.status(200).send({ ok: true, data });
	});
}
