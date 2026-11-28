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
import type { PerioDemoContextOptions } from "../../services/periodontogram/periodontogramDemoHelper.js";

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
	options?: PerioDemoContextOptions,
): Promise<void> {
	await registerPatientPeriodontogramRoutes(app, options);
	await registerSnapshotPeriodontogramRoutes(app, options);
	await registerLifecyclePeriodontogramRoutes(app);
	registerToothMutationRoutes(app);
	registerSiteMutationRoutes(app);
}

/**
 * Register all periodontogram REST routes (Canonical SSOT).
 */
export async function registerPeriodontogramRoutes(
	app: FastifyInstance,
	options?: PerioDemoContextOptions,
): Promise<void> {
	await registerPeriodontogramSubRoutes(app, options);
}

export default registerPeriodontogramRoutes;
