/**
 * packages/shared/src/clinical/pediatric/pediatricCatalog.ts
 * Layer 1 Facade: Minzdrav Order 804n Pediatric Services Catalog.
 *
 * Re-exports canonical pediatric nomenclature from the Order 804n subsystem.
 */

export * from "../../pricelist/order804n/pediatricCatalog.js";
export { PEDIATRIC_804N_CATALOG, ORDER_804N_PEDIATRIC_SERVICES } from "../../pricelist/order804n/pediatricCatalog.js";
