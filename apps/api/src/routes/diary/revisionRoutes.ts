import type { FastifyInstance } from "fastify";
import { handleDiaryRevisionsGet } from "./revisions/diaryRevisionsGetHandler.js";
import { handleDiaryRevisePost } from "./revisions/diaryReviseHandler.js";

export function registerDiaryRevisionRoutes(app: FastifyInstance): void {
	app.get("/api/diaries/:id/revisions", handleDiaryRevisionsGet);
	app.post("/api/diaries/:id/revise", handleDiaryRevisePost);
}
