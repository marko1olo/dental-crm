/**
 * Canonical Facade for DENTE CRM Pricelist Routes.
 * Decomposed into modular DAG structure under ./pricelist/ following Mandate 8b & Decomposer protocol.
 */

import { registerPricelistRoutes } from "./pricelist/index.js";

export * from "./pricelist/index.js";

export default registerPricelistRoutes;
