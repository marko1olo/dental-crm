/**
 * Backward compatibility facade for periodontogram mutations.
 * Canonical implementations reside in ./periodontogram/
 */
import type { FastifyInstance } from "fastify";
import {
	findDraftSnapshotOrSendError,
	registerSiteMutationRoutes,
} from "./periodontogram/routesMutationsSites.js";
import { registerToothMutationRoutes } from "./periodontogram/routesMutationsTeeth.js";

export { findDraftSnapshotOrSendError };

export function registerPeriodontogramMutationRoutes(
	app: FastifyInstance,
): void {
	registerToothMutationRoutes(app);
	registerSiteMutationRoutes(app);
}
