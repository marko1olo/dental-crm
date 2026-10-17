/**
 * apps/api/src/routes/perio.ts — Canonical SSOT & Route Alias Gateway for Periodontology
 *
 * Provides backwards-compatible and ergonomic /api/perio/* route aliases for
 * /api/periodontogram/* endpoints (PostgreSQL 18 Drizzle ORM).
 * Conforms to Mandates 8e, 8k, 8n & The Hammer Master Prompt.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import {
	fetchPatientLatestPeriodontogram,
	upsertPatientFullPeriodontogram,
} from "../services/periodontogramService.js";
import { getRequestIdentity } from "../security/identity.js";
import { registerPeriodontogramRoutes } from "./periodontogram.js";

export * from "./periodontogram.js";

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Registers /api/perio/* route aliases forwarding directly to periodontogram services.
 */
export async function registerPerioRoutes(app: FastifyInstance) {
	// First ensure primary periodontogram routes are registered
	await registerPeriodontogramRoutes(app);

	/**
	 * GET /api/perio/:patientId
	 * Alias for GET /api/periodontogram/:patientId
	 */
	app.get(
		"/api/perio/:patientId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedOrganizationId(request, reply);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };
			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента",
				});
			}

			const data = await fetchPatientLatestPeriodontogram(orgId, patientId);
			return reply.send({ success: true, data });
		},
	);

	/**
	 * POST /api/perio/:patientId
	 * Alias for POST /api/periodontogram/:patientId
	 */
	app.post(
		"/api/perio/:patientId",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const orgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"perio patient full upsert",
			);
			if (!orgId) return;

			const { patientId } = request.params as { patientId: string };
			if (!UUID_REGEX.test(patientId)) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента",
				});
			}

			const body = (request.body as Record<string, unknown>) || {};
			const identity = getRequestIdentity(request);
			const recordedByUserId = identity.userId ?? null;

			const result = await upsertPatientFullPeriodontogram({
				orgId,
				patientId,
				recordedByUserId,
				teeth: Array.isArray(body.teeth) ? (body.teeth as any) : undefined,
				sites: Array.isArray(body.sites) ? (body.sites as any) : undefined,
				notes: typeof body.notes === "string" ? body.notes : undefined,
				status: body.status === "closed" ? "closed" : "draft",
				autoClose: Boolean(body.autoClose),
			});

			return reply.send({ success: true, data: result });
		},
	);
}
