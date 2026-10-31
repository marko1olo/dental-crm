import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { registerSupplierInvoiceQueries } from "./invoiceDraftAndItems.js";
import {
	handleAcceptanceWaybillRequest,
	registerSupplierInvoiceReceiptExecution,
} from "./invoiceStatusAndApproval.js";

export const supplierInvoiceRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	registerSupplierInvoiceReceiptExecution(server);
	registerSupplierInvoiceQueries(server);
};

export {
	handleAcceptanceWaybillRequest,
	registerSupplierInvoiceQueries,
	registerSupplierInvoiceReceiptExecution,
};

export default supplierInvoiceRoutes;
