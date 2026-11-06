/**
 * apps/api/src/routes/pricelistRoutes.ts
 * Canonical router facade for DENTE CRM Pricelist & Service Catalog.
 * Exports registerPricelistRoutes from ./pricelist.js (Mandates 8b, 8e, 8x, 8ap).
 */

import { registerPricelistRoutes } from "./pricelist.js";

export * from "./pricelist.js";
export { registerPricelistRoutes };
export default registerPricelistRoutes;
