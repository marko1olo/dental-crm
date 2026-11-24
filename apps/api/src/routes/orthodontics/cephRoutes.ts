/**
 * apps/api/src/routes/orthodontics/cephRoutes.ts
 *
 * Fastify эндпоинты цефалометрического анализа ТРГ (Мандаты 8b, 8e, 8z).
 * Реальная персистентность 16 ориентиров и угловых расчетов ТРГ в PostgreSQL 18
 * через JSONB профиль пациента `patients.administrative_profile`.
 */

import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { computePayloadHash } from "@dental/shared";
import { db } from "../../db/client.js";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { idempotencyKeys } from "../../db/schema/idempotency.js";
import { imagingStudies } from "../../db/schema/imaging.js";
import { extractIdempotencyKey, isValidUuid } from "../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import { isLockStale, queryDatabaseIdempotencyRecord } from "../../plugins/idempotencyModules/idempotencyStorageEngine.js";
import { requireOrganizationId } from "../../security/identity.js";
import { cephAnalysisSaveSchema, patientParamsSchema } from "./types.js";

export function registerCephRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	/**
	 * POST /api/orthodontics/:patientId/ceph-analysis
	 * Фиксация цефалометрического исследования ТРГ в карте пациента (PostgreSQL 18).
	 */
	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/ceph-analysis`,
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const idempotencyKey = extractIdempotencyKey(request);
			if (idempotencyKey && !isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7)",
				});
			}

			if (idempotencyKey) {
				reply.header("Idempotency-Key", idempotencyKey);
				const { existingIdemKey, existingSyncRecord } = await queryDatabaseIdempotencyRecord(orgId, idempotencyKey);
				const record = existingIdemKey ?? (existingSyncRecord ? {
					status: existingSyncRecord.action === "completed" ? "completed" : "in_flight",
					responseBody: existingSyncRecord.responseJson,
					responseCode: existingSyncRecord.responseStatus,
					lockedAt: existingSyncRecord.updatedAt,
				} : null);

				if (record) {
					if (record.status === "completed" && record.responseBody) {
						reply.header("idempotency-replayed", "true");
						reply.header("x-idempotency-replayed", "true");
						return reply
							.code(record.responseCode || 200)
							.send(record.responseBody);
					}
					if (record.status === "in_flight" && !isLockStale(record.lockedAt)) {
						return reply.code(409).header("Retry-After", "1").send({
							error: "Conflict",
							message: "Операция сохранения ТРГ с данным Idempotency-Key уже выполняется.",
						});
					}
				}
			}

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = cephAnalysisSaveSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			// DEF-ORTHO-SEV1-03: Проверка принадлежности снимка ТРГ организации и пациенту
			if (body.imagingStudyId) {
				const [study] = await db
					.select()
					.from(imagingStudies)
					.where(
						and(
							eq(imagingStudies.id, body.imagingStudyId),
							eq(imagingStudies.organizationId, orgId),
							eq(imagingStudies.patientId, patientId),
						),
					)
					.limit(1);

				if (!study) {
					return reply.code(404).send({
						error: "ImagingStudyNotFound",
						message: "Рентгенологическое исследование ТРГ не найдено в профиле пациента или принадлежит другой организации",
					});
				}
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const nowIso = new Date().toISOString();
			const studyId = body.id || `ceph-${Date.now()}`;

			const studyRecord = {
				id: studyId,
				organizationId: orgId,
				patientId,
				imagingStudyId: body.imagingStudyId ?? null,
				patientName: body.patientName || patient.fullName,
				imageUrl: body.imageUrl ?? null,
				landmarks: body.landmarks ?? {},
				scaleMmPerPixel: body.scaleMmPerPixel ?? 0.15,
				analysis: body.analysis ?? {},
				source: body.source ?? "manual",
				backendUsed: body.backendUsed ?? "Цефалометрический модуль",
				isCalibratedFallback: Boolean(body.isCalibratedFallback),
				placedCount: body.placedCount ?? Object.keys(body.landmarks ?? {}).length,
				latencyMs: body.latencyMs ?? 0,
				savedAt: nowIso,
			};

			const currentOrtho = (adminProfile.orthodonticProgress as Record<string, unknown>) ?? {};
			const existingHistory = Array.isArray(currentOrtho.cephHistory) ? currentOrtho.cephHistory : [];
			const history = [...existingHistory, studyRecord];

			const updatedOrtho = {
				...currentOrtho,
				cephAnalysis: studyRecord,
				cephHistory: history.slice(-20),
				lastActionDate: nowIso,
				lastActionSummary: `Цефалометрический анализ ТРГ: ${studyRecord.placedCount} ориентиров`,
			};

			const responsePayload = {
				success: true,
				id: studyId,
				savedAt: nowIso,
				study: studyRecord,
			};

			// DEF-ORTHO-01 / Мандат 8bo: Неделимость транзакции при сохранении анализа ТРГ в PostgreSQL 18
			await db.transaction(async (tx) => {
				await updatePatientAdministrativeProfileInDb(
					orgId,
					patientId,
					{
						...adminProfile,
						orthodonticProgress: updatedOrtho,
					},
					tx,
				);

				// Связка со снимком: фиксация ортодонтического заключения в исследовании
				if (body.imagingStudyId) {
					const summaryText =
						body.analysis?.protocol043Text ||
						body.analysis?.summaryRu ||
						`Цефалометрический анализ ТРГ (${studyRecord.placedCount} точек)`;
					await tx
						.update(imagingStudies)
						.set({
							aiSummary: summaryText,
						})
						.where(
							and(
								eq(imagingStudies.id, body.imagingStudyId),
								eq(imagingStudies.organizationId, orgId),
							),
						);
				}

				if (idempotencyKey) {
					await tx
						.insert(idempotencyKeys)
						.values({
							clinicId: orgId,
							key: idempotencyKey,
							status: "completed",
							payloadHash: computePayloadHash(request.body ?? {}),
							responseBody: responsePayload,
							responseCode: 200,
						})
						.onConflictDoUpdate({
							target: [idempotencyKeys.clinicId, idempotencyKeys.key],
							set: {
								status: "completed",
								responseBody: responsePayload,
								responseCode: 200,
							},
						});
				}
			});

			return reply.send(responsePayload);
		},
	);

	/**
	 * GET /api/orthodontics/:patientId/ceph-analysis
	 * Получение актуального цефалометрического анализа ТРГ из PostgreSQL 18.
	 */
	app.get<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/ceph-analysis`,
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const orthoProgress = (adminProfile.orthodonticProgress as Record<string, unknown>) ?? {};
			const study = (orthoProgress.cephAnalysis as Record<string, unknown>) ?? (adminProfile.cephAnalysis as Record<string, unknown>) ?? null;

			return reply.send({
				success: true,
				study,
			});
		},
	);
}
