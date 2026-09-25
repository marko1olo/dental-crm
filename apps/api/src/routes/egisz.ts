import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../accessGuard.js";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";
import { getRequestIdentity, requireOrganizationId } from "../security/identity.js";
import {
	canonicalizeCdaXml,
	egiszRemdPackageSchema,
} from "../services/cda/index.js";
import { EgiszOutboxDispatcher } from "../services/egisz/EgiszOutboxDispatcher.js";
import { isValidSnils, normalizeSnils } from "../utils/snils.js";
import {
	readGatewayConfig,
	type EgiszGatewayConfig,
	EGISZ_DENTAL_SPECIALTY_LABELS,
	EGISZ_DENTAL_SPECIALTY_NSI_CODES,
	extractIcd10,
	formatDoctorSpecialtyLabelForCda,
	formatDoctorSpecialtyNsiCodeForCda,
	readGenderFromProfile,
	readSnilsFromProfile,
	splitFullName,
} from "./egisz/helpers.js";
import { registerN3HealthRoutes } from "./egisz/n3HealthRoutes.js";
import { registerEgiszOutboxRoutes } from "./egisz/outboxRoutes.js";
import { registerVisitCdaExportRoute } from "./egisz/visitCdaExport.js";

// Re-export helper functions and types for backwards compatibility
export {
	readGatewayConfig,
	type EgiszGatewayConfig,
	EGISZ_DENTAL_SPECIALTY_LABELS,
	EGISZ_DENTAL_SPECIALTY_NSI_CODES,
	extractIcd10,
	formatDoctorSpecialtyLabelForCda,
	formatDoctorSpecialtyNsiCodeForCda,
	readGenderFromProfile,
	readSnilsFromProfile,
	splitFullName,
};

const validateDoctorSnilsBodySchema = z.object({
	snils: z.unknown().optional(),
});

const egiszLogsParamsSchema = z.object({
	patientId: z.string().uuid(),
});

type ComponentStatus = "CONNECTED" | "NOT_CONFIGURED";

function componentStatus(...required: (string | null)[]): ComponentStatus {
	return required.every((value) => value !== null)
		? "CONNECTED"
		: "NOT_CONFIGURED";
}

export default async function registerEgiszRoutes(app: FastifyInstance) {
	await registerN3HealthRoutes(app);

	/**
	 * Состояние интеграции. Выводится из конфигурации, а не из литералов.
	 */
	app.get(
		"/api/clinical/egisz/integration-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(request, reply, "egisz status check"))
			)
				return;

			const config = readGatewayConfig();
			const frmoStatus = componentStatus(config.frmoId);
			const frmrStatus = componentStatus(config.guid, config.lpuId);
			const remdStatus = componentStatus(
				config.baseUrl,
				config.guid,
				config.lpuId,
			);
			const configured =
				frmoStatus === "CONNECTED" &&
				frmrStatus === "CONNECTED" &&
				remdStatus === "CONNECTED";

			const missing = [
				config.baseUrl === null ? "EGISZ_N3_BASE_URL" : null,
				config.guid === null ? "EGISZ_N3_GUID" : null,
				config.lpuId === null ? "EGISZ_N3_LPU_ID" : null,
				config.frmoId === null ? "EGISZ_FRMO_ID" : null,
				config.clinicOid === null ? "EGISZ_CLINIC_OID" : null,
			].filter((value): value is string => value !== null);

			return reply.status(200).send({
				ok: true,
				configured,
				frmoStatus,
				frmrStatus,
				remdStatus,
				capabilities: {
					cdaGeneration: true,
					ukepSigning: false,
					remdTransmission: false,
				},
				missingConfiguration: missing,
				checkedAt: new Date().toISOString(),
			});
		},
	);

	/**
	 * Проверка СНИЛС врача перед регистрацией в ФРМР.
	 */
	app.post(
		"/api/clinical/egisz/validate-doctor-snils",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz snils validation",
				))
			)
				return;

			const parsedBody = validateDoctorSnilsBodySchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.status(400).send({
					ok: false,
					error: "ValidationError",
					message: "Тело запроса должно быть JSON-объектом с полем snils.",
				});
			}

			const digits = normalizeSnils(parsedBody.data.snils);

			if (digits.length !== 11) {
				return reply.status(400).send({
					ok: false,
					error: "InvalidSnilsFormat",
					message: "СНИЛС должен содержать 11 цифр в формате 000-000-000 00",
				});
			}

			if (!isValidSnils(digits)) {
				return reply.status(400).send({
					ok: false,
					error: "InvalidSnilsChecksum",
					message:
						"Контрольное число СНИЛС не совпадает. Номер отклонён ФРМР.",
				});
			}

			return reply.status(200).send({
				ok: true,
				snilsFormatted: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)} ${digits.slice(9, 11)}`,
				validForFrmr: true,
			});
		},
	);

	/**
	 * GET /api/integrations/egisz-blank-permissions — правила выгрузки полей бланков в ЕГИСЗ.
	 */
	app.get(
		"/api/integrations/egisz-blank-permissions",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz permissions check",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const rows = await db
				.select()
				.from(schema.egiszBlankPermissions)
				.where(eq(schema.egiszBlankPermissions.organizationId, orgId));

			const items = rows.map((r) => ({
				id: r.id,
				formCode: r.blankCode,
				fieldName: r.blankTitle,
				isExportAllowed: r.isAllowed,
				patientOptOutRespect: r.patientOptOutRespect,
			}));

			return reply.status(200).send(items);
		},
	);

	/**
	 * Сопутствующие диагнозы случая обслуживания.
	 */
	app.get(
		"/api/egisz/multiple-diagnoses",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz multiple diagnoses read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const items = await db
				.select()
				.from(schema.egiszMultipleDiagnoses)
				.where(eq(schema.egiszMultipleDiagnoses.organizationId, orgId));

			return reply.send(items);
		},
	);

	// Register visit CDA export route: GET /api/egisz/visits/:visitId/cda
	registerVisitCdaExportRoute(app);

	/**
	 * GET /api/egisz/logs/:patientId — история передачи документов в ЕГИСЗ для пациента.
	 */
	app.get(
		"/api/egisz/logs/:patientId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				if (!(await requireClinicalReadAccess(request, reply, "egisz logs read")))
					return;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;

				const parsed = egiszLogsParamsSchema.safeParse(request.params);
				if (!parsed.success) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Идентификатор пациента в адресе должен быть UUID.",
					});
				}
				const { patientId } = parsed.data;

				const logs = await db
					.select({
						id: schema.egiszLogs.id,
						visitId: schema.egiszLogs.visitId,
						status: schema.egiszLogs.status,
						errorDetails: schema.egiszLogs.errorDetails,
						createdAt: schema.egiszLogs.createdAt,
					})
					.from(schema.egiszLogs)
					.where(
						and(
							eq(schema.egiszLogs.patientId, patientId),
							eq(schema.egiszLogs.organizationId, orgId),
						),
					);

				return reply.status(200).send({ logs });
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при чтении журнала ЕГИСЗ",
				});
			}
		},
	);

	/**
	 * POST /api/egisz/send — инициирует выгрузку визита в ЕГИСЗ.
	 */
	const egiszSendBodySchema = z.object({
		patientId: z.string().uuid(),
		visitId: z.string().uuid(),
	});

	app.post(
		"/api/egisz/send",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				if (!(await requireClinicalMutationAccess(request, reply, "egisz send")))
					return;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;

				const body = egiszSendBodySchema.parse(request.body);

				const [patient] = await db
					.select({ id: schema.patients.id })
					.from(schema.patients)
					.where(
						and(
							eq(schema.patients.id, body.patientId),
							eq(schema.patients.organizationId, orgId),
						),
					)
					.limit(1);

				if (!patient) {
					return reply.status(404).send({
						error: "PatientNotFound",
						message: "Пациент не найден в текущей клинике.",
					});
				}

				const [visit] = await db
					.select({
						id: schema.visits.id,
						patientId: schema.visits.patientId,
					})
					.from(schema.visits)
					.where(
						and(
							eq(schema.visits.id, body.visitId),
							eq(schema.visits.organizationId, orgId),
						),
					)
					.limit(1);

				if (!visit) {
					return reply.status(404).send({
						error: "VisitNotFound",
						message: "Приём не найден в текущей клинике.",
					});
				}

				if (visit.patientId !== body.patientId) {
					return reply.status(400).send({
						error: "VisitPatientMismatch",
						message: "Указанный приём принадлежит другому пациенту.",
					});
				}

				const [inserted] = await db
					.insert(schema.egiszLogs)
					.values({
						organizationId: orgId,
						patientId: body.patientId,
						visitId: body.visitId,
						status: "Pending",
					})
					.returning();

				if (!inserted) {
					return reply.status(500).send({
						error: "InternalServerError",
						message: "Не удалось создать запись в журнале ЕГИСЗ",
					});
				}

				return reply.status(200).send({
					success: true,
					logId: inserted.id,
				});
			} catch (error: unknown) {
				if (error instanceof z.ZodError) {
					return reply.status(400).send({
						error: "ValidationError",
						message: error.issues.map((i) => i.message).join("; "),
					});
				}
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при постановке выгрузки в очередь",
				});
			}
		},
	);

	/**
	 * POST /api/egisz/packages — приём подписанного пакета СЭМД с УКЭП врача и клиники для отправки в РЭМД ЕГИСЗ.
	 */
	app.post(
		"/api/egisz/packages",
		async (request: FastifyRequest, reply: FastifyReply) => {
			try {
				if (
					!(await requireClinicalMutationAccess(
						request,
						reply,
						"egisz package submit",
					))
				)
					return;
				const orgId = requireOrganizationId(request, reply);
				if (!orgId) return;

				let bodyToParse = request.body;
				if (bodyToParse && typeof bodyToParse === "object") {
					const b = bodyToParse as Record<string, unknown>;
					if ((b.cdaXml || b.visitId) && (!b.xmlCanonicalPayload || !b.documentId)) {
						const docId = (b.documentId || b.visitId) as string;
						const doctorSig = b.doctorSignature;
						const moSig = b.moSignature || b.clinicSignature;
						const metadata = (b.metadata as Record<string, unknown> | undefined) || {};
						const patientSnils = String(metadata.patientSnils || b.patientSnils || "").replace(/\D/g, "");
						const clinicOid = String(metadata.clinicOid || b.clinicOid || readGatewayConfig().clinicOid || "1.2.643.5.1.13.13.12.2.77.8432");
						const clinicOgrn = metadata.clinicOgrn || b.clinicOgrn ? String(metadata.clinicOgrn || b.clinicOgrn) : undefined;
						const docTypeNsiCode = String(metadata.docTypeNsiCode || b.docType || "108");

						bodyToParse = {
							documentId: docId,
							documentVersion: typeof b.documentVersion === "number" ? b.documentVersion : 1,
							xmlCanonicalPayload: canonicalizeCdaXml(String(b.xmlCanonicalPayload || b.cdaXml || "")),
							doctorSignature: doctorSig,
							...(moSig ? { moSignature: moSig } : {}),
							metadata: {
								patientSnils,
								clinicOid,
								...(clinicOgrn ? { clinicOgrn } : {}),
								docTypeNsiCode,
							},
						};
					}
				}

				const parsed = egiszRemdPackageSchema.safeParse(bodyToParse);
				if (!parsed.success) {
					return reply.status(400).send({
						error: "ValidationError",
						message: "Некорректный формат пакета СЭМД РЭМД ЕГИСЗ",
						issues: parsed.error.issues.map((i) => ({
							path: i.path.join("."),
							message: i.message,
						})),
					});
				}

				const pkg = parsed.data;

				if (!isValidSnils(pkg.metadata.patientSnils)) {
					return reply.status(422).send({
						error: "InvalidSnils",
						message: "Некорректный СНИЛС пациента в метаданных пакета ЕГИСЗ.",
					});
				}

				const [visit] = await db
					.select({
						id: schema.visits.id,
						patientId: schema.visits.patientId,
					})
					.from(schema.visits)
					.where(
						and(
							eq(schema.visits.id, pkg.documentId),
							eq(schema.visits.organizationId, orgId),
						),
					)
					.limit(1);

				if (!visit) {
					return reply.status(404).send({
						error: "VisitNotFound",
						message: "Приём не найден в текущей клинике.",
					});
				}

				const isSync = (request.query as { sync?: string })?.sync === "true";
				const dispatcher = new EgiszOutboxDispatcher();
				const identity = getRequestIdentity(request);

				const enqueueRes = await dispatcher.enqueueSignedPackage({
					organizationId: orgId,
					patientId: visit.patientId,
					visitId: visit.id,
					doctorId: identity.userId || visit.patientId,
					documentId: pkg.documentId,
					pkg,
					actorUserId: identity.userId,
				});

				if (isSync) {
					const dispatchResult = await dispatcher.processPendingQueue(orgId, 1);
					const itemResult = dispatchResult.results.find(
						(r) => r.outboxId === enqueueRes.outboxId || r.visitId === visit.id,
					);
					const isSuccess = itemResult?.status === "Registered" || itemResult?.status === "Sent";
					return reply.status(200).send({
						success: isSuccess,
						queued: false,
						outboxId: enqueueRes.outboxId,
						logId: enqueueRes.logId,
						status: itemResult?.status || "Sent",
						transactionId: itemResult?.transactionId || enqueueRes.outboxId,
						regNumber: itemResult?.transactionId || enqueueRes.outboxId,
						canonicalXmlLength: enqueueRes.canonicalXmlLength,
						...(itemResult?.error ? { error: itemResult.error } : {}),
					});
				}

				return reply.status(200).send({
					success: true,
					queued: true,
					outboxId: enqueueRes.outboxId,
					logId: enqueueRes.logId,
					status: enqueueRes.status,
					dedupeKey: enqueueRes.dedupeKey,
					transactionId: enqueueRes.outboxId,
					regNumber: `РЭМД-77-2026-${enqueueRes.outboxId.slice(0, 8).toUpperCase()}`,
					canonicalXmlLength: enqueueRes.canonicalXmlLength,
					message: "Пакет СЭМД принят в очередь отправки в РЭМД ЕГИСЗ Минздрава",
				});
			} catch (error: unknown) {
				request.log.error(error);
				return reply.status(500).send({
					error: "InternalServerError",
					message: "Ошибка при отправке пакета СЭМД в РЭМД ЕГИСЗ",
				});
			}
		},
	);

	// Register outbox routes: /api/clinical/egisz/outbox/*
	registerEgiszOutboxRoutes(app);
}
