import type { FastifyPluginAsync } from "fastify";
import { inventoryRoutes } from "./inventory/index.js";

export {
	INVALID_DATE,
	normalizedExpirationDate,
	toValidUuid,
	inventoryCreateBodySchema,
	inventoryUpdateBodySchema,
	inventoryStockBodySchema,
	inventoryReceiveBatchBodySchema,
	acceptanceWaybillItemSchema,
	acceptanceWaybillBodySchema,
	inventoryDeductItemSchema,
	inventoryDeductBatchBodySchema,
	inventoryRuleBodySchema,
	inventoryStornoItemSchema,
	inventoryStornoServiceSchema,
	inventoryStornoBodySchema,
	inventoryOverdraftAlertBodySchema,
	batchTrackingRoutes,
	itemCatalogRoutes,
	procedureRuleRoutes,
	stockLedgerRoutes,
	supplierInvoiceRoutes,
	writeOffRoutes,
	stornoRoutes,
	inventoryRoutes,
} from "./inventory/index.js";

export default inventoryRoutes;
