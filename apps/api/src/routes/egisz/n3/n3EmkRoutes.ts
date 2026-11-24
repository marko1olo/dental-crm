/**
 * n3EmkRoutes.ts — Fastify routes for N3.Health EMKService operations.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, or, sql } from "drizzle-orm";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { withTenantCtx } from "../../../db/rls.js";
import { egiszOutbox, patients, visits } from "../../../db/schema.js";
import { appendEgiszAuditLog } from "../../../services/egisz/EgiszAuditService.js";
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
	app.post(
		"/api/egisz/n3health/emk/add-document",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
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

			// IDOR / Tenant Guard: проверка принадлежности пациента текущей клинике при боевой регистрации
			const [patient] = await withTenantCtx(orgId, async (tx) =>
				tx
					.select({ id: patients.id })
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, orgId),
							sql`${patients.id}::text = ${parsed.data.patient.idPatientMis}`,
						),
					)
					.limit(1),
			);

			if (!patient) {
				return reply.status(404).send({
					ok: false,
					success: false,
					error: "PatientNotFound",
					message: "Пациент не найден или не принадлежит текущей организации.",
				});
			}

			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.emkAddDocument(payload);
			return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, idDocumentGlobal: result.idDocumentGlobal, faultString: result.faultString, errorCode: result.errorCode });
		},
	);

	app.post(
		"/api/egisz/n3health/emk/send-document",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
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

			// IDOR / Outbox Guard: проверка владения документом через egiszOutbox при боевой отправке
			const [existingDoc] = await withTenantCtx(orgId, async (tx) =>
				tx
					.select({
						id: egiszOutbox.id,
						patientId: egiszOutbox.patientId,
					})
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

			if (!existingDoc) {
				return reply.status(404).send({
					ok: false,
					success: false,
					error: "Document not found or access denied",
					message: "Документ не найден или не принадлежит текущей организации.",
				});
			}
			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.emkSendDocument(payload);

			// Единая Дверь: фиксация исходящей отправки документа в криптографическом аудит-логе
			await withTenantCtx(orgId, async (tx) =>
				appendEgiszAuditLog(tx, {
					organizationId: orgId,
					eventType: "N3_EMK_DOCUMENT_SENT",
					entityType: "egisz_outbox",
					entityId: existingDoc.id,
					patientId: existingDoc.patientId,
					actorUserId: (request.user as { id?: string } | undefined)?.id ?? null,
					payload: {
						idDocumentMis: parsed.data.idDocumentMis,
						idCaseMis: parsed.data.idCaseMis,
						targetSystem: parsed.data.targetSystem,
						success: result.success,
						idDocumentGlobal: result.idDocumentGlobal,
						httpStatusCode: result.httpStatusCode,
					},
				}),
			);

			return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, idDocumentGlobal: result.idDocumentGlobal, faultString: result.faultString });
		},
	);

	app.post(
		"/api/egisz/n3health/emk/close-case",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
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

			// IDOR / Tenant Guard: проверка принадлежности idCaseMis (визита или случая из outbox) текущей организации
			const ownedCase = await withTenantCtx(orgId, async (tx) => {
				const [visitRow] = await tx
					.select({ id: visits.id, patientId: visits.patientId })
					.from(visits)
					.where(
						and(
							eq(visits.organizationId, orgId),
							sql`${visits.id}::text = ${parsed.data.idCaseMis}`,
						),
					)
					.limit(1);
				if (visitRow) {
					return { entityId: visitRow.id, patientId: visitRow.patientId };
				}

				const [outboxRow] = await tx
					.select({ id: egiszOutbox.id, patientId: egiszOutbox.patientId })
					.from(egiszOutbox)
					.where(
						and(
							eq(egiszOutbox.organizationId, orgId),
							or(
								sql`${egiszOutbox.visitId}::text = ${parsed.data.idCaseMis}`,
								sql`${egiszOutbox.id}::text = ${parsed.data.idCaseMis}`,
							),
						),
					)
					.limit(1);
				if (outboxRow) {
					return { entityId: outboxRow.id, patientId: outboxRow.patientId };
				}
				return null;
			});

			if (!ownedCase) {
				return reply.status(404).send({
					ok: false,
					success: false,
					error: "CaseNotFound",
					message: "Случай лечения не найден или не принадлежит текущей организации.",
				});
			}

			const gateway = new N3HealthVipnetGateway(config);
			const result = await gateway.emkCloseCase(payload);

			await withTenantCtx(orgId, async (tx) =>
				appendEgiszAuditLog(tx, {
					organizationId: orgId,
					eventType: "N3_EMK_CASE_CLOSED",
					entityType: "visit",
					entityId: ownedCase.entityId,
					patientId: ownedCase.patientId,
					actorUserId: (request.user as { id?: string } | undefined)?.id ?? null,
					payload: {
						idCaseMis: parsed.data.idCaseMis,
						closeDate: parsed.data.closeDate,
						success: result.success,
						httpStatusCode: result.httpStatusCode,
					},
				}),
			);

			return reply.status(result.success ? 200 : 502).send({ ok: result.success, httpStatusCode: result.httpStatusCode, faultString: result.faultString });
		},
	);
}
