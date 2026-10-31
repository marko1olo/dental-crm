import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
	handleCreateInventoryItem,
	handleDeleteInventoryItem,
	handleUpdateInventoryItem,
	registerItemCatalogMutations,
} from "./itemCatalogMutations.js";
import {
	calculateAlertsFromItems,
	registerItemCatalogQueries,
} from "./itemCatalogQueries.js";

export const itemCatalogRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	registerItemCatalogQueries(server);
	registerItemCatalogMutations(server);
};

export {
	calculateAlertsFromItems,
	handleCreateInventoryItem,
	handleDeleteInventoryItem,
	handleUpdateInventoryItem,
	registerItemCatalogMutations,
	registerItemCatalogQueries,
};

export default itemCatalogRoutes;
