import { kopecksToRubles } from "./patientWebappCrypto";
import type { PatientTreatmentPlanStage } from "./patientWebappPlanTypes";

export function calculatePlanFinancials(
	stages: readonly PatientTreatmentPlanStage[],
): {
	totalCostKopecks: number;
	totalCostRub: number;
	paidCostKopecks: number;
	paidCostRub: number;
	remainingDueKopecks: number;
	remainingDueRub: number;
	progressPercent: number;
	completedStagesCount: number;
	totalStagesCount: number;
} {
	let totalKopecks = 0;
	let paidKopecks = 0;
	let completedStages = 0;

	for (const stage of stages) {
		totalKopecks += Math.max(0, stage.costKopecks);
		if (stage.status === "completed") {
			paidKopecks += Math.max(0, stage.costKopecks);
			completedStages++;
		}
	}

	const remainingKopecks = Math.max(0, totalKopecks - paidKopecks);
	const progressPercent = stages.length > 0
		? Math.round((completedStages / stages.length) * 100)
		: 0;

	return {
		totalCostKopecks: totalKopecks,
		totalCostRub: kopecksToRubles(totalKopecks),
		paidCostKopecks: paidKopecks,
		paidCostRub: kopecksToRubles(paidKopecks),
		remainingDueKopecks: remainingKopecks,
		remainingDueRub: kopecksToRubles(remainingKopecks),
		progressPercent,
		completedStagesCount: completedStages,
		totalStagesCount: stages.length,
	};
}
