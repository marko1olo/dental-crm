import type { FastifyInstance } from "fastify";
import { registerDicomwebStowRoutes } from "../../dicomwebStow.js";
import { handleQidoInstances } from "./qidoInstancesRoute.js";
import { handleQidoSeries } from "./qidoSeriesRoute.js";
import { handleQidoStudies } from "./qidoStudiesRoute.js";
import { handleWadoRetrieveFrames } from "./wadoFramesRoute.js";
import { handleWadoRetrieveInstance } from "./wadoInstanceRoute.js";
import { handleWadoSeriesMetadata } from "./wadoMetadataRoute.js";

export async function registerDicomwebRoutes(app: FastifyInstance) {
	// STOW-RS (DICOM PS3.18 Section 10 Store Over the Web)
	registerDicomwebStowRoutes(app);

	const routeOpts = { config: { tenantTxSelfManaged: true } };

	// QIDO-RS (Search)
	app.get("/api/dicomweb/studies", routeOpts, handleQidoStudies as any);
	app.get("/api/dicomweb/studies/:studyUid/series", routeOpts, handleQidoSeries as any);
	app.get("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances", routeOpts, handleQidoInstances as any);

	// WADO-RS (Retrieve)
	app.get("/api/dicomweb/studies/:studyUid/series/:seriesUid/metadata", routeOpts, handleWadoSeriesMetadata as any);
	app.get("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid", routeOpts, handleWadoRetrieveInstance as any);
	app.get("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame", routeOpts, handleWadoRetrieveFrames as any);
}
