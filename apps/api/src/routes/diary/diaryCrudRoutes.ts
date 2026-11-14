import type { FastifyInstance } from "fastify";
import { handleDiaryVisitGet } from "./crud/diaryVisitGetHandler.js";
import { handleDiaryUpsertPost } from "./crud/diaryUpsertHandler.js";

export async function registerDiaryCrudRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/diaries/visit/:visitId", handleDiaryVisitGet);
	app.post("/api/diaries", handleDiaryUpsertPost);
}
