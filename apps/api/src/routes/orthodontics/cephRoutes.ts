/**
 * apps/api/src/routes/orthodontics/cephRoutes.ts
 *
 * Fastify эндпоинты цефалометрического анализа ТРГ (Мандаты 8b, 8e, 8z).
 * Реальная персистентность 16 ориентиров и угловых расчетов ТРГ в PostgreSQL 18
 * через JSONB профиль пациента `patients.administrative_profile`.
 */

import type { FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { defineTenantMutation, defineTenantQuery } from "../../core/routeFactories.js";
import { updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { patients } from "../../db/schema.js";
import { imagingStudies } from "../../db/schema/imaging.js";
import { cephAnalysisSaveSchema, patientParamsSchema } from "./types.js";

export function registerCephRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	/**
	 * POST /api/orthodontics/:patientId/ceph-analysis
	 * Фиксация цефалометрического исследования ТРГ в карте пациента (PostgreSQL 18).
	 */
	defineTenantMutation(app, {
		method: "POST",
		path: `${prefix}/:patientId/ceph-analysis`,
		permission: "clinical.write",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		idempotency: "optional_header",
		paramsSchema: patientParamsSchema,
		bodySchema: cephAnalysisSaveSchema,
		validationErrorMessage: "Некорректные параметры цефалометрического анализа",
		execute: async ({ tx, organizationId: orgId, params: { patientId }, body, reply }) => {
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
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
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
				success: true,
				id: studyId,
				savedAt: nowIso,
				study: studyRecord,
			};
		},
	});

	/**
	 * GET /api/orthodontics/:patientId/ceph-analysis
	 * Получение актуального цефалометрического анализа ТРГ из PostgreSQL 18.
	 */
	defineTenantQuery(app, {
		method: "GET",
		path: `${prefix}/:patientId/ceph-analysis`,
		permission: "clinical.read",
		authOptions: {
			allowClinicTokenWithoutStaff: true,
			allowAdminSecretBypass: true,
		},
		paramsSchema: patientParamsSchema,
		validationErrorMessage: "Некорректный идентификатор пациента",
		query: async ({ tx, organizationId: orgId, params: { patientId }, reply }) => {
			const [patient] = await tx
				.select({
					id: patients.id,
					administrativeProfile: patients.administrativeProfile,
				})
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const orthoProgress = (adminProfile.orthodonticProgress as Record<string, unknown>) ?? {};
			const study = (orthoProgress.cephAnalysis as Record<string, unknown>) ?? (adminProfile.cephAnalysis as Record<string, unknown>) ?? null;

			return {
				success: true,
				study,
			};
		},
	});
}
