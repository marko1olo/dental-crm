/**
 * DENTE CRM — PACS & DICOM Fastify Routes Facade
 * Mandate 8b: строго <= 120 строк.
 */

import type { FastifyInstance } from "fastify";
import {
	handleImagingImportPreview,
	handleDicomWebCheck,
	handleDicomServerPing,
	handleViewerLaunchManifest,
	handleFolderScanPreview,
} from "./pacsModules/pacsPreviewScanRoutes.js";
import {
	handleLaunchExternalViewer,
	KNOWN_VIEWER_CANDIDATES,
} from "./pacsModules/pacsExternalViewerLaunch.js";
import {
	handleImagingImportCommit,
	commitImagingImport,
} from "./pacsModules/pacsCommitImport.js";

export { commitImagingImport, KNOWN_VIEWER_CANDIDATES };

export async function registerPacsRoutes(app: FastifyInstance) {
	app.post("/api/imaging/imports/preview", handleImagingImportPreview);
	app.post("/api/imaging/dicomweb/check", handleDicomWebCheck);
	app.post("/api/integrations/dicom-server/ping", handleDicomServerPing);
	app.post("/api/imaging/dicom/viewer-launch-manifest", handleViewerLaunchManifest);
	app.post("/api/imaging/launch-external-viewer", handleLaunchExternalViewer);
	app.post("/api/imaging/imports/commit", handleImagingImportCommit);
	app.post("/api/imaging/folders/scan-preview", handleFolderScanPreview);
}
