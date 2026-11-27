import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleAcceptVisitDraft } from "./visitDraftAcceptHandler.js";
import {
	handleGetVisitDraft,
	handlePutVisitDraft,
} from "./visitDraftAutosaveHandler.js";
import { handleCompleteVisit } from "./visitDraftCompleteHandler.js";
import { registerVisitHygieneRoutes } from "./visitHygieneRoutes.js";
import { registerVisitPerioRoutes } from "./visitPerioRoutes.js";

const visitMutationRouteSchema: Record<string, unknown> = {
	description:
		"Visit mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
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

export function registerVisitDraftRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/visits/:visitId/draft/autosave",
		permission: "public",
		handler: async ({ request, reply }) => handleGetVisitDraft(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/v1/visits/:visitId/diary",
		permission: "public",
		handler: async ({ request, reply }) => handleGetVisitDraft(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/visits/:visitId/emk",
		permission: "public",
		handler: async ({ request, reply }) => handleGetVisitDraft(request, reply),
	});

	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/visits/:visitId/draft/autosave",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handlePutVisitDraft(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/visits/:visitId/draft/autosave",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handlePutVisitDraft(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/v1/visits/:visitId/diary",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handlePutVisitDraft(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/v1/visits/:visitId/diary",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handlePutVisitDraft(request, reply),
	});
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/visits/:visitId/emk",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handlePutVisitDraft(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/visits/:visitId/emk",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handlePutVisitDraft(request, reply),
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/visits/:visitId/draft/accept",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handleAcceptVisitDraft(request, reply),
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/visits/:visitId/complete",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handleCompleteVisit(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/v1/visits/:visitId/complete",
		permission: "public",
		schema: visitMutationRouteSchema,
		handler: async ({ request, reply }) => handleCompleteVisit(request, reply),
	});

	registerVisitHygieneRoutes(app);
	registerVisitPerioRoutes(app);
}
