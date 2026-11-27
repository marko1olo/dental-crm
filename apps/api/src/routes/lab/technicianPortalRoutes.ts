import type { FastifyInstance } from "fastify";
import { definePublicRoute } from "../../core/routeFactories.js";
import {
	handleGetPortalOrder,
	handlePostPortalOrderPhoto,
} from "./portalModules/technicianPortalGetAndPhotoHandlers.js";
import { handlePostPortalOrderStatus } from "./portalModules/technicianPortalStatusHandler.js";

export async function registerTechnicianPortalRoutes(app: FastifyInstance) {
	// ─── Канонический маршрут портала наряда лаборатории (SSOT) ───
	definePublicRoute(app, {
		method: "GET",
		path: "/api/portal/lab-order/:token",
		handler: async ({ request, reply }) => handleGetPortalOrder(request, reply),
	});

	// POST: Обновление статуса наряда лабораторией по токену
	// Контекст: withTenantWriteCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	definePublicRoute(app, {
		method: "POST",
		path: "/api/portal/lab-order/:token/status",
		schema: {
			headers: {
				type: "object",
				description: "Обновление статуса наряда ЗТЛ зубным техником с проверкой organizationId и Idempotency-Key",
			},
		},
		handler: async ({ request, reply }) => handlePostPortalOrderStatus(request, reply),
	});

	// POST: Загрузка фото готовой конструкции по токену
	// Контекст: withTenantWriteCtx (organizationId), Idempotency-Key
	definePublicRoute(app, {
		method: "POST",
		path: "/api/portal/lab-order/:token/photo",
		schema: {
			headers: {
				type: "object",
				description: "Прикрепление фото конструкции ЗТЛ с проверкой organizationId и Idempotency-Key",
			},
		},
		handler: async ({ request, reply }) => handlePostPortalOrderPhoto(request, reply),
	});
}
