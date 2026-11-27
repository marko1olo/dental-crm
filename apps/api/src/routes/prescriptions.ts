/**
 * prescriptions.ts — Canonical Facade for Outpatient Dental Prescriptions API
 * Mandates 8b, 8e, 8n, 8x, 8y (Doctor Autonomy & Pure Domain Architecture).
 * Decomposed facade strictly <= 80 lines (Mandate 8b).
 */

import type { FastifyInstance, FastifyRequest } from "fastify";
import { defineStreamRoute } from "../core/routeFactories.js";
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

const prescriptionMutationSchema: Record<string, unknown> = {
	description: "Prescription mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
	headers: {
		type: "object",
		properties: {
			"idempotency-key": { type: "string" },
			"x-idempotency-key": { type: "string" },
			organizationid: { type: "string" },
			"x-organization-id": { type: "string" },
		},
	},
};

export async function registerPrescriptionRoutes(app: FastifyInstance) {
	// 1. Reference catalog & preview
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/prescriptions/reference-catalog",
		permission: "public",
		handler: async ({ request, reply }) => handlePrescriptionReferenceCatalog(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/prescriptions/preview-html",
		permission: "public",
		schema: prescriptionMutationSchema,
		handler: async ({ request, reply }) => handlePrescriptionPreviewHtml(request, reply),
	});

	// 2. Statutory validation & verification
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/prescriptions/validate",
		permission: "public",
		schema: prescriptionMutationSchema,
		handler: async ({ request, reply }) => handleValidatePrescription(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/prescriptions/:id/verify",
		permission: "public",
		schema: prescriptionMutationSchema,
		handler: async ({ request, reply }) => handleVerifyPrescription(request, reply),
	});

	// 3. Clinical queries
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/prescriptions",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleListPrescriptions(
				request as FastifyRequest<{ Querystring: { patientId?: string; visitId?: string; formType?: string; status?: string } }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/prescriptions/:id",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleGetPrescriptionById(request as FastifyRequest<{ Params: { id: string } }>, reply),
	});

	// 4. Clinical authoring & UKEP signing
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/prescriptions",
		permission: "public",
		schema: prescriptionMutationSchema,
		handler: async ({ request, reply }) => handleCreatePrescription(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/prescriptions/:id/sign-ukep",
		permission: "public",
		schema: prescriptionMutationSchema,
		handler: async ({ request, reply }) => handleSignUkepPrescription(request, reply),
	});

	// 5. Official print-ready HTML
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/prescriptions/:id/print-html",
		permission: "public",
		handler: async ({ request, reply }) =>
			handlePrescriptionPrintHtml(
				request as FastifyRequest<{ Params: { id: string }; Querystring: { withStamp?: string; autoprint?: string } }>,
				reply,
			),
	});
}
