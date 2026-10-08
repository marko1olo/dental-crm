/**
 * @file apps/api/src/routes/odontogram.ts
 * @description Canonical Facade for Odontogram & Treatment Plan Routes.
 * Decomposed into modular DAG structure under `apps/api/src/routes/odontogram/`.
 */

export * from "./odontogram/index.js";
export { registerOdontogramRoutes as default } from "./odontogram/index.js";
