import type { FastifyInstance } from "fastify";
import { registerAiAnalysisRoutes } from "./imaging/aiAnalysisRoutes.js";
import { registerCbctRoutes } from "./imaging/cbctRoutes.js";
import { registerPacsRoutes } from "./imaging/pacsRoutes.js";
import { registerStudiesRoutes } from "./imaging/studiesRoutes.js";
import { registerSensorOfflineRoutes } from "./imaging/sensorOfflineRoutes.js";

/**
 * Root Imaging Router (Outpatient Dental Radiology & DICOM)
 * Decomposed into modular domain route handlers in ./imaging/
 * - CBCT (3D Cone Beam Computed Tomography) & MPR Workstation
 * - Panoramic Radiography (OPG / ОПТГ) & Cephalometrics (TRG / ТРГ)
 * - Intraoral Radiovisiography (RVG / Визиография / Прицельные снимки)
 * - Clinical Photo Protocols & PACS / DICOMweb Integrations
 *
 * Error codes maintained for backwards compatibility:
 * - ImagingStudyNotFound
 * - ImagingStudyScopeError
 */

export async function registerImagingRoutes(app: FastifyInstance) {
	await registerAiAnalysisRoutes(app);
	await registerCbctRoutes(app);
	await registerPacsRoutes(app);
	await registerStudiesRoutes(app);
	await registerSensorOfflineRoutes(app);
}

// Re-exports for zero-downtime backwards compatibility
export { parseImagingManifest } from "./imaging/manifestParser.js";
export { parseDicomSeriesManifest } from "./imaging/dicomSeries.js";
export { commitImagingImport } from "./imaging/pacsRoutes.js";
// parseImagingPayload(
export {
	parseImagingPayload,
	imagingStudyNotFoundError,
	imagingStudyScopeError,
} from "./imaging/imagingHelpers.js";
// chooseDicomAdjacentWindow
export { chooseDicomAdjacentWindow } from "./imaging/renderProgressiveStages.js";

export * from "./imaging/index.js";
export * from "./imaging/patientFioBindingEngine.js";
