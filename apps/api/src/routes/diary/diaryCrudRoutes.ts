import type { FastifyInstance } from "fastify";
import { handleDiaryVisitGet } from "./crud/diaryVisitGetHandler.js";
import { registerDiaryUpsertRoute } from "./crud/diaryUpsertHandler.js";

export async function registerDiaryCrudRoutes(app: FastifyInstance): Promise<void> {
	app.get(
		"/api/diaries/visit/:visitId",
		{ config: { tenantTxSelfManaged: true } },
		handleDiaryVisitGet,
	);
	registerDiaryUpsertRoute(app);
}
