import type { FastifyInstance } from "fastify";
import {
	autoBindHandler,
	bindPatientHandler,
	bindToothHandler,
	cbctTunerPatientsHandler,
	cbctTunerVolumeHandler,
	unbindPatientHandler,
} from "./studiesBindingHandler.js";
import { createStudyHandler, deleteStudyHandler, updateStudyHandler } from "./studiesCrudHandler.js";
import { fileStreamHandler, previewSvgHandler } from "./studiesFileStreamHandler.js";
import { getMeasurementsHandler, saveMeasurementsHandler } from "./studiesMeasurementsHandler.js";
import { getStudiesHandler, getStudyByIdHandler } from "./studiesQueryHandler.js";
import { getViewerSessionHandler, putViewerSessionHandler } from "./studiesViewerSessionHandler.js";
import {
	registerXrayLegacyCompatRoutes,
	registerXrayRoutes,
	registerXraySeriesRoute,
} from "./xrayLegacyCompatRoutes.js";

export { registerXrayRoutes, registerXraySeriesRoute };

export async function registerStudiesRoutes(app: FastifyInstance) {
	// List & Search
	app.get("/api/imaging/studies", getStudiesHandler);
	app.get("/api/radiology/studies", getStudiesHandler);
	app.get("/api/radiology/slices", getStudiesHandler);
	app.get("/api/patients/:patientId/studies", getStudiesHandler);
	app.get("/api/patients/:patientId/imaging/studies", getStudiesHandler);
	app.get("/api/patients/:patientId/radiology/studies", getStudiesHandler);

	// Get Study By Id
	app.get("/api/imaging/studies/:id", getStudyByIdHandler);
	app.get("/api/radiology/studies/:id", getStudyByIdHandler);

	// Viewer Session
	app.get("/api/imaging/studies/:id/viewer-session", getViewerSessionHandler);
	app.get("/api/radiology/studies/:id/viewer-session", getViewerSessionHandler);
	app.put("/api/imaging/studies/:id/viewer-session", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return putViewerSessionHandler(request, reply);
	});
	app.put("/api/radiology/studies/:id/viewer-session", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return putViewerSessionHandler(request, reply);
	});

	// Measurements
	app.get("/api/imaging/studies/:id/measurements", getMeasurementsHandler);
	app.get("/api/radiology/studies/:id/measurements", getMeasurementsHandler);
	app.put("/api/imaging/studies/:id/measurements", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return saveMeasurementsHandler(request, reply);
	});
	app.put("/api/radiology/studies/:id/measurements", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return saveMeasurementsHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/measurements", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return saveMeasurementsHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/measurements", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return saveMeasurementsHandler(request, reply);
	});

	// CRUD
	app.post("/api/imaging/studies", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return createStudyHandler(request, reply);
	});
	app.post("/api/radiology/studies", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return createStudyHandler(request, reply);
	});
	app.post("/api/patients/:patientId/studies", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return createStudyHandler(request, reply);
	});
	app.post("/api/patients/:patientId/radiology/studies", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return createStudyHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return updateStudyHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return updateStudyHandler(request, reply);
	});
	app.delete("/api/imaging/studies/:id", async (request, reply) => {
		return deleteStudyHandler(request, reply);
	});
	app.delete("/api/radiology/studies/:id", async (request, reply) => {
		return deleteStudyHandler(request, reply);
	});

	// Files
	app.get("/api/imaging/studies/:id/preview.svg", previewSvgHandler);
	app.get("/api/imaging/studies/:id/file", { config: { tenantTxSelfManaged: true } }, fileStreamHandler);

	// Binding & Management
	app.post("/api/imaging/studies/:id/bind-patient", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return bindPatientHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-patient", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return bindPatientHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/bind-tooth", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return bindToothHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id/bind-tooth", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return bindToothHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-tooth", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return bindToothHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id/bind-tooth", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return bindToothHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/unbind-patient", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return unbindPatientHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/unbind-patient", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return unbindPatientHandler(request, reply);
	});
	app.post("/api/imaging/studies/auto-bind-scan", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return autoBindHandler(request, reply);
	});
	app.post("/api/radiology/studies/auto-bind-scan", async (request, reply) => {
		// organizationId tenant context & Idempotency-Key validation
		return autoBindHandler(request, reply);
	});

	// CBCT Tuner
	app.get("/api/cbct-tuner/patients", cbctTunerPatientsHandler);
	app.get("/api/cbct-tuner/volume-binary", cbctTunerVolumeHandler);

	// Legacy /api/xray/* Backwards-Compatibility Routes
	await registerXrayLegacyCompatRoutes(app);
}
