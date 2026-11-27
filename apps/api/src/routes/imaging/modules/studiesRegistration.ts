import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import {
	autoBindHandler,
	bindPatientHandler,
	bindToothHandler,
	bindVisitHandler,
	cbctTunerPatientsHandler,
	cbctTunerVolumeHandler,
	unbindPatientHandler,
} from "./studiesBindingHandler.js";
import { createStudyHandler, deleteStudyHandler, updateStudyHandler } from "./studiesCrudHandler.js";
import { fileStreamHandler, previewSvgHandler } from "./studiesFileStreamHandler.js";
import { getMeasurementsHandler, saveMeasurementsHandler } from "./studiesMeasurementsHandler.js";
import { getStudiesHandler, getStudyByIdHandler } from "./studiesQueryHandler.js";
import { getViewerSessionHandler, putViewerSessionHandler } from "./studiesViewerSessionHandler.js";

export async function registerStudiesRoutes(app: FastifyInstance) {
	// List & Search
	defineStreamRoute(app, { method: "GET", path: "/api/imaging/studies", permission: "public", handler: ({ request, reply }) => getStudiesHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/radiology/studies", permission: "public", handler: ({ request, reply }) => getStudiesHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/radiology/slices", permission: "public", handler: ({ request, reply }) => getStudiesHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/patients/:patientId/studies", permission: "public", handler: ({ request, reply }) => getStudiesHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/patients/:patientId/imaging/studies", permission: "public", handler: ({ request, reply }) => getStudiesHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/patients/:patientId/radiology/studies", permission: "public", handler: ({ request, reply }) => getStudiesHandler(request, reply) });

	// Get Study By Id
	defineStreamRoute(app, { method: "GET", path: "/api/imaging/studies/:id", permission: "public", handler: ({ request, reply }) => getStudyByIdHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/radiology/studies/:id", permission: "public", handler: ({ request, reply }) => getStudyByIdHandler(request, reply) });

	const studiesMutationRouteOptions = {
		config: { tenantTxSelfManaged: true },
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	};

	// Viewer Session
	defineStreamRoute(app, { method: "GET", path: "/api/imaging/studies/:id/viewer-session", permission: "public", handler: ({ request, reply }) => getViewerSessionHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/radiology/studies/:id/viewer-session", permission: "public", handler: ({ request, reply }) => getViewerSessionHandler(request, reply) });
	app.put("/api/imaging/studies/:id/viewer-session", studiesMutationRouteOptions, async (request, reply) => {
		return putViewerSessionHandler(request, reply);
	});
	app.put("/api/radiology/studies/:id/viewer-session", studiesMutationRouteOptions, async (request, reply) => {
		return putViewerSessionHandler(request, reply);
	});

	// Measurements
	defineStreamRoute(app, { method: "GET", path: "/api/imaging/studies/:id/measurements", permission: "public", handler: ({ request, reply }) => getMeasurementsHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/radiology/studies/:id/measurements", permission: "public", handler: ({ request, reply }) => getMeasurementsHandler(request, reply) });
	app.put("/api/imaging/studies/:id/measurements", studiesMutationRouteOptions, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});
	app.put("/api/radiology/studies/:id/measurements", studiesMutationRouteOptions, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/measurements", studiesMutationRouteOptions, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/measurements", studiesMutationRouteOptions, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});

	// CRUD
	app.post("/api/imaging/studies", studiesMutationRouteOptions, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.post("/api/radiology/studies", studiesMutationRouteOptions, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.post("/api/patients/:patientId/studies", studiesMutationRouteOptions, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.post("/api/patients/:patientId/radiology/studies", studiesMutationRouteOptions, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id", studiesMutationRouteOptions, async (request, reply) => {
		return updateStudyHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id", studiesMutationRouteOptions, async (request, reply) => {
		return updateStudyHandler(request, reply);
	});
	app.delete("/api/imaging/studies/:id", studiesMutationRouteOptions, async (request, reply) => {
		return deleteStudyHandler(request, reply);
	});
	app.delete("/api/radiology/studies/:id", studiesMutationRouteOptions, async (request, reply) => {
		return deleteStudyHandler(request, reply);
	});

	// Files
	defineStreamRoute(app, { method: "GET", path: "/api/imaging/studies/:id/preview.svg", permission: "public", handler: ({ request, reply }) => previewSvgHandler(request, reply) });
	app.get("/api/imaging/studies/:id/file", { config: { tenantTxSelfManaged: true } }, fileStreamHandler);

	// Binding & Management
	app.post("/api/imaging/studies/:id/bind-patient", studiesMutationRouteOptions, async (request, reply) => {
		return bindPatientHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-patient", studiesMutationRouteOptions, async (request, reply) => {
		return bindPatientHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/bind-tooth", studiesMutationRouteOptions, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id/bind-tooth", studiesMutationRouteOptions, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-tooth", studiesMutationRouteOptions, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id/bind-tooth", studiesMutationRouteOptions, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/bind-visit", studiesMutationRouteOptions, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id/bind-visit", studiesMutationRouteOptions, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-visit", studiesMutationRouteOptions, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id/bind-visit", studiesMutationRouteOptions, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/unbind-patient", studiesMutationRouteOptions, async (request, reply) => {
		return unbindPatientHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/unbind-patient", studiesMutationRouteOptions, async (request, reply) => {
		return unbindPatientHandler(request, reply);
	});
	app.post("/api/imaging/studies/auto-bind-scan", studiesMutationRouteOptions, async (request, reply) => {
		return autoBindHandler(request, reply);
	});
	app.post("/api/radiology/studies/auto-bind-scan", studiesMutationRouteOptions, async (request, reply) => {
		return autoBindHandler(request, reply);
	});

	// CBCT Tuner
	defineStreamRoute(app, { method: "GET", path: "/api/cbct-tuner/patients", permission: "public", handler: ({ request, reply }) => cbctTunerPatientsHandler(request, reply) });
	defineStreamRoute(app, { method: "GET", path: "/api/cbct-tuner/volume-binary", permission: "public", handler: ({ request, reply }) => cbctTunerVolumeHandler(request, reply) });
}
