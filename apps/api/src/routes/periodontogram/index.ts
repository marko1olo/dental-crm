/**
 * Periodontogram Modular Sub-Routes Barrel (SSOT).
 * Sweet Spot: < 50 lines.
 */
import type { FastifyInstance } from "fastify";
import { registerLifecyclePeriodontogramRoutes } from "./routesLifecycle.js";
import {
	registerSiteMutationRoutes,
	findDraftSnapshotOrSendError,
} from "./routesMutationsSites.js";
import { registerToothMutationRoutes } from "./routesMutationsTeeth.js";
import { registerPatientPeriodontogramRoutes } from "./routesPatient.js";
import { registerSnapshotPeriodontogramRoutes } from "./routesSnapshots.js";

export {
	registerLifecyclePeriodontogramRoutes,
	registerSiteMutationRoutes,
	registerToothMutationRoutes,
	registerPatientPeriodontogramRoutes,
	registerSnapshotPeriodontogramRoutes,
	findDraftSnapshotOrSendError,
};
export { fetchToothPeriodontalEvents } from "./toothHistory.js";

/**
 * Registers all modular periodontogram routes in the Fastify instance.
 */
export async function registerPeriodontogramSubRoutes(
	app: FastifyInstance,
): Promise<void> {
	await registerPatientPeriodontogramRoutes(app);
	await registerSnapshotPeriodontogramRoutes(app);
	await registerLifecyclePeriodontogramRoutes(app);
	registerToothMutationRoutes(app);
	registerSiteMutationRoutes(app);
}
