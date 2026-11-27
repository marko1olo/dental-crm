import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
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

const billingPaymentMutationSchema = {
	description:
		"Billing payment mutation endpoint with mandatory RFC 9562 Idempotency-Key and organizationId tenant isolation",
	headers: {
		type: "object",
		properties: {
			"idempotency-key": { type: "string" },
			"x-idempotency-key": { type: "string" },
		},
	},
};

export async function registerBillingRoutes(app: FastifyInstance): Promise<void> {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/billing/payments",
		permission: "public",
		handler: async ({ request, reply }) => handleGetBillingPayments(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/payments",
		permission: "public",
		handler: async ({ request, reply }) => handleGetBillingPayments(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/billing/invoices",
		permission: "public",
		handler: async ({ request, reply }) => handleGetBillingInvoices(request, reply),
	});

	for (const path of [
		"/api/billing/payments",
		"/api/payments",
		"/api/finance/payments",
		"/api/v1/billing/payments",
		"/api/v1/finance/payments",
	]) {
		defineStreamRoute(app, {
			method: "POST",
			path,
			permission: "public",
			schema: billingPaymentMutationSchema,
			handler: async ({ request, reply }) => handleCreatePayment(request, reply),
		});
	}

	for (const path of [
		"/api/billing/invoices/:id/payments",
		"/api/invoices/:id/pay",
		"/api/v1/invoices/:id/pay",
		"/api/invoices/:id/payments",
		"/api/v1/billing/invoices/:id/payments",
	]) {
		defineStreamRoute(app, {
			method: "POST",
			path,
			permission: "public",
			schema: billingPaymentMutationSchema,
			handler: async ({ request, reply }) =>
				invoicePayHandler(
					request as FastifyRequest<{
						Params: { id: string };
						Body: Record<string, unknown>;
					}>,
					reply,
				),
		});
	}

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/billing/refunds/partial",
		permission: "public",
		schema: billingPaymentMutationSchema,
		handler: async ({ request, reply }) => handleCashRefund(request, reply),
	});
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/billing/fiscal-queue/pending",
		permission: "public",
		handler: async ({ request, reply }) => handleFiscalQueueList(request, reply),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/billing/fiscal-queue/:id/retry",
		permission: "public",
		schema: billingPaymentMutationSchema,
		handler: async ({ request, reply }) =>
			handleFiscalQueueRetry(
				request as FastifyRequest<{ Params: { id: string } }>,
				reply,
			),
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/billing/fiscal-queue/retry-all",
		permission: "public",
		schema: billingPaymentMutationSchema,
		handler: async ({ request, reply }) => handleFiscalQueueRetryAll(request, reply),
	});
}
