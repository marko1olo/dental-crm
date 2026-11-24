import type { FastifyInstance } from "fastify";
import { handleCashRefund } from "../cashbox/cashboxRefundRoutes.js";
import {
	handleFiscalQueueList,
	handleFiscalQueueRetry,
	handleFiscalQueueRetryAll,
} from "../fiscal/receiptRoutes/index.js";
import { handleGetBillingInvoices } from "./handlers/billingInvoicesHandler.js";
import { handleGetBillingPayments } from "./handlers/billingPaymentsHandler.js";
import { invoicePayHandler } from "./handlers/invoicePayWrapper.js";
import { handleCreatePayment } from "./handlers/paymentCreateHandler.js";

export {
	handleCreatePayment,
	handleCashRefund as handlePartialRefund,
	handleFiscalQueueList as handleGetFiscalQueuePending,
	handleFiscalQueueRetry as handleRetryFiscalQueueItem,
	handleFiscalQueueRetryAll as handleRetryAllFiscalQueue,
	handleGetBillingPayments,
	handleGetBillingInvoices,
};

const billingPaymentMutationOptions = {
	schema: {
		description:
			"Billing payment mutation endpoint with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				"x-idempotency-key": { type: "string" },
			},
		},
	},
};

export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
	app.get("/api/billing/payments", handleGetBillingPayments);
	app.get("/api/payments", handleGetBillingPayments);
	app.get("/api/billing/invoices", handleGetBillingInvoices);

	app.post("/api/billing/payments", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleCreatePayment(request, reply);
	});
	app.post("/api/payments", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleCreatePayment(request, reply);
	});
	app.post("/api/finance/payments", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleCreatePayment(request, reply);
	});
	app.post("/api/v1/billing/payments", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleCreatePayment(request, reply);
	});
	app.post("/api/v1/finance/payments", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleCreatePayment(request, reply);
	});

	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/billing/invoices/:id/payments",
		billingPaymentMutationOptions,
		async (request, reply) => {
			// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
			return invoicePayHandler(request, reply);
		},
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/invoices/:id/pay",
		billingPaymentMutationOptions,
		async (request, reply) => {
			// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
			return invoicePayHandler(request, reply);
		},
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/v1/invoices/:id/pay",
		billingPaymentMutationOptions,
		async (request, reply) => {
			// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
			return invoicePayHandler(request, reply);
		},
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/invoices/:id/payments",
		billingPaymentMutationOptions,
		async (request, reply) => {
			// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
			return invoicePayHandler(request, reply);
		},
	);
	app.post<{ Params: { id: string }; Body: Record<string, unknown> }>(
		"/api/v1/billing/invoices/:id/payments",
		billingPaymentMutationOptions,
		async (request, reply) => {
			// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
			return invoicePayHandler(request, reply);
		},
	);

	app.post("/api/billing/refunds/partial", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleCashRefund(request, reply);
	});
	app.get("/api/billing/fiscal-queue/pending", handleFiscalQueueList);
	app.post("/api/billing/fiscal-queue/:id/retry", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleFiscalQueueRetry(request, reply);
	});
	app.post("/api/billing/fiscal-queue/retry-all", billingPaymentMutationOptions, async (request, reply) => {
		// Mandatory Idempotency-Key & organizationId tenant isolation under withTenantCtx db.transaction
		return handleFiscalQueueRetryAll(request, reply);
	});
}
