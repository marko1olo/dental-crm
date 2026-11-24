/**
 * DENTE Dental CRM — Invoices & Work Order Billing Routes Coordinator (Feature #41).
 */

import type { FastifyInstance } from "fastify";
import { handleGenerateInvoiceFromPlan } from "./handlers/generateInvoiceHandler.js";
import { handleValidatePlan } from "./handlers/validatePlanHandler.js";
import { registerInvoiceCrudRoutes } from "./invoiceCrudHandlers.js";

export * from "./invoiceCalculationHelpers.js";
export * from "./invoiceCrudHandlers.js";
export { handleValidatePlan, handleGenerateInvoiceFromPlan };
export * from "./types.js";

export async function registerInvoiceRoutes(app: FastifyInstance) {
	app.post("/api/invoices/validate-plan", handleValidatePlan);
	app.post("/api/invoices/generate-from-plan", handleGenerateInvoiceFromPlan);
	await registerInvoiceCrudRoutes(app);
}
