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

const applyPlanItemsSchema = {
	params: workOrderParamsSchema,
	body: {
		type: "object",
		required: ["planId", "itemIds"],
		properties: {
			planId: { type: "string" },
			itemIds: {
				type: "array",
				items: { type: "string" },
				minItems: 1,
			},
			idempotencyKey: { type: "string" },
		},
	},
};

const completeWorkOrderSchema = {
	params: workOrderParamsSchema,
	body: {
		type: "object",
		properties: {
			status: {
				type: "string",
				enum: ["signed", "draft", "voided", "completed", "in_progress"],
			},
			idempotencyKey: { type: "string" },
		},
	},
};

export function registerVisitWorkOrderRoutes(app: FastifyInstance) {
	// Перенос согласованных услуг из плана лечения в наряд / протокол приёма (Feature #41, ЗоЗПП ст. 16, ПП РФ № 736)
	app.post(
		"/api/visits/:visitId/apply-plan-items",
		{ schema: applyPlanItemsSchema },
		handleApplyPlanItemsToVisit,
	);

	// Атомарное завершение наряда приёма: списание материалов со склада и фиксация статуса визита
	app.post(
		"/api/visits/:visitId/complete-work-order",
		{ schema: completeWorkOrderSchema },
		handleCompleteVisitWorkOrder,
	);
	app.post(
		"/api/visits/:visitId/work-order/complete",
		{ schema: completeWorkOrderSchema },
		handleCompleteVisitWorkOrder,
	);
}
