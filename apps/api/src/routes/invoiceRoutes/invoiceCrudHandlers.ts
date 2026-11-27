import type { FastifyInstance } from "fastify";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { handleCreateInvoice } from "./handlers/createInvoiceHandler.js";
import { handleGetInvoiceById } from "./handlers/getInvoiceByIdHandler.js";
import { handleListInvoices } from "./handlers/listInvoicesHandler.js";
import { handlePendingInvoices } from "./handlers/pendingInvoicesHandler.js";

export {
	handleCreateInvoice,
	handleListInvoices,
	handlePendingInvoices,
	handleGetInvoiceById,
};

export async function registerInvoiceCrudRoutes(app: FastifyInstance): Promise<void> {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/invoices/pending",
		permission: "public",
		handler: async ({ request, reply }) => handlePendingInvoices(request, reply),
	});

	for (const path of ["/api/invoices", "/api/v1/billing/invoices"]) {
		defineStreamRoute(app, {
			method: "GET",
			path,
			permission: "public",
			handler: async ({ request, reply }) => handleListInvoices(request, reply),
		});
	}

	for (const path of [
		"/api/invoices",
		"/api/v1/billing/invoices",
		"/api/visits/:visitId/invoice",
		"/api/v1/visits/:visitId/invoice",
	]) {
		defineStreamRoute(app, {
			method: "POST",
			path,
			permission: "public",
			handler: async ({ request, reply }) => handleCreateInvoice(request, reply),
		});
	}

	for (const path of [
		"/api/invoices/:id",
		"/api/v1/billing/invoices/:id",
		"/api/billing/invoices/:id",
	]) {
		defineStreamRoute(app, {
			method: "GET",
			path,
			permission: "public",
			handler: async ({ request, reply }) => handleGetInvoiceById(request, reply),
		});
	}
}
