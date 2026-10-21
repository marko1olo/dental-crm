import type { ResorptionStagePercent } from "./pediatricDentitionEngine";

export interface PediatricResorptionTabProps {
	selectedPrimaryTooth: number;
	onSelectPrimaryTooth: (tooth: number) => void;
	selectedResorptionStage: ResorptionStagePercent;
	onSelectResorptionStage: (stage: ResorptionStagePercent) => void;
	onUpdateToothResorption?: ((toothNumber: number, stage: ResorptionStagePercent) => void) | undefined;
	onBatchUpdateResorption?: ((updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[]) => void) | undefined;
	patientAgeYears?: number | undefined;
	onAgeChange?: ((age: number) => void) | undefined;
}

export const UPPER_PRIMARY_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
export const LOWER_PRIMARY_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;
export const RESORPTION_STAGES: readonly ResorptionStagePercent[] = [0, 25, 50, 75, 100];

export interface ResorptionAgePreset {
	readonly id: string;
	readonly label: string;
	readonly ageRange: string;
	readonly targetAge: number;
	readonly descriptionRu: string;
}

export const RESORPTION_AGE_PRESETS: readonly ResorptionAgePreset[] = [
	{
		id: "primary",
		label: "Временный прикус",
		ageRange: "3–5 лет",
		targetAge: 4.5,
		descriptionRu: "Интактные корни (0% резорбция), все 20 молочных зубов интактны",
	},
	{
		id: "early_mixed",
		label: "Ранний сменный",
		ageRange: "6–8 лет",
		targetAge: 7.0,
		descriptionRu: "Резорбция резцов (50–75%), моляры интактны или начальная (0–25%)",
	},
	{
		id: "late_mixed",
		label: "Поздний сменный",
		ageRange: "9–12 лет",
		targetAge: 10.5,
		descriptionRu: "Резорбция клыков и премоляров (50–75%), резцы уже сменились",
	},
];
