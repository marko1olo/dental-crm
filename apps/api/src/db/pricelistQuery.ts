/**
 * pricelistQuery.ts — Канонический фасад (barrel SSOT) запросов прайс-листа и BOM.
 * Реализация декомпозирована по доменным модулям `pricelistModules/`.
 */
export {
	SERVICE_CATALOG_EMPTY_MESSAGE,
	getServiceCatalogBatchForOrganization,
	getServiceCatalogForOrganization,
	getSingleServiceCatalogItemFromDb,
	projectServiceCatalogRows,
	type ServiceCatalogBatchPage,
	type ServiceCatalogProjection,
	type ServiceCatalogRow,
} from "./pricelistModules/pricelistReadQueries.js";

export {
	ServiceCatalogItemNotFoundError,
	ServiceCatalogStorageDisabledError,
	createServiceCatalogItemInDb,
	deactivateServiceCatalogItemInDb,
	updateServiceCatalogItemInDb,
	type ServiceCatalogItemInput,
	type ServiceCatalogItemPatch,
} from "./pricelistModules/pricelistWriteMutations.js";

export {
	batchRepriceServicesInDb,
	computeRepricedAmount,
	seedBaseline804nServicesInDb,
	type BatchRepriceOptions,
	type BatchRepriceResult,
	type PriceRoundingRule,
} from "./pricelistModules/pricelistSeedAndReprice.js";

export {
	getServiceBomFromDb,
	upsertServiceBomInDb,
	type ServiceBomDetails,
	type ServiceBomItemPayload,
	type UpsertServiceBomInput,
} from "./pricelistModules/pricelistBomQueries.js";
