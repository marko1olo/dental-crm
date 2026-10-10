/**
 * Canonical Thin Facade for Sberbank Acquiring & Webhooks (Wave 22 Decomposition).
 * Preserves 100% backward compatibility for all consumers and tests.
 */
export * from "./sberbankRoutes/index.js";
export { default } from "./sberbankRoutes/index.js";
