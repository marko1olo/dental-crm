/**
 * DENTE Dental CRM — Invoices & Work Order Billing Routes Facade (Feature #41).
 *
 * Implements:
 * 1. POST /api/invoices/validate-plan: Price lock & obsolete service validation before billing.
 * 2. POST /api/invoices/generate-from-plan: Atomic invoice generation with price lock guarantees.
 * 3. GET /api/invoices: List invoices.
 * 4. GET /api/invoices/:id: Get invoice details.
 */

export * from "./invoiceRoutes/index.js";
