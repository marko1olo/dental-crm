/**
 * n3EmkRoutes.ts — Fastify routes for N3.Health EMKService operations.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import {
	buildEmkAddDocumentSoapXml,
	buildEmkCloseCaseSoapXml,
	buildEmkSendDocumentSoapXml,
	N3HealthVipnetGateway,
	type EmkAddDocumentPayload,
	type EmkCloseCasePayload,
	type EmkSendDocumentPayload,
} from "@dental/shared";
import { resolveN3HealthConfig } from "./n3Config.js";
import { emkAddDocumentBodySchema, emkCloseCaseBodySchema, emkSendDocumentBodySchema } from "./n3Schemas.js";

export function registerN3EmkRoutes(app: FastifyInstance): void {
	app.post("/api/egisz/n3health/emk/add-document", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health add document"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = emkAddDocumentBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ ok: false, error: "ValidationError", message: "Некорректные параметры документа.", issues: parsed.error.issues });
		}
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) {
			return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });
		}

		const payload: EmkAddDocumentPayload = parsed.data;
		if (parsed.data.dryRun) {
			const xml = buildEmkAddDocumentSoapXml(config, payload);
			return reply.status(200).send({ ok: true, dryRun: true, soapAction: "http://tempuri.org/IEMKService/AddDocument", endpointUrl: config.emkServiceUrl, generatedSoapEnvelopeLength: xml.length, previewSnippet: xml.slice(0, 500) });
		}
		const gateway = new N3HealthVipnetGateway(config);
		const result = await gateway.emkAddDocument(payload);
		return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, idDocumentGlobal: result.idDocumentGlobal, faultString: result.faultString, errorCode: result.errorCode });
	});

	app.post("/api/egisz/n3health/emk/send-document", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health send document"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = emkSendDocumentBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Некорректные параметры SendDocument." });
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });

		const payload: EmkSendDocumentPayload = { idDocumentMis: parsed.data.idDocumentMis, idCaseMis: parsed.data.idCaseMis, targetSystem: parsed.data.targetSystem };
		if (parsed.data.dryRun) {
			const xml = buildEmkSendDocumentSoapXml(config, payload);
			return reply.status(200).send({ ok: true, dryRun: true, soapAction: "http://tempuri.org/IEMKService/SendDocument", previewSnippet: xml.slice(0, 500) });
		}
		const gateway = new N3HealthVipnetGateway(config);
		const result = await gateway.emkSendDocument(payload);
		return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, idDocumentGlobal: result.idDocumentGlobal, faultString: result.faultString });
	});

	app.post("/api/egisz/n3health/emk/close-case", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz n3health close case"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = emkCloseCaseBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ ok: false, error: "ValidationError", message: "Некорректные параметры закрытия случая." });
		const { config } = await resolveN3HealthConfig(orgId);
		if (!config) return reply.status(400).send({ ok: false, error: "N3NotConfigured", message: "Шлюз N3.Health ViPNet не настроен." });

		const payload: EmkCloseCasePayload = { idCaseMis: parsed.data.idCaseMis, closeDate: parsed.data.closeDate, resultCode: parsed.data.resultCode, outcomeCode: parsed.data.outcomeCode };
		if (parsed.data.dryRun) {
			const xml = buildEmkCloseCaseSoapXml(config, payload);
			return reply.status(200).send({ ok: true, dryRun: true, soapAction: "http://tempuri.org/IEMKService/CloseCase", previewSnippet: xml.slice(0, 500) });
		}
		const gateway = new N3HealthVipnetGateway(config);
		const result = await gateway.emkCloseCase(payload);
		return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, faultString: result.faultString });
	});
}
