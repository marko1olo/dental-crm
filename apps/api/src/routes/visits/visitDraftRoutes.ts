import type { FastifyInstance } from "fastify";
import { handleAcceptVisitDraft } from "./visitDraftAcceptHandler.js";
import {
	handleGetVisitDraft,
	handlePutVisitDraft,
} from "./visitDraftAutosaveHandler.js";
import { handleCompleteVisit } from "./visitDraftCompleteHandler.js";
import { registerVisitHygieneRoutes } from "./visitHygieneRoutes.js";
import { registerVisitPerioRoutes } from "./visitPerioRoutes.js";

export function registerVisitDraftRoutes(app: FastifyInstance) {
	app.get("/api/visits/:visitId/draft/autosave", handleGetVisitDraft);
	app.get("/api/v1/visits/:visitId/diary", handleGetVisitDraft);

	app.put("/api/visits/:visitId/draft/autosave", handlePutVisitDraft);
	app.post("/api/visits/:visitId/draft/autosave", handlePutVisitDraft);
	app.put("/api/v1/visits/:visitId/diary", handlePutVisitDraft);
	app.post("/api/v1/visits/:visitId/diary", handlePutVisitDraft);

	app.post("/api/visits/:visitId/draft/accept", handleAcceptVisitDraft);

	app.post("/api/visits/:visitId/complete", handleCompleteVisit);
	app.post("/api/v1/visits/:visitId/complete", handleCompleteVisit);

	registerVisitHygieneRoutes(app);
	registerVisitPerioRoutes(app);
}
