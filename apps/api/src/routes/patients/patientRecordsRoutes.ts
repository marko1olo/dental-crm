import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { visitDiaries, visits } from "../../db/schema.js";
import { getPatientByIdFromDb } from "../../db/patientsQuery.js";
import { getRequestIdentity } from "../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	PATIENT_ID_UUID_PATTERN,
	requireClinicOrganizationId,
	sendPatientNotFound,
	sendPatientRouteValidationError,
} from "./helpers.js";

/**
 * Регистрация маршрутов для работы с медицинскими записями пациентов
 * с соблюдением 152-ФЗ / 323-ФЗ ст. 13 (врачебная тайна).
 */
export function registerPatientRecordsRoutes(app: FastifyInstance) {
	/**
	 * GET /api/patients/:patientId/records & /api/patients/:patientId/emk
	 * Медицинские записи, протоколы приёмов и дневники медицинской карты приёма пациента
	 * с соблюдением 152-ФЗ / 323-ФЗ ст. 13 (врачебная тайна).
	 */
	const getPatientRecordsHandler = async (
		request: FastifyRequest,
		reply: FastifyReply,
	) => {
		const orgId = requireClinicOrganizationId(request, reply);
		if (!orgId) return reply;

		const params = request.params as { patientId?: string };
		if (
			!params.patientId ||
			!PATIENT_ID_UUID_PATTERN.test(params.patientId.trim())
		) {
			return sendPatientRouteValidationError(reply);
		}
		const patientId = params.patientId.trim();

		try {
			const patient = await getPatientByIdFromDb(orgId, patientId);
			if (!patient) {
				return sendPatientNotFound(reply);
			}

			// 152-ФЗ / 323-ФЗ ст. 13: Проверка прав доступа к медзаписям
			const identity = getRequestIdentity(request);
			const staffRole = identity.role ?? request.user?.role ?? null;
			const evalAccess = evaluateClinicalAccess(staffRole);

			if (!evalAccess.hasClinicalAccess) {
				await auditMedicalAccessFromRequest(request, {
					organizationId: orgId,
					patientId,
					action: "ACCESS_DENIED_MEDICAL_RECORDS",
					diagnosis: "Отказ в доступе к медзаписям неклиническому сотруднику (152-ФЗ)",
				});
				return reply.code(403).send({
					error: "PermissionDenied",
					permission: "patients.records.read",
					role: staffRole,
					message: `Отказ в доступе к медицинским записям (152-ФЗ / 323-ФЗ ст. 13): ${evalAccess.reason}`,
				});
			}

			await auditMedicalAccessFromRequest(request, {
				organizationId: orgId,
				patientId,
				action: "VIEW_PATIENT_MEDICAL_RECORDS",
			});

			const patientVisits = await db
				.select({
					id: visits.id,
					appointmentId: visits.appointmentId,
					patientId: visits.patientId,
					complaint: visits.complaint,
					anamnesis: visits.anamnesis,
					objectiveStatus: visits.objectiveStatus,
					diagnosis: visits.diagnosis,
					treatmentPlan: visits.treatmentPlan,
					status: visits.status,
					createdAt: visits.createdAt,
				})
				.from(visits)
				.where(and(eq(visits.patientId, patientId), eq(visits.organizationId, orgId)))
				.orderBy(desc(visits.createdAt));

			const patientDiaries = await db
				.select()
				.from(visitDiaries)
				.where(and(eq(visitDiaries.patientId, patientId), eq(visitDiaries.organizationId, orgId)))
				.orderBy(desc(visitDiaries.createdAt));

			return reply.code(200).send({
				patientId,
				recordsCount: patientVisits.length + patientDiaries.length,
				visits: patientVisits,
				diaries: patientDiaries,
			});
		} catch (e: unknown) {
			request.log.error(e, "[Patients] Error fetching patient records");
			return reply.code(500).send({
				error: "DatabaseError",
				message: "Не удалось загрузить медицинские записи пациента.",
			});
		}
	};

	app.get("/api/patients/:patientId/records", getPatientRecordsHandler);
	app.get("/api/patients/:patientId/emk", getPatientRecordsHandler);
}
