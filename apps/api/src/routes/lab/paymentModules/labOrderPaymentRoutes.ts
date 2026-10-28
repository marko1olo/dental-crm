import type { FastifyInstance } from "fastify";
import { labOrderMarkInstalledHandler } from "./labOrderMarkInstalledHandler.js";
import { labOrderPayHandler } from "./labOrderPayHandler.js";

export async function registerLabPaymentRoutes(app: FastifyInstance) {
	if ((app as any).__cashLabPaymentRoutesRegistered) {
		return;
	}
	(app as any).__cashLabPaymentRoutesRegistered = true;

	// 1. Оплата наряда ЗТЛ из кассы по статье 11 («Оплата услуг лаборатории»)
	app.post("/api/lab-orders/:id/pay", labOrderPayHandler);
	app.post("/api/clinical/lab-orders/:id/pay", labOrderPayHandler);

	// 2. Сдача конструкции пациенту и намертво блокировка наряда (installed)
	app.post("/api/lab-orders/:id/mark-installed", labOrderMarkInstalledHandler);
	app.post("/api/clinical/lab-orders/:id/mark-installed", labOrderMarkInstalledHandler);
}

export const registerCashLabPaymentRoutes = registerLabPaymentRoutes;
