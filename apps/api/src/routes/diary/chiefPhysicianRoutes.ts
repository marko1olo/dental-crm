import type { FastifyInstance } from "fastify";
import { handleChiefReviewPost } from "./chiefReview/chiefReviewPostHandler.js";
import { handleChiefReviewsGet } from "./chiefReview/chiefReviewsGetHandler.js";

export function registerChiefPhysicianRoutes(app: FastifyInstance): void {
	app.post("/api/diary/:id/chief-review", handleChiefReviewPost);
	app.post("/api/diaries/:id/chief-review", handleChiefReviewPost);
	app.get("/api/diary/:id/chief-reviews", handleChiefReviewsGet);
	app.get("/api/diaries/:id/chief-reviews", handleChiefReviewsGet);
}
