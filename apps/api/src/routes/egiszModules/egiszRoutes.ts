import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { canonicalizeCdaXml, egiszRemdPackageSchema } from "../../services/cda/index.js";
import { readGatewayConfig } from "../egisz/helpers.js";
import { registerN3HealthRoutes } from "../egisz/n3HealthRoutes.js";
import { registerEgiszOutboxRoutes } from "../egisz/outboxRoutes.js";
import { registerVisitCdaExportRoute } from "../egisz/visitCdaExport.js";
import { resolveEgiszIntegrationStatus, verifyDoctorSnilsForFrmr } from "./egiszAuthService.js";
import {
	egiszBlankPermissionsPatchSchema,
	egiszLogsParamsSchema,
	egiszMultipleDiagnosesQuerySchema,
	egiszSendBodySchema,
	validateDoctorSnilsBodySchema,
} from "./egiszTypes.js";
import { dispatchPackageToVimis } from "./egiszVimisSender.js";

function normalizeBlankLabel(code: string, title: string): { formCode: string; fieldName: string } {
	if (code.includes("043") || title.includes("043")) {
		return { formCode: "Медицинская карта стоматологического больного (043/у)", fieldName: "Анамнез, дневник приёма и зубная формула" };
	}
	if (code.includes("101") || title.toLowerCase().includes("консультац")) {
		return { formCode: "Протокол консультации и осмотра", fieldName: "Первичный и повторный осмотр врача-стоматолога" };
	}
	if (code.includes("108") || title.includes("КЛКТ") || title.toLowerCase().includes("исследован")) {
		return { formCode: "Протокол КЛКТ 3D и рентген-снимков", fieldName: "Описание КЛКТ 3D, панорамных и прицельных снимков" };
	}
	if (code.includes("ИДС") || title.toLowerCase().includes("согласие")) {
		return { formCode: "Информированное добровольное согласие (ИДС)", fieldName: "Согласие пациента на стоматологическое вмешательство" };
	}
	if (code.includes("1151156") || title.toLowerCase().includes("налогов") || title.toLowerCase().includes("справка")) {
		return { formCode: "Справка об оплате медицинских услуг для налогового вычета", fieldName: "Данные об оплаченных услугах для оформления вычета" };
	}
	return { formCode: code, fieldName: title };
}

export async function registerEgiszModularRoutes(app: FastifyInstance) {
	await registerN3HealthRoutes(app);

	app.get("/api/clinical/egisz/integration-status", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz status check"))) return;
		return reply.status(200).send(resolveEgiszIntegrationStatus());
	});

	app.post("/api/clinical/egisz/validate-doctor-snils", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz snils validation"))) return;
		const parsed = validateDoctorSnilsBodySchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({ ok: false, error: "ValidationError", message: "Тело запроса должно быть JSON-объектом с полем snils." });
		}
		const res = verifyDoctorSnilsForFrmr(parsed.data.snils);
		if (!res.valid) {
			return reply.status(400).send({ ok: false, error: res.error, message: res.message });
		}
		return reply.status(200).send({ ok: true, snilsFormatted: res.snilsFormatted, validForFrmr: true });
	});

	app.get("/api/integrations/egisz-blank-permissions", async (request: FastifyRequest, reply: FastifyReply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz permissions check"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		let rows = await db.select().from(schema.egiszBlankPermissions).where(eq(schema.egiszBlankPermissions.organizationId, orgId));
		if (rows.length === 0) {
			const [org] = await db.select({ id: schema.organizations.id }).from(schema.organizations).where(eq(schema.organizations.id, orgId)).limit(1);
			if (org) {
				const [doc] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.organizationId, orgId)).limit(1);
				const doctorId = doc?.id ?? orgId;
				const defaults = [
					{ organizationId: orgId, doctorId, blankCode: "Медицинская карта стоматологического больного (043/у)", blankTitle: "Анамнез, дневник приёма и зубная формула", isAllowed: true, patientOptOutRespect: true },
					{ organizationId: orgId, doctorId, blankCode: "Протокол консультации и осмотра", blankTitle: "Первичный и повторный осмотр врача-стоматолога", isAllowed: true, patientOptOutRespect: true },
					{ organizationId: orgId, doctorId, blankCode: "Протокол КЛКТ 3D и рентген-снимков", blankTitle: "Описание КЛКТ 3D, панорамных и прицельных снимков", isAllowed: true, patientOptOutRespect: true },
					{ organizationId: orgId, doctorId, blankCode: "Информированное добровольное согласие (ИДС)", blankTitle: "Согласие пациента на стоматологическое вмешательство", isAllowed: true, patientOptOutRespect: true },
					{ organizationId: orgId, doctorId, blankCode: "Справка об оплате медицинских услуг для налогового вычета", blankTitle: "Данные об оплаченных услугах для оформления вычета", isAllowed: false, patientOptOutRespect: true },
				];
				rows = await db.insert(schema.egiszBlankPermissions).values(defaults).returning();
			}
		}

		return reply.status(200).send(rows.map((r) => {
			const norm = normalizeBlankLabel(r.blankCode, r.blankTitle);
			return { id: r.id, formCode: norm.formCode, fieldName: norm.fieldName, isExportAllowed: r.isAllowed, patientOptOutRespect: r.patientOptOutRespect, requiredStaffRole: "Главврач / Врач / Админ" };
		}));
	});

	app.patch<{ Params: { id: string } }>("/api/integrations/egisz-blank-permissions/:id", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz permissions update"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsed = egiszBlankPermissionsPatchSchema.safeParse(request.body ?? {});
		const body = parsed.success ? parsed.data : {};
		const [existing] = await db.select().from(schema.egiszBlankPermissions).where(and(eq(schema.egiszBlankPermissions.id, request.params.id), eq(schema.egiszBlankPermissions.organizationId, orgId))).limit(1);
		if (!existing) {
			return reply.status(404).send({ error: "PermissionNotFound", message: "Правило выгрузки бланка ЕГИСЗ не найдено в вашей клинике." });
		}

		const [updated] = await db.update(schema.egiszBlankPermissions).set({
			...(typeof body.isExportAllowed === "boolean" && { isAllowed: body.isExportAllowed }),
			...(typeof body.patientOptOutRespect === "boolean" && { patientOptOutRespect: body.patientOptOutRespect }),
		}).where(and(eq(schema.egiszBlankPermissions.id, request.params.id), eq(schema.egiszBlankPermissions.organizationId, orgId))).returning();

		if (!updated) {
			return reply.status(500).send({ error: "UpdateFailed", message: "Не удалось сохранить правило выгрузки бланка в ЕГИСЗ." });
		}
		return reply.status(200).send({ id: updated.id, formCode: updated.blankCode, fieldName: updated.blankTitle, isExportAllowed: updated.isAllowed, patientOptOutRespect: updated.patientOptOutRespect, requiredStaffRole: "Врач-стоматолог / Главный врач" });
	});

	app.get("/api/egisz/multiple-diagnoses", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz multiple diagnoses read"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		const parsedQuery = egiszMultipleDiagnosesQuerySchema.safeParse(request.query);
		if (!parsedQuery.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Параметр patientId обязателен и должен быть валидным UUID.",
			});
		}

		// Запрещаем утечку врачебной тайны: строгая изоляция по organizationId и patientId
		const diagnoses = await db
			.select()
			.from(schema.egiszMultipleDiagnoses)
			.where(
				and(
					eq(schema.egiszMultipleDiagnoses.organizationId, orgId),
					eq(schema.egiszMultipleDiagnoses.patientId, parsedQuery.data.patientId),
				),
			);
		return reply.send(diagnoses);
	});

	registerVisitCdaExportRoute(app);

	app.get("/api/egisz/logs/:patientId", async (request, reply) => {
		if (!(await requireClinicalReadAccess(request, reply, "egisz logs read"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = egiszLogsParamsSchema.safeParse(request.params);
		if (!parsed.success) return reply.status(400).send({ error: "ValidationError", message: "Идентификатор пациента в адресе должен быть UUID." });

		const logs = await db.select({ id: schema.egiszLogs.id, visitId: schema.egiszLogs.visitId, status: schema.egiszLogs.status, errorDetails: schema.egiszLogs.errorDetails, createdAt: schema.egiszLogs.createdAt })
			.from(schema.egiszLogs).where(and(eq(schema.egiszLogs.patientId, parsed.data.patientId), eq(schema.egiszLogs.organizationId, orgId)));
		return reply.status(200).send({ logs });
	});

	app.post("/api/egisz/send", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz send"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const body = egiszSendBodySchema.parse(request.body);

		const [patient] = await db.select({ id: schema.patients.id }).from(schema.patients).where(and(eq(schema.patients.id, body.patientId), eq(schema.patients.organizationId, orgId))).limit(1);
		if (!patient) return reply.status(404).send({ error: "PatientNotFound", message: "Пациент не найден в текущей клинике." });

		const [visit] = await db.select({ id: schema.visits.id, patientId: schema.visits.patientId }).from(schema.visits).where(and(eq(schema.visits.id, body.visitId), eq(schema.visits.organizationId, orgId))).limit(1);
		if (!visit) return reply.status(404).send({ error: "VisitNotFound", message: "Приём не найден в текущей клинике." });
		if (visit.patientId !== body.patientId) return reply.status(400).send({ error: "VisitPatientMismatch", message: "Указанный приём принадлежит другому пациенту." });

		const [inserted] = await db.insert(schema.egiszLogs).values({ organizationId: orgId, patientId: body.patientId, visitId: body.visitId, status: "Pending" }).returning();
		if (!inserted) {
			return reply.status(500).send({ error: "DbInsertError", message: "Не удалось создать запись в журнале ЕГИСЗ." });
		}
		return reply.status(200).send({ success: true, logId: inserted.id });
	});

	app.post("/api/egisz/packages", async (request, reply) => {
		if (!(await requireClinicalMutationAccess(request, reply, "egisz package submit"))) return;
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;

		let bodyToParse = request.body as Record<string, unknown>;
		if (bodyToParse && typeof bodyToParse === "object" && (bodyToParse.cdaXml || bodyToParse.visitId) && (!bodyToParse.xmlCanonicalPayload || !bodyToParse.documentId)) {
			const metadata = (bodyToParse.metadata as Record<string, unknown> | undefined) || {};
			bodyToParse = {
				documentId: (bodyToParse.documentId || bodyToParse.visitId) as string,
				documentVersion: typeof bodyToParse.documentVersion === "number" ? bodyToParse.documentVersion : 1,
				xmlCanonicalPayload: canonicalizeCdaXml(String(bodyToParse.xmlCanonicalPayload || bodyToParse.cdaXml || "")),
				doctorSignature: bodyToParse.doctorSignature,
				...(bodyToParse.moSignature || bodyToParse.clinicSignature ? { moSignature: bodyToParse.moSignature || bodyToParse.clinicSignature } : {}),
				metadata: {
					patientSnils: String(metadata.patientSnils || bodyToParse.patientSnils || "").replace(/\D/g, ""),
					clinicOid: String(metadata.clinicOid || bodyToParse.clinicOid || readGatewayConfig().clinicOid || "1.2.643.5.1.13.13.12.2.77.8432"),
					...(metadata.clinicOgrn || bodyToParse.clinicOgrn ? { clinicOgrn: String(metadata.clinicOgrn || bodyToParse.clinicOgrn) } : {}),
					docTypeNsiCode: String(metadata.docTypeNsiCode || bodyToParse.docType || "108"),
				},
			};
		}

		const parsed = egiszRemdPackageSchema.safeParse(bodyToParse);
		if (!parsed.success) {
			return reply.status(400).send({ error: "ValidationError", message: "Некорректный формат пакета СЭМД РЭМД ЕГИСЗ", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
		}
		const pkg = parsed.data;

		const [visit] = await db.select({ id: schema.visits.id, patientId: schema.visits.patientId }).from(schema.visits).where(and(eq(schema.visits.id, pkg.documentId), eq(schema.visits.organizationId, orgId))).limit(1);
		if (!visit) return reply.status(404).send({ error: "VisitNotFound", message: "Приём не найден в текущей клинике." });

		const isSync = (request.query as { sync?: string })?.sync === "true";
		const identity = getRequestIdentity(request);

		const result = await dispatchPackageToVimis({
			organizationId: orgId,
			patientId: visit.patientId,
			visitId: visit.id,
			doctorId: identity.userId || visit.patientId,
			pkg,
			actorUserId: identity.userId || undefined,
			isSync,
		});

		if (!result.success && result.status === "Rejected") {
			return reply.status(422).send({ error: "InvalidSnils", message: "Некорректный СНИЛС пациента в метаданных пакета ЕГИСЗ.", issues: result.flkErrors });
		}
		return reply.status(200).send(result);
	});

	registerEgiszOutboxRoutes(app);
}
