import type { FastifyInstance } from "fastify";
import { handleGetBillingInvoices } from "./handlers/billingInvoicesHandler.js";
import { handleGetBillingPayments } from "./handlers/billingPaymentsHandler.js";
import { handleGetFiscalQueuePending } from "./handlers/fiscalQueueQueryHandler.js";
import { handleRetryAllFiscalQueue } from "./handlers/fiscalQueueRetryAllHandler.js";
import { handleRetryFiscalQueueItem } from "./handlers/fiscalQueueRetryItemHandler.js";
import { invoicePayHandler } from "./handlers/invoicePayWrapper.js";
import { handleCreatePayment } from "./handlers/paymentCreateHandler.js";
import { handleGetPayouts } from "./handlers/payoutsHandler.js";
import { handlePartialRefund } from "./handlers/refundReceiptHandler.js";

export {
	handleGetPayouts,
	handleCreatePayment,
	handlePartialRefund,
	handleGetFiscalQueuePending,
	handleRetryFiscalQueueItem,
	handleRetryAllFiscalQueue,
	handleGetBillingPayments,
	handleGetBillingInvoices,
};

export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/billing/payouts", handleGetPayouts);
	app.get("/api/billing/payments", handleGetBillingPayments);
	app.get("/api/payments", handleGetBillingPayments);
	app.get("/api/billing/invoices", handleGetBillingInvoices);
	app.post("/api/billing/payments", handleCreatePayment);
	app.post("/api/payments", handleCreatePayment);
	app.post("/api/finance/payments", handleCreatePayment);
	app.post("/api/v1/billing/payments", handleCreatePayment);
	app.post("/api/v1/finance/payments", handleCreatePayment);

	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/billing/invoices/:id/payments",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/invoices/:id/pay",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/v1/invoices/:id/pay",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/invoices/:id/payments",
		invoicePayHandler,
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/v1/billing/invoices/:id/payments",
		invoicePayHandler,
	);

	app.post("/api/billing/refunds/partial", handlePartialRefund);
	app.get("/api/billing/fiscal-queue/pending", handleGetFiscalQueuePending);
	app.post("/api/billing/fiscal-queue/:id/retry", handleRetryFiscalQueueItem);
	app.post("/api/billing/fiscal-queue/retry-all", handleRetryAllFiscalQueue);
}
