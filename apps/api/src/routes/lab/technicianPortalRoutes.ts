import type { FastifyInstance } from "fastify";
import {
	handleGetPortalOrder,
	handlePostPortalOrderPhoto,
} from "./portalModules/technicianPortalGetAndPhotoHandlers.js";
import { handlePostPortalOrderStatus } from "./portalModules/technicianPortalStatusHandler.js";

export async function registerTechnicianPortalRoutes(app: FastifyInstance) {
	// ─── Канонический маршрут портала наряда лаборатории (SSOT) ───
	app.get("/api/portal/lab-order/:token", handleGetPortalOrder);

	// POST: Обновление статуса наряда лабораторией по токену
	// Контекст: withTenantCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	app.post("/api/portal/lab-order/:token/status", {
		schema: {
			headers: {
				type: "object",
				description: "Обновление статуса наряда ЗТЛ зубным техником с проверкой organizationId и Idempotency-Key",
			},
		},
	}, handlePostPortalOrderStatus);

	// POST: Загрузка фото готовой конструкции по токену
	// Контекст: withTenantCtx (organizationId), Idempotency-Key
	app.post("/api/portal/lab-order/:token/photo", {
		schema: {
			headers: {
				type: "object",
				description: "Прикрепление фото конструкции ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
	}, handlePostPortalOrderPhoto);
}
