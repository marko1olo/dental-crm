import type { ToothData } from "../ToothChart";
import type { ResorptionStagePercent } from "../pediatricDentitionEngine";

export const UPPER_PRIMARY_TEETH = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65] as const;
export const LOWER_PRIMARY_TEETH = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75] as const;

export interface PediatricAgePreset {
	readonly id: "primary" | "early_mixed" | "late_mixed" | "primary_3y" | "first_molar_6y" | "mixed_9y" | "permanent_12y";
	readonly labelRu: string;
	readonly ageRangeRu: string;
	readonly targetAge: number;
	readonly descriptionRu: string;
	readonly teethSummaryRu: string;
	readonly teethNumbers?: readonly number[];
	readonly mode?: "primary" | "first_molar" | "mixed" | "permanent";
}

export const PEDIATRIC_AGE_PRESETS: readonly PediatricAgePreset[] = [
	{
		id: "primary",
		labelRu: "3 года — молочный прикус",
		ageRangeRu: "3–5 лет",
		targetAge: 3.0,
		descriptionRu: "Все 20 молочных зубов интактны (51–85), физиологическая норма без постоянных моляров, 0% резорбция",
		teethSummaryRu: "20 молочных зубов (51–85)",
		teethNumbers: [55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75],
		mode: "primary",
	},
	{
		id: "early_mixed",
		labelRu: "6 лет — первый моляр",
		ageRangeRu: "6–7 лет",
		targetAge: 6.0,
		descriptionRu: "Прорезывание первых постоянных моляров (16, 26, 36, 46) + 20 молочных зубов",
		teethSummaryRu: "1-е моляры (16, 26, 36, 46) + 20 молочных",
		teethNumbers: [16, 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, 26, 46, 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, 36],
		mode: "first_molar",
	},
	{
		id: "late_mixed",
		labelRu: "9 лет — сменный прикус",
		ageRangeRu: "8–10 лет",
		targetAge: 9.0,
		descriptionRu: "Смена резцов (11..42) и 1-е постоянные моляры (16..46) + молочные клыки и моляры (53..85)",
		teethSummaryRu: "Резцы 11..42 + 1-е моляры + молочные 53..85",
		teethNumbers: [16, 55, 54, 53, 12, 11, 21, 22, 63, 64, 65, 26, 46, 85, 84, 83, 42, 41, 31, 32, 73, 74, 75, 36],
		mode: "mixed",
	},
	{
		id: "permanent_12y",
		labelRu: "12 лет — постоянный прикус",
		ageRangeRu: "11–13 лет",
		targetAge: 12.0,
		descriptionRu: "Все 28 постоянных зубов прорезались (17..27, 47..37, без третьих моляров 18, 28, 38, 48)",
		teethSummaryRu: "28 постоянных зубов (17..27, 47..37)",
		teethNumbers: [17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37],
		mode: "permanent",
	},
];

export interface PediatricMixedDentitionModalProps {
	isOpen: boolean;
	onClose: () => void;
	teethData?: ToothData[];
	onApplyAgeArch?: (teethNumbers: number[]) => void;
	onUpdateToothResorption?: (toothNumber: number, resorptionStage: ResorptionStagePercent) => void;
	onBatchUpdateResorption?: (updates: { toothNumber: number; resorptionStage: ResorptionStagePercent }[]) => void;
	initialAge?: number;
}

export type ModalTab = "timeline" | "cariogram" | "resorption" | "frankl";
