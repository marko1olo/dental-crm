import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	getDoctorPreferencesFromDb,
	saveDoctorPreferencesInDb,
} from "../db/doctorPreferencesQuery.js";
import { getRequestIdentity } from "../security/identity.js";
import { requireResolvedStaffOrAdminOrganizationId } from "../accessGuard.js";

const putDoctorPreferencesBodySchema = z.object({
	preferences: z.record(z.unknown()),
	specialty: z.string().max(80).optional(),
	doctorId: z.string().uuid().optional().nullable(),
});

export async function registerDoctorPreferencesRoutes(app: FastifyInstance) {
	/**
	 * GET /api/settings/doctor-preferences
	 * Reads doctor clinical preferences from PostgreSQL (127.0.0.1:5432).
	 * Ensures cross-device and remote workstation persistence.
	 */
	app.get(
		"/api/settings/doctor-preferences",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"doctor preferences read",
			);
			if (!orgId) return reply;

			const identity = getRequestIdentity(request);
			const query = request.query as { doctorId?: string } | undefined;
			const targetDoctorId = query?.doctorId || identity.userId || null;

			const record = await getDoctorPreferencesFromDb(orgId, targetDoctorId);
			if (!record) {
				return reply.send({
					preferences: null,
					specialty: "therapist",
					updatedAt: null,
				});
			}

			return reply.send({
				preferences: record.preferences,
				specialty: record.specialty,
				updatedAt: record.updatedAt.toISOString(),
			});
		},
	);

	/**
	 * PUT /api/settings/doctor-preferences
	 * Saves doctor clinical preferences (anesthesia, materials, 6-specialty presets, 043/u templates)
	 * directly to PostgreSQL (127.0.0.1:5432).
	 */
	app.put(
		"/api/settings/doctor-preferences",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"doctor preferences write",
			);
			if (!orgId) return reply;

			const parsed = putDoctorPreferencesBodySchema.safeParse(request.body);
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						"Некорректный формат клинических настроек врача. Ожидается объект preferences.",
					issues: parsed.error.issues,
				});
			}

			const identity = getRequestIdentity(request);
			const doctorId = parsed.data.doctorId || identity.userId || null;
			const specialty = parsed.data.specialty || "therapist";

			const saved = await saveDoctorPreferencesInDb(
				orgId,
				doctorId,
				parsed.data.preferences,
				specialty,
			);

			return reply.send({
				success: true,
				preferences: saved.preferences,
				specialty: saved.specialty,
				updatedAt: saved.updatedAt.toISOString(),
			});
		},
	);
}
