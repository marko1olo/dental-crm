/**
 * treatmentConsumables.ts — Canonical Thin Facade for Treatment Consumables & Stock Auto-Deductions Routes.
 *
 * Re-exports the complete route plugin, handlers, FEFO batch allocator, and Zod schemas from:
 * - `./consumablesRoutes/types.js`: Zod schemas and TypeScript contracts
 * - `./consumablesRoutes/consumableFefoAllocator.js`: FEFO batch selection & kopeck cost calculation
 * - `./consumablesRoutes/techCardNormHandlers.js`: Technological card (BOM) norm CRUD & reorder endpoints
 * - `./consumablesRoutes/visitWriteOffHandlers.js`: Atomic visit/tooth write-off & soft-overdraft endpoints
 * - `./consumablesRoutes/index.js`: Fastify route plugin coordinator (`treatmentConsumablesRoutes`)
 */

export {
	registerTreatmentConsumablesRoutes,
	treatmentConsumablesRoutes,
} from "./consumablesRoutes/index.js";

export * from "./consumablesRoutes/index.js";
