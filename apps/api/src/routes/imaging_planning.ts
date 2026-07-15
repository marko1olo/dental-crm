import type { FastifyInstance } from "fastify";
import { z } from "zod";

// Mock DB if DB is down.
const inMemoryPlannings = new Map<string, any>();

export async function registerImagingPlanningRoutes(app: FastifyInstance) {
	// POST /api/imaging/planning/save
	app.post("/api/imaging/planning/save", async (request, reply) => {
		try {
			const payload = request.body as any;
			if (!payload.studyInstanceUid || !payload.patientId) {
				return reply.status(400).send({ error: "Missing required fields" });
			}

			const key = `${payload.patientId}_${payload.studyInstanceUid}`;
			inMemoryPlannings.set(key, {
				...payload,
				updatedAt: new Date(),
			});

			return reply.status(200).send({ success: true });
		} catch (err) {
			request.log.error(err);
			return reply.status(500).send({ error: "Internal server error" });
		}
	});

	// GET /api/imaging/planning/load
	app.get("/api/imaging/planning/load", async (request, reply) => {
		try {
			const { studyUid, patientId } = request.query as any;
			if (!studyUid || !patientId) {
				return reply
					.status(400)
					.send({ error: "Missing required query parameters" });
			}

			const key = `${patientId}_${studyUid}`;
			const planning = inMemoryPlannings.get(key);

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
