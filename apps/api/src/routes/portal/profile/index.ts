/**
 * Portal Patient Profile Routes Assembly & Registration
 * (DOMAIN: PATIENT PORTAL - LAYER 3 FASTIFY ROUTER)
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { eq } from "drizzle-orm";
import { definePublicRoute } from "../../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../../db/rls.js";
import { clinics, organizations } from "../../../db/schema.js";
import { extractPortalPatient } from "../portalAuthStore.js";
import { healthQuestionnaireBodySchema, type HealthQuestionnaireBody } from "../types.js";
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

		return withTenantReadCtx(auth.organizationId, async (tx) => {
			const sanitizedPatient = await fetchSanitizedPatient(auth.patientId, auth.organizationId, tx);
			if (!sanitizedPatient) {
				reply.status(404);
				return { error: "Not found" };
			}

			const medicalRecords = await fetchPatientMedicalRecords(auth.patientId, auth.organizationId, tx);
			const { appointments: enrichedAppointments, doctors: clinicDoctors } =
				await fetchPatientAppointmentsAndDoctors(auth.patientId, auth.organizationId, tx);
			const { familyGroup: familyGroupData, familyMembers: familyMembersList } =
				await fetchPatientFamilyData(auth.patientId, auth.organizationId, sanitizedPatient.familyGroupId, tx);

			const [org] = await tx
				.select({
					name: organizations.name,
					inn: organizations.inn,
					kpp: organizations.kpp,
					ogrn: organizations.ogrn,
				})
				.from(organizations)
				.where(eq(organizations.id, auth.organizationId))
				.limit(1);

			const [clinic] = await tx
				.select({
					name: clinics.name,
					address: clinics.address,
					phone: clinics.phone,
				})
				.from(clinics)
				.where(eq(clinics.organizationId, auth.organizationId))
				.limit(1);

			const clinicInfo = {
				nameRu: clinic?.name ?? org?.name ?? null,
				legalName: org?.name ?? null,
				inn: org?.inn ?? null,
				kpp: org?.kpp ?? null,
				ogrn: org?.ogrn ?? null,
				address: clinic?.address ?? null,
				phone: clinic?.phone ?? null,
			};

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
				clinicInfo,
			};
		});
	};

	definePublicRoute(server, {
		method: "GET",
		path: "/me",
		handler: async ({ request, reply }) => handleGetPortalMe(request, reply),
	});
	definePublicRoute(server, {
		method: "GET",
		path: "/profile",
		handler: async ({ request, reply }) => handleGetPortalMe(request, reply),
	});

	// 7. Get Somatic Health Questionnaire & Clinical Risk Factor Alerts (Protected)
	definePublicRoute(server, {
		method: "GET",
		path: "/health-questionnaire",
		handler: async ({ request, reply }) => {
			const auth = extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			return withTenantReadCtx(auth.organizationId, async (tx) => {
				const data = await fetchSomaticHealthQuestionnaire(auth.patientId, auth.organizationId, tx);
				if (!data) {
					reply.status(404);
					return { error: "Not found" };
				}
				return data;
			});
		},
	});

	// 8. Submit/Update Somatic Health Questionnaire (Protected)
	definePublicRoute(server, {
		method: "POST",
		path: "/health-questionnaire",
		handler: async ({ request, reply }) => {
			const auth = extractPortalPatient(request);
			if (!auth) {
				reply.status(401);
				return { error: "Unauthorized" };
			}

			const parsed = healthQuestionnaireBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				reply.status(400);
				return {
					error: "ValidationError",
					message: "Некорректные данные анкеты здоровья.",
					details: parsed.error.format(),
				};
			}

			const body = parsed.data as HealthQuestionnaireBody;
			return withTenantWriteCtx(auth.organizationId, async (tx) => {
				const result = await saveSomaticHealthQuestionnaire(auth.patientId, auth.organizationId, body, tx);
				if (!result) {
					reply.status(404);
					return { error: "PatientNotFound" };
				}
				return result;
			});
		},
	});
}

export * from "./portalProfileQueries.js";
export * from "./portalProfileAppointments.js";
export * from "./portalProfileMedicalRecords.js";
