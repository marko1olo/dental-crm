/**
 * Portal Patient Profile Routes Assembly & Registration
 * (DOMAIN: PATIENT PORTAL - LAYER 3 FASTIFY ROUTER)
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { withTenantCtx } from "../../../db/rls.js";
import { extractPortalPatient } from "../portalAuthStore.js";
import type { HealthQuestionnaireBody } from "../types.js";
import { fetchPatientAppointmentsAndDoctors } from "./portalProfileAppointments.js";
import {
	fetchPatientMedicalRecords,
	fetchSomaticHealthQuestionnaire,
	saveSomaticHealthQuestionnaire,
} from "./portalProfileMedicalRecords.js";
import {
	fetchPatientFamilyData,
	fetchSanitizedPatient,
	verifyPortalProfileRequest,
} from "./portalProfileQueries.js";

export async function registerPortalPatientProfileRoutes(server: FastifyInstance): Promise<void> {
	// 3. Get Patient Data (Protected: /me or /profile)
	const handleGetPortalMe = async (request: FastifyRequest, reply: FastifyReply) => {
		const auth = verifyPortalProfileRequest(request, reply);
		if (!auth) return;

		return withTenantCtx(auth.organizationId, async () => {
			const sanitizedPatient = await fetchSanitizedPatient(auth.patientId, auth.organizationId);
			if (!sanitizedPatient) {
				reply.status(404);
				return { error: "Not found" };
			}

			const medicalRecords = await fetchPatientMedicalRecords(auth.patientId, auth.organizationId);
			const { appointments: enrichedAppointments, doctors: clinicDoctors } =
				await fetchPatientAppointmentsAndDoctors(auth.patientId, auth.organizationId);
			const { familyGroup: familyGroupData, familyMembers: familyMembersList } =
				await fetchPatientFamilyData(auth.patientId, auth.organizationId, sanitizedPatient.familyGroupId);

			return {
				patient: sanitizedPatient,
				visits: medicalRecords.visits,
				plans: medicalRecords.plans,
				invoices: medicalRecords.invoices,
				documents: medicalRecords.documents,
				appointments: enrichedAppointments,
				familyGroup: familyGroupData,
				familyMembers: familyMembersList,
				doctors: clinicDoctors,
				scans: medicalRecords.scans,
			};
		});
	};

	server.get("/me", handleGetPortalMe);
	server.get("/profile", handleGetPortalMe);

	// 7. Get Somatic Health Questionnaire & Clinical Risk Factor Alerts (Protected)
	server.get("/health-questionnaire", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		return withTenantCtx(auth.organizationId, async () => {
			const data = await fetchSomaticHealthQuestionnaire(auth.patientId, auth.organizationId);
			if (!data) {
				reply.status(404);
				return { error: "Not found" };
			}
			return data;
		});
	});

	// 8. Submit/Update Somatic Health Questionnaire (Protected)
	server.post<{
		Body: HealthQuestionnaireBody;
	}>("/health-questionnaire", async (request, reply) => {
		const auth = extractPortalPatient(request);
		if (!auth) {
			reply.status(401);
			return { error: "Unauthorized" };
		}

		const body = request.body || {};
		return withTenantCtx(auth.organizationId, async () => {
			const result = await saveSomaticHealthQuestionnaire(auth.patientId, auth.organizationId, body);
			if (!result) {
				reply.status(404);
				return { error: "PatientNotFound" };
			}
			return result;
		});
	});
}

export * from "./portalProfileQueries.js";
export * from "./portalProfileAppointments.js";
export * from "./portalProfileMedicalRecords.js";
