export type TreatmentOptionTier = "optimal" | "functional" | "economy";

export type TreatmentStageType =
	| "hygiene_therapy"
	| "surgical_implant"
	| "prosthetic_loading"
	| "orthodontic_alignment"
	| "maintenance";

export interface TreatmentPlanStage {
	name: string;
	stageType: TreatmentStageType;
	durationWeeks: number;
	costRub: number;
	description?: string;
}

export interface CalculatedStageTimeline extends TreatmentPlanStage {
	startWeek: number;
	endWeek: number;
}

export interface PaymentScheduleMilestone {
	stageIndex: number;
	stageName: string;
	amountRub: number;
	dueAtWeek: number;
	percentageOfTotal: number;
}

export interface TreatmentPlanOption {
	optionId: string;
	tier: TreatmentOptionTier;
	title: string;
	stages: TreatmentPlanStage[];
	totalCostRub: number;
	expectedLifespanYears: number;
	warrantyMonths: number;
	pros: string[];
	cons: string[];
}

export interface TreatmentOptionComparisonSummary {
	optionId: string;
	tier: TreatmentOptionTier;
	title: string;
	totalCostRub: number;
	totalDurationWeeks: number;
	expectedLifespanYears: number;
	warrantyMonths: number;
	stagesCount: number;
	pros: string[];
	cons: string[];
}

export class TreatmentEstimateVisualizerService {
	/**
	 * Расчет таймлайна этапов и графика платежей по этапам лечения
	 */
	public static calculateTimelineAndSchedule(option: TreatmentPlanOption): {
		timelineStages: CalculatedStageTimeline[];
		totalDurationWeeks: number;
		paymentSchedule: PaymentScheduleMilestone[];
	} {
		const timelineStages: CalculatedStageTimeline[] = [];
		let currentWeek = 0;

		for (const stage of option.stages) {
			const startWeek = currentWeek;
			const endWeek = currentWeek + Math.max(1, stage.durationWeeks);
			timelineStages.push({
				...stage,
				startWeek,
				endWeek,
			});
			currentWeek = endWeek;
		}

		const totalCost = Math.max(1, option.totalCostRub);
		const paymentSchedule: PaymentScheduleMilestone[] = timelineStages.map((st, idx) => ({
			stageIndex: idx + 1,
			stageName: st.name,
			amountRub: st.costRub,
			dueAtWeek: st.startWeek,
			percentageOfTotal: Number(((st.costRub / totalCost) * 100).toFixed(1)),
		}));

		return {
			timelineStages,
			totalDurationWeeks: currentWeek,
			paymentSchedule,
		};
	}

	/**
	 * Сравнительный анализ нескольких вариантов лечения для пациента
	 */
	public static compareOptions(options: readonly TreatmentPlanOption[]): {
		options: TreatmentOptionComparisonSummary[];
		cheapestOptionId: string | null;
		fastestOptionId: string | null;
		recommendedOptionId: string | null;
	} {
		if (options.length === 0) {
			return {
				options: [],
				cheapestOptionId: null,
				fastestOptionId: null,
				recommendedOptionId: null,
			};
		}

		const summaries: TreatmentOptionComparisonSummary[] = options.map((opt) => {
			const totalDurationWeeks = opt.stages.reduce((sum, s) => sum + s.durationWeeks, 0);
			return {
				optionId: opt.optionId,
				tier: opt.tier,
				title: opt.title,
				totalCostRub: opt.totalCostRub,
				totalDurationWeeks,
				expectedLifespanYears: opt.expectedLifespanYears,
				warrantyMonths: opt.warrantyMonths,
				stagesCount: opt.stages.length,
				pros: opt.pros,
				cons: opt.cons,
			};
		});

		let cheapest = summaries[0]!;
		let fastest = summaries[0]!;
		let recommended = summaries.find((s) => s.tier === "optimal") ?? summaries[0]!;

		for (const s of summaries) {
			if (s.totalCostRub < cheapest.totalCostRub) cheapest = s;
			if (s.totalDurationWeeks < fastest.totalDurationWeeks) fastest = s;
		}

		return {
			options: summaries,
			cheapestOptionId: cheapest.optionId,
			fastestOptionId: fastest.optionId,
			recommendedOptionId: recommended.optionId,
		};
	}
}