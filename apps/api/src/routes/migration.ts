/**
 * apps/api/src/routes/migration.ts
 *
 * Facade router for Migration & Data Import endpoints.
 * Decomposed into modular sweet-spot route sets under ./migrationRoutes/
 *
 * Mandates:
 * - Mandate 8b: File size ceiling <= 500 lines (Sweet Spot 200-300 lines).
 * - Mandate 8d: Strict tenant isolation by organizationId from JWT / session context.
 * - Mandate 8x: Human Russian error refusal dictionary via schemaRefusalWords.
 */

import type { FastifyInstance } from "fastify";
import { registerMigrationExecutionRoutes } from "./migrationRoutes/migrationExecutionRoutes.js";
import { registerMigrationStatusRoutes } from "./migrationRoutes/migrationStatusRoutes.js";
import { registerExpressImportRoutes } from "./migrationRoutes/expressImportRoutes.js";

export {
	MIGRATION_BODY_LIMIT,
	migrationFieldLabels,
	parsePayload,
	engineInputFrom,
	errorMessageOf,
} from "./migrationRoutes/migrationTypesAndHelpers.js";

export async function registerMigrationRoutes(app: FastifyInstance) {
	await registerMigrationExecutionRoutes(app);
	await registerMigrationStatusRoutes(app);
	await registerExpressImportRoutes(app);
}
