import type { FastifyInstance } from "fastify";
import { registerCandidateRoutes } from "./candidateRoutes.js";
import { registerInviteRoutes } from "./inviteRoutes.js";
import { registerStatusRoutes } from "./statusRoutes.js";

export * from "./types.js";

export async function registerPatientRecallRoutes(app: FastifyInstance) {
	registerCandidateRoutes(app);
	registerInviteRoutes(app);
	registerStatusRoutes(app);
}

export default registerPatientRecallRoutes;
