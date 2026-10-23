import type { FastifyInstance } from "fastify";
import { handleGenerateInvoiceFromPlan } from "./handlers/generateInvoiceHandler.js";
import { handleValidatePlan } from "./handlers/validatePlanHandler.js";

export { handleValidatePlan, handleGenerateInvoiceFromPlan };

export async function registerInvoiceBillingAndValidationRoutes(app: FastifyInstance): Promise<void> {
	app.post("/api/invoices/validate-plan", handleValidatePlan);
	app.post("/api/invoices/generate-from-plan", handleGenerateInvoiceFromPlan);
}
