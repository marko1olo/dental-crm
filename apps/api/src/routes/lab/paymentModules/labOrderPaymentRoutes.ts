import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { labOrderMarkInstalledHandler } from "./labOrderMarkInstalledHandler.js";
import { labOrderPayHandler } from "./labOrderPayHandler.js";

const registeredLabPaymentApps = new WeakSet<FastifyInstance>();

export async function registerLabPaymentRoutes(app: FastifyInstance) {
	if (registeredLabPaymentApps.has(app)) {
		return;
	}
	registeredLabPaymentApps.add(app);

	const paySchema = {
		headers: {
			type: "object",
			description: "Оплата наряда ЗТЛ из кассы с изоляцией организации (organizationId) и заголовком Idempotency-Key",
		},
	} as const;
	const markInstalledSchema = {
		headers: {
			type: "object",
			description: "Сдача ортопедической конструкции пациенту с проверкой organizationId и Idempotency-Key",
		},
	} as const;

	// 1. Оплата наряда ЗТЛ из кассы по статье 11 («Оплата услуг лаборатории»)
	// Контекст: requireClinicalMutationContext / withTenantWriteCtx (organizationId), Idempotency-Key (UUIDv7, RFC 9562)
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab-orders/:id/pay",
		permission: "public",
		schema: paySchema,
		handler: async ({ request, reply }) => labOrderPayHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders/:id/pay",
		permission: "public",
		schema: paySchema,
		handler: async ({ request, reply }) => labOrderPayHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/lab-orders/:id/pay",
		permission: "public",
		schema: paySchema,
		handler: async ({ request, reply }) => labOrderPayHandler(request, reply),
	});

	// 2. Сдача конструкции пациенту и намертво блокировка наряда (installed)
	// Контекст: withTenantWriteCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab-orders/:id/mark-installed",
		permission: "public",
		schema: markInstalledSchema,
		handler: async ({ request, reply }) => labOrderMarkInstalledHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders/:id/mark-installed",
		permission: "public",
		schema: markInstalledSchema,
		handler: async ({ request, reply }) => labOrderMarkInstalledHandler(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/clinical/lab-orders/:id/mark-installed",
		permission: "public",
		schema: markInstalledSchema,
		handler: async ({ request, reply }) => labOrderMarkInstalledHandler(request, reply),
	});
}

export const registerCashLabPaymentRoutes = registerLabPaymentRoutes;

