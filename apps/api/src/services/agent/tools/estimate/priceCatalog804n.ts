/**
 * priceCatalog804n.ts — Legacy Facade for Canonical Services Price Catalog.
 *
 * Mandate 8ap: Canonical implementation migrated to priceCatalogServices.ts.
 * Retained for backwards compatibility across existing imports.
 */

export {
	CANONICAL_804N_PRICE_CATALOG,
	CANONICAL_SERVICES_PRICE_CATALOG,
	resolveStandardCatalogPrice,
	type StandardCatalogService,
} from "./priceCatalogServices.js";
