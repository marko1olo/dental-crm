import type { FastifyInstance } from "fastify";
import { handleApplyPlanItemsToVisit } from "./visitWorkOrderApplyPlanHandler.js";
import { handleCompleteVisitWorkOrder } from "./visitWorkOrderCompleteHandler.js";

export function registerVisitWorkOrderRoutes(app: FastifyInstance) {
	// Перенос согласованных услуг из плана лечения в наряд / протокол приёма (Feature #41, ЗоЗПП ст. 16, ПП РФ № 736)
	app.post("/api/visits/:visitId/apply-plan-items", handleApplyPlanItemsToVisit);

	// Атомарное завершение наряда приёма: списание материалов со склада и фиксация статуса визита
	app.post("/api/visits/:visitId/complete-work-order", handleCompleteVisitWorkOrder);
	app.post("/api/visits/:visitId/work-order/complete", handleCompleteVisitWorkOrder);
}
