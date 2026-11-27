import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleDiaryVisitGet } from "./crud/diaryVisitGetHandler.js";
import { registerDiaryUpsertRoute } from "./crud/diaryUpsertHandler.js";

export async function registerDiaryCrudRoutes(app: FastifyInstance): Promise<void> {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/diaries/visit/:visitId",
		permission: "public",
		handler: async ({ request, reply }) => handleDiaryVisitGet(request, reply),
	});
	registerDiaryUpsertRoute(app);
}
