/**
 * n3EventLogAndNsiRoutes.ts — Fastify routes for N3.Health EventLog and NSI FHIR services.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { withTenantCtx } from "../../../db/rls.js";
import { egiszOutbox } from "../../../db/schema.js";
import { N3EventLogClient, N3FhirTerminologyClient } from "@dental/shared";
import { resolveN3HealthConfig } from "./n3Config.js";
import { eventLogReexportBodySchema } from "./n3Schemas.js";

const eventLogStatusParamsSchema = z
	.object({
		idDocumentMis: z.string().trim().min(1).max(200),
	})
	.strict();

const nsiCodeSystemQuerySchema = z
	.object({
		oid: z.string().trim().min(1).max(120),
	})
	.strict();

const nsiValueSetQuerySchema = z
	.object({
		url: z.string().trim().min(1).max(500),
		filter: z.string().trim().max(200).optional(),
	})
	.strict();

export function registerN3EventLogAndNsiRoutes(app: FastifyInstance): void {
	app.get(
		"/api/egisz/n3health/eventlog/status/:idDocumentMis",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health eventlog status"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const parsedParams = eventLogStatusParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметр idDocumentMis обязателен." });
			}
			const { idDocumentMis } = parsedParams.data;

			const [doc] = await withTenantCtx(orgId, async (tx) =>
				tx
					.select({ id: egiszOutbox.id })
					.from(egiszOutbox)
					.where(
						and(
							eq(egiszOutbox.organizationId, orgId),
							or(
								sql`${egiszOutbox.documentId}::text = ${idDocumentMis}`,
								sql`${egiszOutbox.id}::text = ${idDocumentMis}`,
								sql`${egiszOutbox.dedupeKey} LIKE ${`${idDocumentMis}%`}`,
								eq(egiszOutbox.remdDocumentId, idDocumentMis),
							),
						),
					)
					.limit(1),
			);

			if (!doc) {
				return reply.status(404).send({ success: false, ok: false, error: "Document not found or access denied" });
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
			const client = new N3EventLogClient(config);
			const statusRecord = await client.getDocumentStatus(idDocumentMis);
			return reply.status(200).send({ ok: true, ...statusRecord });
		},
	);

	app.post(
		"/api/egisz/n3health/eventlog/reexport",
		{
			config: { tenantTxSelfManaged: true },
			schema: { description: "EGISZ N3 event log reexport with mandatory RFC 9562 Idempotency-Key", headers: { type: "object", properties: { "idempotency-key": { type: "string" }, "x-idempotency-key": { type: "string" }, organizationid: { type: "string" }, "x-organization-id": { type: "string" } } } },
		},
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health eventlog reexport"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsed = eventLogReexportBodySchema.safeParse(request.body);
			if (!parsed.success) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметры idDocumentMis и queue обязательны." });

			const [doc] = await withTenantCtx(orgId, async (tx) =>
				tx
					.select({ id: egiszOutbox.id })
					.from(egiszOutbox)
					.where(
						and(
							eq(egiszOutbox.organizationId, orgId),
							or(
								sql`${egiszOutbox.documentId}::text = ${parsed.data.idDocumentMis}`,
								sql`${egiszOutbox.id}::text = ${parsed.data.idDocumentMis}`,
								sql`${egiszOutbox.dedupeKey} LIKE ${`${parsed.data.idDocumentMis}%`}`,
								eq(egiszOutbox.remdDocumentId, parsed.data.idDocumentMis),
							),
						),
					)
					.limit(1),
			);

			if (!doc) {
				return reply.status(404).send({ success: false, ok: false, error: "Document not found or access denied" });
			}

			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
			const client = new N3EventLogClient(config);
			const result = await client.queueForReexport(parsed.data.idDocumentMis, parsed.data.queue);
			return reply.status(result.success ? 200 : 502).send({ ok: result.success, message: result.message });
		},
	);

	app.get(
		"/api/egisz/n3health/eventlog/queues",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health eventlog queues"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
			const client = new N3EventLogClient(config);
			const stats = await client.getQueueStats();
			return reply.status(200).send({ ok: true, stats });
		},
	);

	app.get(
		"/api/egisz/n3health/nsi/codesystem",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health nsi fhir"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const parsedQuery = nsiCodeSystemQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметр oid обязателен." });
			}
			const { oid } = parsedQuery.data;
			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
			const fhir = new N3FhirTerminologyClient(config);
			const data = await fhir.getCodeSystem(oid);
			if (!data) return reply.status(404).send({ ok: false, error: "NotFound", message: `Справочник НСИ с OID ${oid} не найден.` });
			return reply.status(200).send({ ok: true, data });
		},
	);

	app.get(
		"/api/egisz/n3health/nsi/valueset",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (!(await requireClinicalReadAccess(request, reply, "egisz n3health nsi valueset"))) return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;
			const parsedQuery = nsiValueSetQuerySchema.safeParse(request.query ?? {});
			if (!parsedQuery.success) {
				return reply.status(400).send({ ok: false, error: "ValidationError", message: "Параметр url обязателен." });
			}
			const { url, filter } = parsedQuery.data;
			const { config } = await resolveN3HealthConfig(orgId);
			if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
			const fhir = new N3FhirTerminologyClient(config);
			const data = await fhir.expandValueSet(url, filter);
			if (!data) return reply.status(404).send({ ok: false, error: "NotFound", message: `Набор значений (ValueSet) ${url} не найден.` });
			return reply.status(200).send({ ok: true, data });
		},
	);
}
