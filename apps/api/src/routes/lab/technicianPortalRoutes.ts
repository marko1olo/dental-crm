import type { FastifyInstance } from "fastify";
import {
	handleGetPortalOrder,
	handlePostPortalOrderPhoto,
} from "./portalModules/technicianPortalGetAndPhotoHandlers.js";
import { handlePostPortalOrderStatus } from "./portalModules/technicianPortalStatusHandler.js";

export async function registerTechnicianPortalRoutes(app: FastifyInstance) {
	// ─── Канонический маршрут портала наряда лаборатории (SSOT) ───
	app.get("/api/portal/lab-order/:token", handleGetPortalOrder);
	app.post("/api/portal/lab-order/:token/status", handlePostPortalOrderStatus);
	app.post("/api/portal/lab-order/:token/photo", handlePostPortalOrderPhoto);
}
