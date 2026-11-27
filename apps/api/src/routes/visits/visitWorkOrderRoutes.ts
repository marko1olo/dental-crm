import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleApplyPlanItemsToVisit } from "./visitWorkOrderApplyPlanHandler.js";
import { handleCompleteVisitWorkOrder } from "./visitWorkOrderCompleteHandler.js";

const workOrderParamsSchema = {
	type: "object",
	required: ["visitId"],
	properties: {
		visitId: { type: "string" },
	},
};

const workOrderRouteSchema: Record<string, unknown> = {
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
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/visits/:visitId/apply-plan-items",
		permission: "public",
		schema: workOrderRouteSchema,
		handler: async ({ request, reply }) => handleApplyPlanItemsToVisit(request, reply),
	});

	// Атомарное завершение наряда приёма: списание материалов со склада и фиксация статуса визита
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/visits/:visitId/complete-work-order",
		permission: "public",
		schema: workOrderRouteSchema,
		handler: async ({ request, reply }) => handleCompleteVisitWorkOrder(request, reply),
	});
}
