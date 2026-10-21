import type { TreatmentPlanItem, TreatmentPlanStage } from "../types.js";
import { calculateStageTotals } from "../treatmentPlanPricingEngine.js";
import { resolvePhaseMetadata } from "./phaseMetadataResolver.js";

export function assembleStageFromItems(
	phaseNumber: number,
	mappedItems: TreatmentPlanItem[],
): TreatmentPlanStage {
	const meta = resolvePhaseMetadata(phaseNumber);
	const { totalKopecks, totalRub } = calculateStageTotals(mappedItems);
	const order804nCodes = Array.from(new Set(mappedItems.map((it) => it.code804n)));
	const stageDoctor = mappedItems.find((it) => it.doctorId);

	const hasAllCompleted = mappedItems.length > 0 && mappedItems.every((it) => it.isCompleted);
	const hasSomeCompleted = mappedItems.some((it) => it.isCompleted);
	const stageStatus = hasAllCompleted ? "completed" : hasSomeCompleted ? "in_progress" : "agreed";

	return {
		stageNumber: phaseNumber,
		stageKind: meta.stageKind,
		title: meta.title,
		subtitle: meta.subtitle,
		clinicalGoal: meta.clinicalGoal,
		items: mappedItems,
		totalRub,
		totalKopecks,
		estimatedVisits: Math.max(1, Math.ceil(mappedItems.length / 2)),
		estimatedWeeks: meta.estimatedWeeks,
		serviceCatalogCodes: order804nCodes,
		order804nCodes,
		status: stageStatus,
		doctorId: stageDoctor?.doctorId ?? null,
		doctorName: stageDoctor?.doctorName ?? null,
		doctorSpecialty: stageDoctor?.doctorSpecialty ?? null,
	};
}
