import type { FastifyInstance } from "fastify";
import {
	handleGetPortalOrder,
	handlePostPortalOrderPhoto,
} from "./portalModules/technicianPortalGetAndPhotoHandlers.js";
import { handlePostPortalOrderStatus } from "./portalModules/technicianPortalStatusHandler.js";

export async function registerTechnicianPortalRoutes(app: FastifyInstance) {
	// ─── Канонические маршруты и алиасы портала ЗТЛ ───
	app.get("/api/portal/lab-order/:token", handleGetPortalOrder);
	app.get("/api/lab/portal/:token", handleGetPortalOrder);

	app.post("/api/portal/lab-order/:token/status", handlePostPortalOrderStatus);
	app.post("/api/lab/portal/:token/status", handlePostPortalOrderStatus);

	app.post("/api/portal/lab-order/:token/photo", handlePostPortalOrderPhoto);
	app.post("/api/lab/portal/:token/photo", handlePostPortalOrderPhoto);
}
