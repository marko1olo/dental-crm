/**
 * Periodontogram Routes (SSOT Facade).
 * Conforms to Mandates 8b/8zi (Sweet Spot < 50 lines facade).
 * Aggregates modular sub-routes from ./periodontogram/
 */
import type { FastifyInstance } from "fastify";
import {
	registerPeriodontogramSubRoutes,
	findDraftSnapshotOrSendError,
} from "./periodontogram/index.js";

export { findDraftSnapshotOrSendError };

/**
 * Register all periodontogram REST routes.
 */
export async function registerPeriodontogramRoutes(
	app: FastifyInstance,
): Promise<void> {
	await registerPeriodontogramSubRoutes(app);
}

export default registerPeriodontogramRoutes;
