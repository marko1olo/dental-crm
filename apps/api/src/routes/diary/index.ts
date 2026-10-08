import type { FastifyInstance } from "fastify";
import { registerDiaryCrudRoutes } from "./diaryCrudRoutes.js";
import { registerDiarySigningRoutes } from "./signingRoutes.js";
import { registerDiaryRevisionRoutes } from "./revisionRoutes.js";
import { registerChiefPhysicianRoutes } from "./chiefPhysicianRoutes.js";

export { isDoctorOrClinicalSigner } from "./types.js";
export * from "./types.js";

export async function registerDiaryRoutes(app: FastifyInstance): Promise<void> {
	registerDiaryCrudRoutes(app);
	registerDiarySigningRoutes(app);
	registerDiaryRevisionRoutes(app);
	registerChiefPhysicianRoutes(app);
}

export default registerDiaryRoutes;
