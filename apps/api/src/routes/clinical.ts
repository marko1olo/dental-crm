/**
 * Clinical Routes API Canonical Facade
 *
 * Statutory EMR, clinical rules, treatment phase handovers, and catalogs.
 * Decomposed into modular DAG structure under ./clinicalRoutes/ per Mandate 8b & /decomposer.
 */

import { registerClinicalRoutes } from "./clinicalRoutes/index.js";

export {
	clinicalRoutes,
	registerClinicalRoutes,
} from "./clinicalRoutes/index.js";

export * from "./clinicalRoutes/index.js";
export default registerClinicalRoutes;
