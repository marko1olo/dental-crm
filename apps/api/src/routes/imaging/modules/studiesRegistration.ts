import type { FastifyInstance } from "fastify";
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

	const studiesMutationSchema = {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	};

	// Viewer Session
	app.get("/api/imaging/studies/:id/viewer-session", getViewerSessionHandler);
	app.get("/api/radiology/studies/:id/viewer-session", getViewerSessionHandler);
	app.put("/api/imaging/studies/:id/viewer-session", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return putViewerSessionHandler(request, reply);
	});
	app.put("/api/radiology/studies/:id/viewer-session", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return putViewerSessionHandler(request, reply);
	});

	// Measurements
	app.get("/api/imaging/studies/:id/measurements", getMeasurementsHandler);
	app.get("/api/radiology/studies/:id/measurements", getMeasurementsHandler);
	app.put("/api/imaging/studies/:id/measurements", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});
	app.put("/api/radiology/studies/:id/measurements", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/measurements", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/measurements", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return saveMeasurementsHandler(request, reply);
	});

	// CRUD
	app.post("/api/imaging/studies", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.post("/api/radiology/studies", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.post("/api/patients/:patientId/studies", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.post("/api/patients/:patientId/radiology/studies", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return createStudyHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return updateStudyHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return updateStudyHandler(request, reply);
	});
	app.delete("/api/imaging/studies/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return deleteStudyHandler(request, reply);
	});
	app.delete("/api/radiology/studies/:id", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return deleteStudyHandler(request, reply);
	});

	// Files
	app.get("/api/imaging/studies/:id/preview.svg", previewSvgHandler);
	app.get("/api/imaging/studies/:id/file", { config: { tenantTxSelfManaged: true } }, fileStreamHandler);

	// Binding & Management
	app.post("/api/imaging/studies/:id/bind-patient", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindPatientHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-patient", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindPatientHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/bind-tooth", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id/bind-tooth", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-tooth", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id/bind-tooth", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindToothHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/bind-visit", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.patch("/api/imaging/studies/:id/bind-visit", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/bind-visit", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.patch("/api/radiology/studies/:id/bind-visit", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return bindVisitHandler(request, reply);
	});
	app.post("/api/imaging/studies/:id/unbind-patient", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return unbindPatientHandler(request, reply);
	});
	app.post("/api/radiology/studies/:id/unbind-patient", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return unbindPatientHandler(request, reply);
	});
	app.post("/api/imaging/studies/auto-bind-scan", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return autoBindHandler(request, reply);
	});
	app.post("/api/radiology/studies/auto-bind-scan", {
		schema: {
			headers: {
				type: "object",
				description: "Исследования: проверка organizationId и заголовок Idempotency-Key",
			},
		},
	}, async (request, reply) => {
		return autoBindHandler(request, reply);
	});

	// CBCT Tuner
	app.get("/api/cbct-tuner/patients", cbctTunerPatientsHandler);
	app.get("/api/cbct-tuner/volume-binary", cbctTunerVolumeHandler);

	// Legacy /api/xray/* Backwards-Compatibility Routes
	await registerXrayLegacyCompatRoutes(app);
}
