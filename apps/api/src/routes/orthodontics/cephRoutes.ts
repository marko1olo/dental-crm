/**
 * apps/api/src/routes/orthodontics/cephRoutes.ts
 *
 * Fastify эндпоинты цефалометрического анализа ТРГ (Мандаты 8b, 8e, 8z).
 * Реальная персистентность 16 ориентиров и угловых расчетов ТРГ в PostgreSQL 18
 * через JSONB профиль пациента `patients.administrative_profile`.
 */

import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import { patients } from "../../db/schema.js";
import { imagingStudies } from "../../db/schema/imaging.js";
import { getRequestIdentity, requireOrganizationId } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import { cephAnalysisSaveSchema, patientParamsSchema } from "./types.js";

export function registerCephRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	/**
	 * POST /api/orthodontics/:patientId/ceph-analysis
	 * Фиксация цефалометрического исследования ТРГ в карте пациента (PostgreSQL 18).
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: `${prefix}/:patientId/ceph-analysis`,
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return reply;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.orthodontics.write",
					role: staffRole,
					message: `Отказ в сохранении цефалометрического анализа: ${evalAccess.reason}`,
				});
			}

			const parsedParams = patientParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор пациента",
				});
			}
			const { patientId } = parsedParams.data;

			const parsedBody = cephAnalysisSaveSchema.safeParse(request.body);
			if (!parsedBody.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры цефалометрического анализа: " + parsedBody.error.issues.map((i) => i.message).join("; "),
					issues: parsedBody.error.issues,
				});
			}
			const body = parsedBody.data;

			const txResult = await withTenantWriteCtx(orgId, async (tx) => {
				const [patient] = await tx
					.select({
						id: patients.id,
						fullName: patients.fullName,
						administrativeProfile: patients.administrativeProfile,
					})
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
					.for("update")
					.limit(1);
				if (!patient) {
					return { status: "patient_not_found" as const };
				}

				if (body.imagingStudyId) {
					const [study] = await tx
						.select({ id: imagingStudies.id })
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
						return { status: "study_not_found" as const };
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

				await updatePatientAdministrativeProfileInDb(
					orgId,
					patientId,
					{
						...adminProfile,
						orthodonticProgress: updatedOrtho,
					},
					tx,
				);

				if (body.imagingStudyId) {
					const diagnosisObj = body.analysis?.diagnosis as Record<string, unknown> | undefined;
					const summaryText =
						body.analysis?.clinicalProtocolText ||
						(typeof diagnosisObj?.clinicalProtocolText === "string" ? diagnosisObj.clinicalProtocolText : undefined) ||
						body.analysis?.protocol043Text ||
						(typeof diagnosisObj?.protocol043Text === "string" ? diagnosisObj.protocol043Text : undefined) ||
						body.analysis?.summaryRu ||
						(typeof diagnosisObj?.summaryRu === "string" ? diagnosisObj.summaryRu : undefined) ||
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

				return {
					status: "ok" as const,
					payload: {
						success: true,
						id: studyId,
						savedAt: nowIso,
						study: studyRecord,
					},
				};
			});

			if (txResult.status === "patient_not_found") {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}
			if (txResult.status === "study_not_found") {
				return reply.code(404).send({
					error: "ImagingStudyNotFound",
					message: "Рентгенологическое исследование ТРГ не найдено в профиле пациента или принадлежит другой организации",
				});
			}

			return reply.send(txResult.payload);
		},
	});

	/**
	 * GET /api/orthodontics/:patientId/ceph-analysis
	 * Получение актуального цефалометрического анализа ТРГ из PostgreSQL 18.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: `${prefix}/:patientId/ceph-analysis`,
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return reply;

			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);
			if (!evalAccess.hasClinicalAccess) {
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "clinical.orthodontics.read",
					role: staffRole,
					message: `Отказ в просмотре цефалометрического анализа: ${evalAccess.reason}`,
				});
			}

			const parsedParams = patientParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный идентификатор пациента",
				});
			}
			const { patientId } = parsedParams.data;

			const patient = await withTenantReadCtx(orgId, async (tx) => {
				const [row] = await tx
					.select({
						id: patients.id,
						administrativeProfile: patients.administrativeProfile,
					})
					.from(patients)
					.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
					.limit(1);
				return row ?? null;
			});
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
	});
}
