import type { FastifyInstance } from "fastify";
import { getPatientByIdFromDb, updatePatientAdministrativeProfileInDb } from "../../db/patientsQuery.js";
import { requireOrganizationId } from "../../security/identity.js";
import { calculateNextDate, createInitialOrthoRecord, parseOrthoData } from "./helpers.js";
import { issueAlignerSetSchema, patientParamsSchema, type OrthodonticProgressRecord } from "./types.js";

export function registerAlignerRoutes(app: FastifyInstance, prefix = "/api/orthodontics") {
	app.get<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/progress`,
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const orthoProgress = parseOrthoData(adminProfile.orthodonticProgress);
			if (!orthoProgress) {
				return reply.code(404).send({
					error: "OrthoTreatmentNotFound",
					message: "У пациента нет активного курса ортодонтического лечения",
				});
			}

			return reply.send({
				patientId,
				patientName: patient.fullName,
				...orthoProgress,
			});
		},
	);

	app.post<{ Params: { patientId: string } }>(
		`${prefix}/:patientId/aligners/issue-set`,
		async (request, reply) => {
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = patientParamsSchema.parse(request.params);
			const body = issueAlignerSetSchema.parse(request.body);

			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return reply.code(404).send({ error: "PatientNotFound", message: "Пациент не найден" });
			}

			const adminProfile = (patient.administrativeProfile as Record<string, unknown>) ?? {};
			const currentProgress = parseOrthoData(adminProfile.orthodonticProgress) ?? createInitialOrthoRecord({
				totalAligners: body.totalAligners,
				wearDaysPerAligner: body.wearDaysPerAligner,
			});

			const effectiveTotal = body.totalAligners || currentProgress.totalAligners;
			const fromAligner = currentProgress.currentAligner;
			const toAligner = Math.min(effectiveTotal, fromAligner + body.alignerCount);
			const totalDays = body.alignerCount * body.wearDaysPerAligner;
			const nextDate = calculateNextDate(totalDays);
			const actionSummary = `Выдан сет элайнеров №${fromAligner}–${toAligner} (+${totalDays} дн. до ${nextDate})`;

			const updatedProgress: OrthodonticProgressRecord = {
				...currentProgress,
				currentAligner: toAligner,
				totalAligners: effectiveTotal,
				wearDaysPerAligner: body.wearDaysPerAligner,
				lastActionDate: new Date().toISOString(),
				lastActionSummary: actionSummary,
				nextVisitRecommendedDate: nextDate,
			};

			// DEF-ORTHO-01: Сохраняем структурированный JSONB объект вместо JSON-строки
			await updatePatientAdministrativeProfileInDb(orgId, patientId, {
				...adminProfile,
				orthodonticProgress: updatedProgress,
			});

			return reply.send({
				success: true,
				issuedRange: `№${fromAligner}–${toAligner}`,
				nextVisitRecommendedDate: nextDate,
				actionSummary,
				progress: updatedProgress,
			});
		},
	);
}
