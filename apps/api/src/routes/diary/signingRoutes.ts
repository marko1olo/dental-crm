import type { FastifyInstance } from "fastify";
import { handleDiaryLockPost } from "./signing/diaryLockHandler.js";

export { registerSigningRoutes as registerDiarySigningRoutes };
export async function registerSigningRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/diaries/:id/lock", handleDiaryLockPost);
}
