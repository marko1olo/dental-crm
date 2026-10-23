/**
 * prescriptions.ts — Canonical Facade for Outpatient Dental Prescriptions API
 * Mandates 8b, 8e, 8n, 8x, 8y (Doctor Autonomy & Pure Domain Architecture).
 * Decomposed facade strictly <= 80 lines (Mandate 8b).
 */

import type { FastifyInstance } from "fastify";
import {
	handlePrescriptionPreviewHtml,
	handlePrescriptionReferenceCatalog,
} from "./prescriptions/prescriptionCatalogHandler.js";
import { handleCreatePrescription } from "./prescriptions/prescriptionCreateHandler.js";
import { handlePrescriptionPrintHtml } from "./prescriptions/prescriptionPrintHtml.js";
import {
	handleGetPrescriptionById,
	handleListPrescriptions,
} from "./prescriptions/prescriptionQueryHandler.js";
import {
	FORBIDDEN_NARCOTIC_INN_PATTERNS,
	createPrescriptionBodySchema,
	signUkepBodySchema,
} from "./prescriptions/prescriptionSchemas.js";
import { handleSignUkepPrescription } from "./prescriptions/prescriptionSignUkepHandler.js";
import {
	handleValidatePrescription,
	handleVerifyPrescription,
} from "./prescriptions/prescriptionValidationHandler.js";

export {
	FORBIDDEN_NARCOTIC_INN_PATTERNS,
	createPrescriptionBodySchema,
	signUkepBodySchema,
};

export async function registerPrescriptionRoutes(app: FastifyInstance) {
	// 1. Reference catalog & preview
	app.get("/api/prescriptions/reference-catalog", handlePrescriptionReferenceCatalog);
	app.post("/api/prescriptions/preview-html", handlePrescriptionPreviewHtml);

	// 2. Statutory validation & verification
	app.post("/api/prescriptions/validate", handleValidatePrescription);
	app.post("/api/prescriptions/:id/verify", handleVerifyPrescription);

	// 3. Clinical queries
	app.get("/api/prescriptions", handleListPrescriptions);
	app.get("/api/prescriptions/:id", handleGetPrescriptionById);

	// 4. Clinical authoring & UKEP signing
	app.post("/api/prescriptions", handleCreatePrescription);
	app.post("/api/prescriptions/:id/sign-ukep", handleSignUkepPrescription);

	// 5. Official print-ready HTML
	app.get("/api/prescriptions/:id/print-html", handlePrescriptionPrintHtml);
}
