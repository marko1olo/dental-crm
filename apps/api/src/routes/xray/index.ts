import type { FastifyInstance } from "fastify";
import { registerXrayUploadRoute } from "./xrayUploadRoute.js";
import { registerXrayMetadataRoute } from "./xrayMetadataRoute.js";
import { registerXraySeriesRoute } from "./xraySeriesRoute.js";
import { registerXrayExportRoute } from "./xrayExportRoute.js";

export async function registerXrayRoutes(app: FastifyInstance): Promise<void> {
	await registerXrayUploadRoute(app);
	await registerXrayMetadataRoute(app);
	await registerXraySeriesRoute(app);
	await registerXrayExportRoute(app);
}
