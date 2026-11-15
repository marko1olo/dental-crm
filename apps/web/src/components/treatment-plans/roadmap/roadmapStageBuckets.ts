import { formatFdiToothName } from "../../portal/patientPortalEngine.js";
import type { RoadmapStageKind, RoadmapProcedureItem } from "./types.js";
import { translate804nToPatientDescription } from "./roadmapPriceHelpers.js";
import type { TreatmentPlanItem } from "../types.js";

export interface RoadmapAccumulatedBuckets {
	stageBuckets: Record<RoadmapStageKind, RoadmapProcedureItem[]>;
	stageTeethMap: Record<RoadmapStageKind, Set<string>>;
}

export function createEmptyStageBuckets(): RoadmapAccumulatedBuckets {
	const kinds: RoadmapStageKind[] = [
		"stage_1_emergency", "stage_2_therapy", "stage_3_surgery", "stage_4_orthopedics", "stage_5_hygiene_checkup",
		"urgent", "sanitation", "reconstruction", "maintenance", "therapy",
	];
	const stageBuckets = {} as Record<RoadmapStageKind, RoadmapProcedureItem[]>;
	const stageTeethMap = {} as Record<RoadmapStageKind, Set<string>>;
	for (const k of kinds) {
		stageBuckets[k] = [];
		stageTeethMap[k] = new Set();
	}
	return { stageBuckets, stageTeethMap };
}

export function accumulateRoadmapStageBuckets(
	items: readonly TreatmentPlanItem[],
): RoadmapAccumulatedBuckets {
	const { stageBuckets, stageTeethMap } = createEmptyStageBuckets();

	for (const it of items) {
		const { friendlyTitle, categoryCode, stageKind } = translate804nToPatientDescription(it.code804n, it.name);
		const toothStr = it.toothNumber ? String(it.toothNumber) : undefined;
		const targetTeeth = stageTeethMap[stageKind];
		if (targetTeeth && toothStr) {
			targetTeeth.add(toothStr);
		}

		const priceKop = typeof it.priceKopecks === "number"
			? Math.round(it.priceKopecks)
			: Math.round((it.priceRub || 0) * 100);

		const targetBucket = stageBuckets[stageKind];
		if (targetBucket) {
			targetBucket.push({
				id: it.id,
				serviceCode: it.serviceCode || it.code804n,
				code804n: it.code804n,
				medicalTitleRu: it.name,
				patientFriendlyTitleRu: friendlyTitle,
				toothNumber: it.toothNumber,
				toothFdi: toothStr ? formatFdiToothName(toothStr) : undefined,
				priceRub: it.priceRub || 0,
				priceKopecks: priceKop,
				quantity: it.quantity || 1,
				isCompleted: Boolean(it.isCompleted || it.status === "completed" || it.planStatus === "completed"),
				categoryCode,
			});
		}
	}

	return { stageBuckets, stageTeethMap };
}
