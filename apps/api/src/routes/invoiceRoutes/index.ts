/**
 * DENTE Dental CRM — Invoices & Work Order Billing Routes Coordinator (Feature #41).
 */

import type { FastifyInstance } from "fastify";
import { registerInvoiceCrudRoutes } from "./invoiceCrudHandlers.js";
import { registerInvoiceBillingAndValidationRoutes } from "./invoicePaymentAndRefundHandlers.js";

export * from "./invoiceCalculationHelpers.js";
export * from "./invoiceCrudHandlers.js";
export * from "./invoicePaymentAndRefundHandlers.js";
export * from "./types.js";

export async function registerInvoiceRoutes(app: FastifyInstance) {
	await registerInvoiceBillingAndValidationRoutes(app);
	await registerInvoiceCrudRoutes(app);
}
