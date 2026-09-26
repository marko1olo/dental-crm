import type { FastifyInstance } from "fastify";
import { registerVisitQuickRoutes } from "./visits/visitQuickRoutes.js";
import { registerVisitOpenRoutes } from "./visits/visitOpenRoutes.js";
import { registerVisitDraftRoutes } from "./visits/visitDraftRoutes.js";
import { registerVisitQualityRoutes } from "./visits/visitQualityRoutes.js";
import { registerVisitWorkOrderRoutes } from "./visits/visitWorkOrderRoutes.js";

export * from "./visits/visitErrors.js";
export * from "./visits/visitQuickRoutes.js";
export * from "./visits/visitOpenRoutes.js";
export * from "./visits/visitDraftRoutes.js";
export * from "./visits/visitQualityRoutes.js";
export * from "./visits/visitWorkOrderRoutes.js";

/**
 * Регистрация всех маршрутов домена визитов клиники (EMK 043/у, черновики, подписания, наряды, контроль качества)
 */
export async function registerVisitRoutes(app: FastifyInstance) {
	registerVisitQuickRoutes(app);
	registerVisitOpenRoutes(app);
	registerVisitDraftRoutes(app);
	registerVisitQualityRoutes(app);
	registerVisitWorkOrderRoutes(app);
}
