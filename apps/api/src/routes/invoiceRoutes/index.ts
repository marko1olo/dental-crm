/**
 * DENTE Dental CRM — Invoices & Work Order Billing Routes Coordinator (Feature #41).
 */

import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleGenerateInvoiceFromPlan } from "./handlers/generateInvoiceHandler.js";
import { handleValidatePlan } from "./handlers/validatePlanHandler.js";
import { registerInvoiceCrudRoutes } from "./invoiceCrudHandlers.js";

export * from "./invoiceCalculationHelpers.js";
export * from "./invoiceCrudHandlers.js";
export { handleValidatePlan, handleGenerateInvoiceFromPlan };
export * from "./types.js";

export async function registerInvoiceRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/invoices/validate-plan",
		permission: "public",
		handler: async ({ request, reply }) => handleValidatePlan(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/invoices/generate-from-plan",
		permission: "public",
		handler: async ({ request, reply }) => handleGenerateInvoiceFromPlan(request, reply),
	});
	await registerInvoiceCrudRoutes(app);
}
