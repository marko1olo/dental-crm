import { and, eq } from "drizzle-orm";
import type { db as dbType } from "../../../db/client.js";
import { getActivePriceFreezeToken } from "../../../db/priceFreezeTokensQuery.js";
import {
	treatmentPlanItemsNew,
	treatmentPlans,
} from "../../../db/schema/clinical.js";
import type {
	PriceFreezeTokenResult,
	TreatmentPlanItemRow,
	TreatmentPlanRow,
} from "../types.js";

/** Fetches target plan, active price freeze token, and plan items */
export async function fetchTargetPlanAndFreezeToken(params: {
	db: typeof dbType;
	orgId: string;
	targetPlanId?: string | undefined;
}): Promise<{
	targetPlan: TreatmentPlanRow | null;
	freezeToken: PriceFreezeTokenResult;
	targetPlanDbItems: TreatmentPlanItemRow[];
}> {
	const { db, orgId, targetPlanId } = params;
	if (!targetPlanId) {
		return { targetPlan: null, freezeToken: null, targetPlanDbItems: [] };
	}

	const [found] = await db
		.select()
		.from(treatmentPlans)
		.where(
			and(
				eq(treatmentPlans.id, targetPlanId),
				eq(treatmentPlans.organizationId, orgId),
			),
		)
		.limit(1);

	const targetPlan = found ?? null;
	if (!targetPlan) {
		return { targetPlan: null, freezeToken: null, targetPlanDbItems: [] };
	}

	const freezeToken = await getActivePriceFreezeToken(db, orgId, targetPlan.id);
	const targetPlanDbItems = await db
		.select()
		.from(treatmentPlanItemsNew)
		.where(
			and(
				eq(treatmentPlanItemsNew.planId, targetPlan.id),
				eq(treatmentPlanItemsNew.organizationId, orgId),
			),
		);

	return { targetPlan, freezeToken, targetPlanDbItems };
}
