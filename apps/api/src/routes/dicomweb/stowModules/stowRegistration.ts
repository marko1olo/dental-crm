import type { FastifyInstance } from "fastify";
import { handleDicomwebStow } from "./stowHandler.js";

export function registerDicomwebStowRoutes(app: FastifyInstance) {
	const parsersToAdd: string[] = [];
	for (const ct of [
		"application/dicom",
		"application/octet-stream",
		"multipart/related",
		"multipart/form-data",
	]) {
		if (!app.hasContentTypeParser(ct)) {
			parsersToAdd.push(ct);
		}
	}
	if (parsersToAdd.length > 0) {
		app.addContentTypeParser(parsersToAdd, (_req, payload, done) => {
			done(null, payload);
		});
	}

	const stowRouteOptions = {
		bodyLimit: Number(process.env.DICOM_BODY_LIMIT_BYTES ?? 2 * 1024 * 1024 * 1024),
		config: { tenantTxSelfManaged: true },
	};

	app.post("/api/dicomweb/studies", stowRouteOptions, handleDicomwebStow);
	app.post("/api/dicomweb/studies/:studyUid", stowRouteOptions, handleDicomwebStow);
}
