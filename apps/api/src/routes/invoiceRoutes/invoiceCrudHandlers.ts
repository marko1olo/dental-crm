import type { FastifyInstance } from "fastify";
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
	app.get("/api/invoices/pending", handlePendingInvoices);

	for (const path of ["/api/invoices", "/api/v1/billing/invoices"]) {
		app.get(path, handleListInvoices);
	}

	for (const path of [
		"/api/invoices",
		"/api/v1/billing/invoices",
		"/api/visits/:visitId/invoice",
		"/api/v1/visits/:visitId/invoice",
	]) {
		app.post(path, handleCreateInvoice);
	}

	for (const path of [
		"/api/invoices/:id",
		"/api/v1/billing/invoices/:id",
		"/api/billing/invoices/:id",
	]) {
		app.get(path, handleGetInvoiceById);
	}
}
