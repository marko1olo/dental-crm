import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleDiaryRevisionsGet } from "./revisions/diaryRevisionsGetHandler.js";
import { handleDiaryRevisePost } from "./revisions/diaryReviseHandler.js";

export function registerDiaryRevisionRoutes(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/diaries/:id/revisions",
		permission: "public",
		handler: async ({ request, reply }) => handleDiaryRevisionsGet(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/diaries/:id/revise",
		permission: "public",
		handler: async ({ request, reply }) => handleDiaryRevisePost(request, reply),
	});
}
