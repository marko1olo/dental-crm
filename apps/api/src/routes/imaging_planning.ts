import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { patientCtPlannings, patients } from "../db/schema.js";
import { and, eq } from "drizzle-orm";
import { requireResolvedOrganizationId } from "../accessGuard.js";

const savePlanningSchema = z.object({
	patientId: z.string().uuid(),
	studyInstanceUid: z.string(),
	splinePointsJson: z.string().optional(),
	nervePointsJson: z.string().optional(),
	implantsJson: z.string().optional(),
});

const loadPlanningQuerySchema = z.object({
	studyUid: z.string(),
	patientId: z.string().uuid(),
});

export async function registerImagingPlanningRoutes(app: FastifyInstance) {
	// POST /api/imaging/planning/save
	app.post("/api/imaging/planning/save", async (request, reply) => {
		try {
			const orgId = await requireResolvedOrganizationId(request, reply, "save ct planning");
			if (!orgId) return;

			const {
				patientId,
				studyInstanceUid,
				splinePointsJson,
				nervePointsJson,
				implantsJson,
			} = savePlanningSchema.parse(request.body);

			// Verify patient belongs to organization
			const [patient] = await db
				.select()
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return reply.status(404).send({ error: "Patient not found" });
			}

			// Check if planning already exists
			const [existing] = await db
				.select()
				.from(patientCtPlannings)
				.where(
					and(
						eq(patientCtPlannings.organizationId, orgId),
						eq(patientCtPlannings.patientId, patientId),
						eq(patientCtPlannings.studyInstanceUid, studyInstanceUid),
					),
				)
				.limit(1);

			if (existing) {
				await db
					.update(patientCtPlannings)
					.set({
						splinePointsJson: splinePointsJson ?? "[]",
						nervePointsJson: nervePointsJson ?? "[]",
						implantsJson: implantsJson ?? "[]",
						updatedAt: new Date(),
					})
					.where(eq(patientCtPlannings.id, existing.id));
			} else {
				await db.insert(patientCtPlannings).values({
					organizationId: orgId,
					patientId,
					studyInstanceUid,
					splinePointsJson: splinePointsJson ?? "[]",
					nervePointsJson: nervePointsJson ?? "[]",
					implantsJson: implantsJson ?? "[]",
				});
			}

			return reply.status(200).send({ success: true });
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({ error: "Internal server error" });
		}
	});

	// GET /api/imaging/planning/load
	app.get("/api/imaging/planning/load", async (request, reply) => {
		try {
			const orgId = await requireResolvedOrganizationId(request, reply, "load ct planning");
			if (!orgId) return;

			const { studyUid, patientId } = loadPlanningQuerySchema.parse(request.query);

			// Verify patient belongs to organization
			const [patient] = await db
				.select()
				.from(patients)
				.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
				.limit(1);

			if (!patient) {
				return reply.status(404).send({ error: "Patient not found" });
			}

			const [planning] = await db
				.select()
				.from(patientCtPlannings)
				.where(
					and(
						eq(patientCtPlannings.organizationId, orgId),
						eq(patientCtPlannings.patientId, patientId),
						eq(patientCtPlannings.studyInstanceUid, studyUid),
					),
				)
				.limit(1);

			if (planning) {
				return reply.send({ success: true, planning });
			}
			return reply.send({ success: true, planning: null });
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({ error: "Internal server error" });
		}
	});
}
