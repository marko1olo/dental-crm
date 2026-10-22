/**
 * n3PixRoutes.ts — Fastify routes for N3.Health PixService operations.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import {
	buildPixAddPatientSoapXml,
	buildPixFindPatientsSoapXml,
	N3HealthVipnetGateway,
	type PixFindPatientsCriteria,
	type PixPatientPayload,
} from "@dental/shared";
import { resolveN3HealthConfig } from "./n3Config.js";
import { pixFindPatientsBodySchema, pixPatientBodySchema } from "./n3Schemas.js";

export function registerN3PixRoutes(app: FastifyInstance): void {
	app.post("/api/egisz/n3health/pix/add-patient", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health add pix patient"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = pixPatientBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ ok: false, error: "ValidationError", message: "Некорректные данные пациента.", issues: parsed.error.issues });
		}
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });

		const payload: PixPatientPayload = parsed.data;
		if (parsed.data.dryRun) {
			const xml = buildPixAddPatientSoapXml(config, payload);
			return reply.status(200).send({ ok: true, dryRun: true, soapAction: "http://tempuri.org/IPixService/AddPatient", previewSnippet: xml.slice(0, 500) });
		}

		const gateway = new N3HealthVipnetGateway(config);
		const result = await gateway.pixAddPatient(payload);
		return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, idPatientGlobal: result.idPatientGlobal, faultString: result.faultString });
	});

	app.post("/api/egisz/n3health/pix/find-patients", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz n3health find pix patients"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = pixFindPatientsBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Некорректные критерии поиска пациента." });
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });

		const criteria: PixFindPatientsCriteria = parsed.data;
		if (parsed.data.dryRun) {
			const xml = buildPixFindPatientsSoapXml(config, criteria);
			return reply.status(200).send({ ok: true, dryRun: true, soapAction: "http://tempuri.org/IPixService/FindPatients", previewSnippet: xml.slice(0, 500) });
		}

		const gateway = new N3HealthVipnetGateway(config);
		const result = await gateway.pixFindPatients(criteria);
		return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, faultString: result.faultString });
	});
}
