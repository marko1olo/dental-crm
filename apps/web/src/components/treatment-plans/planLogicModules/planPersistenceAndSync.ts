import type { PlanPersistenceAndSyncContext, PlanPersistenceAndSyncHandlers } from "./types.js";
import { createPlanDatabaseAndWriteOffHandlers } from "./persistenceAndSync/planDatabaseAndWriteOffHandlers.js";
import { createPlanLabAndCashierHandlers } from "./persistenceAndSync/planLabAndCashierHandlers.js";

export { useTreatmentPlanPersistenceEffects } from "./persistenceAndSync/useTreatmentPlanPersistenceEffects.js";

export function createPlanPersistenceAndSyncHandlers(
	ctx: PlanPersistenceAndSyncContext,
): PlanPersistenceAndSyncHandlers {
	const labAndCashier = createPlanLabAndCashierHandlers(ctx);
	const dbAndWriteOff = createPlanDatabaseAndWriteOffHandlers(ctx);

	return {
		...labAndCashier,
		...dbAndWriteOff,
	};
}
