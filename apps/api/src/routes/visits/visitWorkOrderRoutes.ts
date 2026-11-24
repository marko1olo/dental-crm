import type { FastifyInstance } from "fastify";
import { handleApplyPlanItemsToVisit } from "./visitWorkOrderApplyPlanHandler.js";
import { handleCompleteVisitWorkOrder } from "./visitWorkOrderCompleteHandler.js";

const workOrderParamsSchema = {
	type: "object",
	required: ["visitId"],
	properties: {
		visitId: { type: "string" },
	},
};

const workOrderRouteSchema = {
	params: workOrderParamsSchema,
	headers: {
		type: "object",
		properties: {
			"idempotency-key": { type: "string" },
			"x-idempotency-key": { type: "string" },
			organizationid: { type: "string" },
			"x-organization-id": { type: "string" },
		},
	},
};

export function registerVisitWorkOrderRoutes(app: FastifyInstance) {
	// Перенос согласованных услуг из плана лечения в наряд / протокол приёма
	app.post(
		"/api/visits/:visitId/apply-plan-items",
		{ schema: workOrderRouteSchema },
		handleApplyPlanItemsToVisit,
	);

	// Атомарное завершение наряда приёма: списание материалов со склада и фиксация статуса визита
	app.post(
		"/api/visits/:visitId/complete-work-order",
		{ schema: workOrderRouteSchema },
		handleCompleteVisitWorkOrder,
	);
	app.post(
		"/api/visits/:visitId/work-order/complete",
		{ schema: workOrderRouteSchema },
		handleCompleteVisitWorkOrder,
	);
}
