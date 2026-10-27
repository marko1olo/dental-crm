import type { FastifyInstance } from "fastify";
import {
	autoBindHandler,
	bindPatientHandler,
	bindToothHandler,
	cbctTunerPatientsHandler,
	cbctTunerVolumeHandler,
	unbindPatientHandler,
} from "./studiesBindingHandler.js";
import { createStudyHandler, updateStudyHandler } from "./studiesCrudHandler.js";
import { fileStreamHandler, previewSvgHandler } from "./studiesFileStreamHandler.js";
import { getMeasurementsHandler, saveMeasurementsHandler } from "./studiesMeasurementsHandler.js";
import { getStudiesHandler } from "./studiesQueryHandler.js";
import { getViewerSessionHandler, putViewerSessionHandler } from "./studiesViewerSessionHandler.js";

export async function registerStudiesRoutes(app: FastifyInstance) {
	// List & Search
	app.get("/api/imaging/studies", getStudiesHandler);
	app.get("/api/radiology/studies", getStudiesHandler);
	app.get("/api/radiology/slices", getStudiesHandler);
	app.get("/api/patients/:patientId/studies", getStudiesHandler);
	app.get("/api/patients/:patientId/imaging/studies", getStudiesHandler);
	app.get("/api/patients/:patientId/radiology/studies", getStudiesHandler);

	// Viewer Session
	app.get("/api/imaging/studies/:id/viewer-session", getViewerSessionHandler);
	app.get("/api/radiology/studies/:id/viewer-session", getViewerSessionHandler);
	app.put("/api/imaging/studies/:id/viewer-session", putViewerSessionHandler);
	app.put("/api/radiology/studies/:id/viewer-session", putViewerSessionHandler);

	// Measurements
	app.get("/api/imaging/studies/:id/measurements", getMeasurementsHandler);
	app.get("/api/radiology/studies/:id/measurements", getMeasurementsHandler);
	app.put("/api/imaging/studies/:id/measurements", saveMeasurementsHandler);
	app.put("/api/radiology/studies/:id/measurements", saveMeasurementsHandler);
	app.post("/api/imaging/studies/:id/measurements", saveMeasurementsHandler);
	app.post("/api/radiology/studies/:id/measurements", saveMeasurementsHandler);

	// CRUD
	app.post("/api/imaging/studies", createStudyHandler);
	app.post("/api/radiology/studies", createStudyHandler);
	app.post("/api/patients/:patientId/studies", createStudyHandler);
	app.post("/api/patients/:patientId/radiology/studies", createStudyHandler);
	app.patch("/api/imaging/studies/:id", updateStudyHandler);
	app.patch("/api/radiology/studies/:id", updateStudyHandler);

	// Files
	app.get("/api/imaging/studies/:id/preview.svg", previewSvgHandler);
	app.get("/api/imaging/studies/:id/file", { config: { tenantTxSelfManaged: true } }, fileStreamHandler);

	// Binding & Management
	app.post("/api/imaging/studies/:id/bind-patient", bindPatientHandler);
	app.post("/api/radiology/studies/:id/bind-patient", bindPatientHandler);
	app.post("/api/imaging/studies/:id/bind-tooth", bindToothHandler);
	app.patch("/api/imaging/studies/:id/bind-tooth", bindToothHandler);
	app.post("/api/radiology/studies/:id/bind-tooth", bindToothHandler);
	app.patch("/api/radiology/studies/:id/bind-tooth", bindToothHandler);
	app.post("/api/imaging/studies/:id/unbind-patient", unbindPatientHandler);
	app.post("/api/radiology/studies/:id/unbind-patient", unbindPatientHandler);
	app.post("/api/imaging/studies/auto-bind-scan", autoBindHandler);
	app.post("/api/radiology/studies/auto-bind-scan", autoBindHandler);

	// CBCT Tuner
	app.get("/api/cbct-tuner/patients", cbctTunerPatientsHandler);
	app.get("/api/cbct-tuner/volume-binary", cbctTunerVolumeHandler);
}
