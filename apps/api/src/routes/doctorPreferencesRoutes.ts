import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { defineStreamRoute } from "../core/routeFactories.js";
import {
	getDoctorPreferencesFromDb,
	saveDoctorPreferencesInDb,
} from "../db/doctorPreferencesQuery.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../db/rls.js";
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
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/settings/doctor-preferences",
		permission: "public",
		handler: async ({ request, reply }) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"doctor preferences read",
			);
			if (!orgId) return reply;

			const identity = getRequestIdentity(request);
			const query = request.query as { doctorId?: string } | undefined;
			const requestedDoctorId = query?.doctorId?.trim() || null;

			// IDOR защита (DEF-DOCPREF-01): врач может запрашивать только свои настройки,
			// если запрашивается чужой doctorId — требуется роль admin или owner.
			const isPrivileged = identity.role === "admin" || identity.role === "owner";
			if (
				requestedDoctorId &&
				identity.userId &&
				requestedDoctorId !== identity.userId &&
				!isPrivileged
			) {
				return reply.code(403).send({
					error: "Forbidden",
					message: "Доступ к индивидуальным клиническим настройкам других врачей ограничен.",
				});
			}

			const targetDoctorId = requestedDoctorId || identity.userId || null;

			const record = await withTenantReadCtx(orgId, async (tx) =>
				getDoctorPreferencesFromDb(orgId, targetDoctorId, tx),
			);
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
	});

	/**
	 * PUT /api/settings/doctor-preferences
	 * Saves doctor clinical preferences (anesthesia, materials, 6-specialty presets, 043/u templates)
	 * directly to PostgreSQL (127.0.0.1:5432).
	 */
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/settings/doctor-preferences",
		permission: "public",
		handler: async ({ request, reply }) => {
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
			const requestedDoctorId = parsed.data.doctorId?.trim() || null;

			// IDOR защита (DEF-DOCPREF-01): сохранять настройки чужого врача могут только admin и owner
			const isPrivileged = identity.role === "admin" || identity.role === "owner";
			if (
				requestedDoctorId &&
				identity.userId &&
				requestedDoctorId !== identity.userId &&
				!isPrivileged
			) {
				return reply.code(403).send({
					error: "Forbidden",
					message:
						"Изменение индивидуальных клинических настроек других врачей доступно только руководству.",
				});
			}

			const doctorId = requestedDoctorId || identity.userId || null;
			const specialty = parsed.data.specialty || "therapist";

			const saved = await withTenantWriteCtx(orgId, async (tx) =>
				saveDoctorPreferencesInDb(
					orgId,
					doctorId,
					parsed.data.preferences,
					specialty,
					tx,
				),
			);

			return reply.send({
				success: true,
				preferences: saved.preferences,
				specialty: saved.specialty,
				updatedAt: saved.updatedAt.toISOString(),
			});
		},
	});
}
