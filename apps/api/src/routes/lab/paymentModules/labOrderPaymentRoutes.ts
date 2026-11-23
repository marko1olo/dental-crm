import type { FastifyInstance } from "fastify";
import { labOrderMarkInstalledHandler } from "./labOrderMarkInstalledHandler.js";
import { labOrderPayHandler } from "./labOrderPayHandler.js";

const registeredLabPaymentApps = new WeakSet<FastifyInstance>();

export async function registerLabPaymentRoutes(app: FastifyInstance) {
	if (registeredLabPaymentApps.has(app)) {
		return;
	}
	registeredLabPaymentApps.add(app);

	// 1. Оплата наряда ЗТЛ из кассы по статье 11 («Оплата услуг лаборатории»)
	// Контекст: requireClinicalMutationContext / withTenantCtx (organizationId), Idempotency-Key (UUIDv7, RFC 9562)
	app.post("/api/lab-orders/:id/pay", {
		schema: {
			headers: {
				type: "object",
				description: "Оплата наряда ЗТЛ из кассы с изоляцией организации (organizationId) и заголовком Idempotency-Key",
			},
		},
	}, labOrderPayHandler);
	app.post("/api/lab/orders/:id/pay", {
		schema: {
			headers: {
				type: "object",
				description: "Оплата наряда ЗТЛ из кассы с изоляцией организации (organizationId) и заголовком Idempotency-Key",
			},
		},
	}, labOrderPayHandler);
	app.post("/api/clinical/lab-orders/:id/pay", {
		schema: {
			headers: {
				type: "object",
				description: "Оплата наряда ЗТЛ из кассы с изоляцией организации (organizationId) и заголовком Idempotency-Key",
			},
		},
	}, labOrderPayHandler);

	// 2. Сдача конструкции пациенту и намертво блокировка наряда (installed)
	// Контекст: withTenantCtx (organizationId), атомарная транзакция db.transaction (tx), Idempotency-Key
	app.post("/api/lab-orders/:id/mark-installed", {
		schema: {
			headers: {
				type: "object",
				description: "Сдача ортопедической конструкции пациенту с проверкой organizationId и Idempotency-Key",
			},
		},
	}, labOrderMarkInstalledHandler);
	app.post("/api/lab/orders/:id/mark-installed", {
		schema: {
			headers: {
				type: "object",
				description: "Сдача ортопедической конструкции пациенту с проверкой organizationId и Idempotency-Key",
			},
		},
	}, labOrderMarkInstalledHandler);
	app.post("/api/clinical/lab-orders/:id/mark-installed", {
		schema: {
			headers: {
				type: "object",
				description: "Сдача ортопедической конструкции пациенту с проверкой organizationId и Idempotency-Key",
			},
		},
	}, labOrderMarkInstalledHandler);
}

export const registerCashLabPaymentRoutes = registerLabPaymentRoutes;

