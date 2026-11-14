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
	app.get<{
		Querystring: {
			StudyInstanceUID?: string;
			PatientID?: string;
			PatientName?: string;
			limit?: string | number;
			offset?: string | number;
		};
	}>("/api/dicomweb/studies", routeOpts, handleQidoStudies);

	app.get<{
		Params: { studyUid: string };
	}>("/api/dicomweb/studies/:studyUid/series", routeOpts, handleQidoSeries);

	app.get<{
		Params: { studyUid: string; seriesUid: string };
	}>("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances", routeOpts, handleQidoInstances);

	// WADO-RS (Retrieve)
	app.get<{
		Params: { studyUid: string; seriesUid: string };
	}>("/api/dicomweb/studies/:studyUid/series/:seriesUid/metadata", routeOpts, handleWadoSeriesMetadata);

	app.get<{
		Params: { studyUid: string; seriesUid: string; instanceUid: string };
	}>("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid", routeOpts, handleWadoRetrieveInstance);

	app.get<{
		Params: { studyUid: string; seriesUid: string; instanceUid: string; frame: string };
	}>("/api/dicomweb/studies/:studyUid/series/:seriesUid/instances/:instanceUid/frames/:frame", routeOpts, handleWadoRetrieveFrames);
}
