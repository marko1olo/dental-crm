import { kopecksToRub } from "@dental/shared";
import type { RoadmapStageData, RoadmapStageKind, TreatmentPlanStage } from "./types.js";
import { CANONICAL_ROADMAP_META, normalizeRoadmapStageKind } from "./roadmapPriceHelpers.js";
import { accumulateRoadmapStageBuckets } from "./roadmapStageBuckets.js";

const STAGE_KINDS_ORDER: RoadmapStageKind[] = [
	"stage_1_emergency",
	"stage_2_therapy",
	"stage_3_surgery",
	"stage_4_orthopedics",
	"stage_5_hygiene_checkup",
];

export function buildCanonicalRoadmapStages(
	stages: readonly TreatmentPlanStage[] = [],
	customRoadmapStages?: readonly RoadmapStageData[],
	paidStageNumbers: Set<number> = new Set(),
): RoadmapStageData[] {
	if (customRoadmapStages && customRoadmapStages.length > 0) {
		return customRoadmapStages.map((st) => {
			const isPaid = st.status === "completed" || Boolean(st.isFullyPaid) || paidStageNumbers.has(st.stageNumber);
			if (isPaid) {
				return {
					...st,
					status: "completed" as const,
					isFullyPaid: true,
					remainingRub: 0,
					remainingKopecks: 0,
					completedKopecks: st.totalKopecks,
					completedRub: st.totalRub,
				};
			}
			return st;
		});
	}

	const allItems = stages.flatMap((s) => s.items || []);
	const { stageBuckets, stageTeethMap } = accumulateRoadmapStageBuckets(allItems);

	return STAGE_KINDS_ORDER.map((kind) => {
		const meta = CANONICAL_ROADMAP_META[kind];
		const procs = stageBuckets[kind];
		const totalKop = procs.reduce((sum, p) => sum + p.priceKopecks * p.quantity, 0);
		const completedKop = procs.filter((p) => p.isCompleted).reduce((sum, p) => sum + p.priceKopecks * p.quantity, 0);

		let status: "completed" | "in_progress" | "planned" = "planned";
		if (procs.length > 0 && procs.every((p) => p.isCompleted)) {
			status = "completed";
		} else if (totalKop > 0 && completedKop >= totalKop) {
			status = "completed";
		} else if (completedKop > 0 || procs.some((p) => p.isCompleted)) {
			status = "in_progress";
		}

		const matchingInputStage = stages.find((s) => {
			const normS = normalizeRoadmapStageKind(s.stageKind);
			const normK = normalizeRoadmapStageKind(kind);
			return normS === normK || s.stageNumber === meta.stageNumber;
		});
		const isFullyPaid =
			matchingInputStage?.status === "completed" ||
			Boolean((matchingInputStage as { isFullyPaid?: boolean })?.isFullyPaid) ||
			paidStageNumbers.has(meta.stageNumber);

		if (isFullyPaid) {
			status = "completed";
		}

		const remainingKop = status === "completed" ? 0 : Math.max(0, totalKop - completedKop);
		const effectiveCompletedKop = status === "completed" ? totalKop : completedKop;
		const estimatedVisits = Math.max(1, Math.ceil(procs.length / 2));

		return {
			stageNumber: meta.stageNumber,
			stageKind: kind,
			titleRu: meta.titleRu,
			subtitleRu: meta.subtitleRu,
			patientGoalRu: meta.patientGoalRu,
			timelineRu: meta.timelineRu,
			preparationRu: meta.preparationRu,
			warrantyRu: meta.warrantyRu,
			status,
			teethFdiList: Array.from(stageTeethMap[kind]),
			procedures: procs,
			totalRub: kopecksToRub(totalKop),
			totalKopecks: totalKop,
			completedRub: kopecksToRub(effectiveCompletedKop),
			completedKopecks: effectiveCompletedKop,
			remainingRub: kopecksToRub(remainingKop),
			remainingKopecks: remainingKop,
			estimatedVisitsCount: estimatedVisits,
			isFullyPaid: status === "completed",
		};
	});
}
