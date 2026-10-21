import type { PlanStageMutationContext, PlanStageMutationHandlers } from "../types.js";
import { createPlanBundleHandlers } from "./planBundleHandlers.js";
import { createCbctAndCopilotHandlers } from "./planCbctAndCopilotHandlers.js";
import { createPlanItemHandlers } from "./planItemHandlers.js";
import { createPlanStageLifecycleHandlers } from "./planStageLifecycleHandlers.js";

export function createPlanStageMutationHandlers(
	ctx: PlanStageMutationContext,
): PlanStageMutationHandlers {
	const cbctAndCopilot = createCbctAndCopilotHandlers(ctx);
	const itemHandlers = createPlanItemHandlers(ctx);
	const bundleHandlers = createPlanBundleHandlers(ctx);
	const lifecycleHandlers = createPlanStageLifecycleHandlers(ctx);

	return {
		...cbctAndCopilot,
		...itemHandlers,
		...bundleHandlers,
		...lifecycleHandlers,
	};
}

export * from "./planCbctAndCopilotHandlers.js";
export * from "./planItemHandlers.js";
export * from "./planBundleHandlers.js";
export * from "./planStageLifecycleHandlers.js";
