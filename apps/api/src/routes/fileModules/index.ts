import fs from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { UPLOADS_DIR } from "./common.js";
import { registerPatientAttachmentsRoutes } from "./patientAttachmentsHandlers.js";
import { registerVisitAttachmentsRoutes } from "./visitAttachmentsHandlers.js";
import { registerFileUploadRoutes } from "./fileUploadHandlers.js";

export * from "./common.js";
export * from "./patientAttachmentsHandlers.js";
export * from "./visitAttachmentsHandlers.js";
export * from "./fileUploadHandlers.js";

export async function registerFilesRoutes(app: FastifyInstance) {
	// Ensure uploads directory exists
	await fs.mkdir(UPLOADS_DIR, { recursive: true });

	registerPatientAttachmentsRoutes(app);
	registerVisitAttachmentsRoutes(app);
	registerFileUploadRoutes(app);
}
