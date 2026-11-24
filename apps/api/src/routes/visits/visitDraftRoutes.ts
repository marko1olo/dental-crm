import type { FastifyInstance } from "fastify";
import { handleAcceptVisitDraft } from "./visitDraftAcceptHandler.js";
import {
	handleGetVisitDraft,
	handlePutVisitDraft,
} from "./visitDraftAutosaveHandler.js";
import { handleCompleteVisit } from "./visitDraftCompleteHandler.js";
import { registerVisitHygieneRoutes } from "./visitHygieneRoutes.js";
import { registerVisitPerioRoutes } from "./visitPerioRoutes.js";

const visitMutationRouteOptions = {
	schema: {
		description:
			"Visit mutation with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
				"organizationid": { type: "string" },
				"x-organization-id": { type: "string" },
			},
		},
	},
};

export function registerVisitDraftRoutes(app: FastifyInstance) {
	app.get("/api/visits/:visitId/draft/autosave", handleGetVisitDraft);
	app.get("/api/v1/visits/:visitId/diary", handleGetVisitDraft);
	app.get("/api/visits/:visitId/emk", handleGetVisitDraft);

	app.put("/api/visits/:visitId/draft/autosave", visitMutationRouteOptions, handlePutVisitDraft);
	app.post("/api/visits/:visitId/draft/autosave", visitMutationRouteOptions, handlePutVisitDraft);
	app.put("/api/v1/visits/:visitId/diary", visitMutationRouteOptions, handlePutVisitDraft);
	app.post("/api/v1/visits/:visitId/diary", visitMutationRouteOptions, handlePutVisitDraft);
	app.put("/api/visits/:visitId/emk", visitMutationRouteOptions, handlePutVisitDraft);
	app.post("/api/visits/:visitId/emk", visitMutationRouteOptions, handlePutVisitDraft);

	app.post("/api/visits/:visitId/draft/accept", visitMutationRouteOptions, handleAcceptVisitDraft);

	app.post("/api/visits/:visitId/complete", visitMutationRouteOptions, handleCompleteVisit);
	app.post("/api/v1/visits/:visitId/complete", visitMutationRouteOptions, handleCompleteVisit);

	registerVisitHygieneRoutes(app);
	registerVisitPerioRoutes(app);
}
