import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { batchTrackingRoutes } from "./batchTrackingRoutes.js";
import { itemCatalogRoutes } from "./itemCatalogRoutes.js";
import { procedureRuleRoutes } from "./procedureRuleRoutes.js";
import { stockLedgerRoutes } from "./stockLedgerRoutes.js";
import { stornoRoutes } from "./stornoRoutes.js";
import { supplierInvoiceRoutes } from "./supplierInvoiceRoutes.js";
import { writeOffRoutes } from "./writeOffRoutes.js";

export * from "./consumables/index.js";
export * from "./types.js";
export {
	INVALID_DATE,
	normalizedExpirationDate,
	toValidUuid,
} from "./types.js";
export {
	batchTrackingRoutes,
	itemCatalogRoutes,
	procedureRuleRoutes,
	stockLedgerRoutes,
	stornoRoutes,
	supplierInvoiceRoutes,
	writeOffRoutes,
};

export const inventoryRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	await server.register(itemCatalogRoutes);
	await server.register(procedureRuleRoutes);
	await server.register(stockLedgerRoutes);
	await server.register(batchTrackingRoutes);
	await server.register(supplierInvoiceRoutes);
	await server.register(writeOffRoutes);
	await server.register(stornoRoutes);
};

export default inventoryRoutes;
