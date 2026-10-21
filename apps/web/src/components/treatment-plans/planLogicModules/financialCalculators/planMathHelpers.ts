import type {
	PatientFinancialContextSummary,
	StageCompletionProgressSummary,
	TreatmentPlanStage,
	TreatmentPlanTier,
	TreatmentPlanViewTab,
} from "../types.js";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const NDFL_TAX_DEDUCTION_RATE = 0.13;

export function calculatePlanAgeDays(planCreatedAtIso?: string): number {
	if (!planCreatedAtIso) return 0;
	const createdTime = new Date(planCreatedAtIso).getTime();
	if (Number.isNaN(createdTime)) return 0;
	return Math.max(0, Math.floor((Date.now() - createdTime) / MS_PER_DAY));
}

export function resolveInitialActiveViewTab(initialViewTab?: TreatmentPlanViewTab): TreatmentPlanViewTab {
	if (
		typeof window !== "undefined" &&
		typeof window.location?.hash === "string" &&
		window.location.hash.toLowerCase().includes("roadmap")
	) {
		return "roadmap";
	}
	return initialViewTab || "3tier";
}

export function extractPatientFinancialContext(
	patients: any[] | undefined,
	patientId: string,
): PatientFinancialContextSummary {
	const patient = patients?.find((p: any) => p.id === patientId);
	return {
		patient,
		patientBalanceRub: Math.max(0, Number(patient?.balanceRub) || 0),
		patientPhone: patient?.phone || "+7 (___) ___-__-__",
		patientBirthDate: patient?.birthDate,
	};
}

export function calculateStageTotalsKopecks(stages: readonly TreatmentPlanStage[]): number {
	return stages.reduce((sum, s) => sum + (s.totalKopecks ?? Math.round((s.totalRub || 0) * 100)), 0);
}

export function calculateEffectiveSignTier(
	currentTier: TreatmentPlanTier,
	stages: readonly TreatmentPlanStage[],
): TreatmentPlanTier {
	const totalKopecks = calculateStageTotalsKopecks(stages);
	return {
		...currentTier,
		stages,
		totalRub: totalKopecks / 100,
		totalKopecks: totalKopecks as TreatmentPlanTier["totalKopecks"],
	};
}

export function calculateTotalItemsCount(stages: readonly TreatmentPlanStage[]): number {
	return stages.reduce((acc, s) => acc + s.items.length, 0);
}

export function calculateGrandTotalRub(stages: readonly TreatmentPlanStage[]): number {
	return stages.reduce((acc, s) => acc + Math.round((s.totalRub || 0) * 100), 0) / 100;
}

export function calculateTaxDeduction13PercentRub(grandTotalRub: number): number {
	const grandTotalKopecks = Math.max(0, Math.round((grandTotalRub || 0) * 100));
	return Math.round(grandTotalKopecks * NDFL_TAX_DEDUCTION_RATE) / 100;
}

export function calculateStageCompletionProgress(
	stages: readonly TreatmentPlanStage[],
): StageCompletionProgressSummary {
	const totalStages = stages.length;
	if (totalStages === 0) {
		return { totalStages: 0, completedStages: 0, inProgressStages: 0, completionPercent: 0 };
	}
	const completedStages = stages.filter((s) => s.status === "completed").length;
	const inProgressStages = stages.filter((s) => s.status === "in_progress").length;
	return {
		totalStages,
		completedStages,
		inProgressStages,
		completionPercent: Math.round((completedStages / totalStages) * 100),
	};
}
