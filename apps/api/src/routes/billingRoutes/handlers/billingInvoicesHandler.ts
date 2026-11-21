import type { FastifyReply, FastifyRequest } from "fastify";
import { handleListInvoices } from "../../invoiceRoutes/handlers/listInvoicesHandler.js";

/**
 * GET /api/billing/invoices
 *
 * Unified SSOT: delegates directly to handleListInvoices to eliminate DTO desynchronization
 * and guarantee full invoice items, patient names, and exact kopeck totals.
 */
export async function handleGetBillingInvoices(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	return handleListInvoices(request, reply);
}
