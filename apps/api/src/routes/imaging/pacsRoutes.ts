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
	const selfManagedRouteConfig = { config: { tenantTxSelfManaged: true } } as const;

	app.post("/api/imaging/imports/preview", selfManagedRouteConfig, async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return handleImagingImportPreview(request, reply);
	});
	app.post("/api/imaging/dicomweb/check", selfManagedRouteConfig, async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return handleDicomWebCheck(request, reply);
	});
	app.post("/api/integrations/dicom-server/ping", selfManagedRouteConfig, async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return handleDicomServerPing(request, reply);
	});
	app.post("/api/imaging/dicom/viewer-launch-manifest", selfManagedRouteConfig, async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return handleViewerLaunchManifest(request, reply);
	});
	app.post("/api/imaging/launch-external-viewer", selfManagedRouteConfig, async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return handleLaunchExternalViewer(request, reply);
	});
	app.post("/api/imaging/imports/commit", selfManagedRouteConfig, async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return handleImagingImportCommit(request, reply);
	});
	app.post("/api/imaging/folders/scan-preview", selfManagedRouteConfig, async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return handleFolderScanPreview(request, reply);
	});
}
