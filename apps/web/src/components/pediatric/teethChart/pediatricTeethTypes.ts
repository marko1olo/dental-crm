import type { ResorptionStagePercent } from "../../odontogram/pediatricDentitionEngine";

export type PediatricDentitionMode = "primary" | "mixed" | "permanent";

export interface PediatricToothItem {
	readonly toothNumber: number;
	readonly label: string;
	readonly anatomicalNameRu: string;
	readonly isPrimary: boolean;
	readonly quadrant: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
	readonly type: "incisor_central" | "incisor_lateral" | "canine" | "molar_1" | "molar_2" | "permanent_molar_1" | "permanent_incisor";
}

export type ToothClinicalFinding =
	| "Healthy"
	| "Caries"
	| "Filled"
	| "EndoTreated"
	| "Watch"
	| "Extracted"
	| "Crown";

export type ToothSurfaceCode = "O" | "V" | "L" | "M" | "D";

export const PRIMARY_UPPER_RIGHT: readonly PediatricToothItem[] = [
	{ toothNumber: 55, label: "55", anatomicalNameRu: "Верхний правый второй молочный моляр", isPrimary: true, quadrant: 5, type: "molar_2" },
	{ toothNumber: 54, label: "54", anatomicalNameRu: "Верхний правый первый молочный моляр", isPrimary: true, quadrant: 5, type: "molar_1" },
	{ toothNumber: 53, label: "53", anatomicalNameRu: "Верхний правый молочный клык", isPrimary: true, quadrant: 5, type: "canine" },
	{ toothNumber: 52, label: "52", anatomicalNameRu: "Верхний правый боковой молочный резец", isPrimary: true, quadrant: 5, type: "incisor_lateral" },
	{ toothNumber: 51, label: "51", anatomicalNameRu: "Верхний правый центральный молочный резец", isPrimary: true, quadrant: 5, type: "incisor_central" },
];

export const PRIMARY_UPPER_LEFT: readonly PediatricToothItem[] = [
	{ toothNumber: 61, label: "61", anatomicalNameRu: "Верхний левый центральный молочный резец", isPrimary: true, quadrant: 6, type: "incisor_central" },
	{ toothNumber: 62, label: "62", anatomicalNameRu: "Верхний левый боковой молочный резец", isPrimary: true, quadrant: 6, type: "incisor_lateral" },
	{ toothNumber: 63, label: "63", anatomicalNameRu: "Верхний левый молочный клык", isPrimary: true, quadrant: 6, type: "canine" },
	{ toothNumber: 64, label: "64", anatomicalNameRu: "Верхний левый первый молочный моляр", isPrimary: true, quadrant: 6, type: "molar_1" },
	{ toothNumber: 65, label: "65", anatomicalNameRu: "Верхний левый второй молочный моляр", isPrimary: true, quadrant: 6, type: "molar_2" },
];

export const PRIMARY_LOWER_RIGHT: readonly PediatricToothItem[] = [
	{ toothNumber: 85, label: "85", anatomicalNameRu: "Нижний правый второй молочный моляр", isPrimary: true, quadrant: 8, type: "molar_2" },
	{ toothNumber: 84, label: "84", anatomicalNameRu: "Нижний правый первый молочный моляр", isPrimary: true, quadrant: 8, type: "molar_1" },
	{ toothNumber: 83, label: "83", anatomicalNameRu: "Нижний правый молочный клык", isPrimary: true, quadrant: 8, type: "canine" },
	{ toothNumber: 82, label: "82", anatomicalNameRu: "Нижний правый боковой молочный резец", isPrimary: true, quadrant: 8, type: "incisor_lateral" },
	{ toothNumber: 81, label: "81", anatomicalNameRu: "Нижний правый центральный молочный резец", isPrimary: true, quadrant: 8, type: "incisor_central" },
];

export const PRIMARY_LOWER_LEFT: readonly PediatricToothItem[] = [
	{ toothNumber: 71, label: "71", anatomicalNameRu: "Нижний левый центральный молочный резец", isPrimary: true, quadrant: 7, type: "incisor_central" },
	{ toothNumber: 72, label: "72", anatomicalNameRu: "Нижний левый боковой молочный резец", isPrimary: true, quadrant: 7, type: "incisor_lateral" },
	{ toothNumber: 73, label: "73", anatomicalNameRu: "Нижний левый молочный клык", isPrimary: true, quadrant: 7, type: "canine" },
	{ toothNumber: 74, label: "74", anatomicalNameRu: "Нижний левый первый молочный моляр", isPrimary: true, quadrant: 7, type: "molar_1" },
	{ toothNumber: 75, label: "75", anatomicalNameRu: "Нижний левый второй молочный моляр", isPrimary: true, quadrant: 7, type: "molar_2" },
];

export const PERMANENT_SIX_TEETH: Readonly<Record<number, PediatricToothItem>> = {
	16: { toothNumber: 16, label: "16", anatomicalNameRu: "Верхний правый первый постоянный моляр", isPrimary: false, quadrant: 1, type: "permanent_molar_1" },
	26: { toothNumber: 26, label: "26", anatomicalNameRu: "Верхний левый первый постоянный моляр", isPrimary: false, quadrant: 2, type: "permanent_molar_1" },
	36: { toothNumber: 36, label: "36", anatomicalNameRu: "Нижний левый первый постоянный моляр", isPrimary: false, quadrant: 3, type: "permanent_molar_1" },
	46: { toothNumber: 46, label: "46", anatomicalNameRu: "Нижний правый первый постоянный моляр", isPrimary: false, quadrant: 4, type: "permanent_molar_1" },
};

export const PERMANENT_UPPER_RIGHT: readonly PediatricToothItem[] = [
	{ toothNumber: 18, label: "18", anatomicalNameRu: "Верхний правый третий моляр", isPrimary: false, quadrant: 1, type: "permanent_molar_1" },
	{ toothNumber: 17, label: "17", anatomicalNameRu: "Верхний правый второй моляр", isPrimary: false, quadrant: 1, type: "permanent_molar_1" },
	{ toothNumber: 16, label: "16", anatomicalNameRu: "Верхний правый первый моляр", isPrimary: false, quadrant: 1, type: "permanent_molar_1" },
	{ toothNumber: 15, label: "15", anatomicalNameRu: "Верхний правый второй премоляр", isPrimary: false, quadrant: 1, type: "molar_2" },
	{ toothNumber: 14, label: "14", anatomicalNameRu: "Верхний правый первый премоляр", isPrimary: false, quadrant: 1, type: "molar_1" },
	{ toothNumber: 13, label: "13", anatomicalNameRu: "Верхний правый постоянный клык", isPrimary: false, quadrant: 1, type: "canine" },
	{ toothNumber: 12, label: "12", anatomicalNameRu: "Верхний правый боковой резец", isPrimary: false, quadrant: 1, type: "incisor_lateral" },
	{ toothNumber: 11, label: "11", anatomicalNameRu: "Верхний правый центральный резец", isPrimary: false, quadrant: 1, type: "incisor_central" },
];

export const PERMANENT_UPPER_LEFT: readonly PediatricToothItem[] = [
	{ toothNumber: 21, label: "21", anatomicalNameRu: "Верхний левый центральный резец", isPrimary: false, quadrant: 2, type: "incisor_central" },
	{ toothNumber: 22, label: "22", anatomicalNameRu: "Верхний левый боковой резец", isPrimary: false, quadrant: 2, type: "incisor_lateral" },
	{ toothNumber: 23, label: "23", anatomicalNameRu: "Верхний левый постоянный клык", isPrimary: false, quadrant: 2, type: "canine" },
	{ toothNumber: 24, label: "24", anatomicalNameRu: "Верхний левый первый премоляр", isPrimary: false, quadrant: 2, type: "molar_1" },
	{ toothNumber: 25, label: "25", anatomicalNameRu: "Верхний левый второй премоляр", isPrimary: false, quadrant: 2, type: "molar_2" },
	{ toothNumber: 26, label: "26", anatomicalNameRu: "Верхний левый первый моляр", isPrimary: false, quadrant: 2, type: "permanent_molar_1" },
	{ toothNumber: 27, label: "27", anatomicalNameRu: "Верхний левый второй моляр", isPrimary: false, quadrant: 2, type: "permanent_molar_1" },
	{ toothNumber: 28, label: "28", anatomicalNameRu: "Верхний левый третий моляр", isPrimary: false, quadrant: 2, type: "permanent_molar_1" },
];

export const PERMANENT_LOWER_RIGHT: readonly PediatricToothItem[] = [
	{ toothNumber: 48, label: "48", anatomicalNameRu: "Нижний правый третий моляр", isPrimary: false, quadrant: 4, type: "permanent_molar_1" },
	{ toothNumber: 47, label: "47", anatomicalNameRu: "Нижний правый второй моляр", isPrimary: false, quadrant: 4, type: "permanent_molar_1" },
	{ toothNumber: 46, label: "46", anatomicalNameRu: "Нижний правый первый моляр", isPrimary: false, quadrant: 4, type: "permanent_molar_1" },
	{ toothNumber: 45, label: "45", anatomicalNameRu: "Нижний правый второй премоляр", isPrimary: false, quadrant: 4, type: "molar_2" },
	{ toothNumber: 44, label: "44", anatomicalNameRu: "Нижний правый первый премоляр", isPrimary: false, quadrant: 4, type: "molar_1" },
	{ toothNumber: 43, label: "43", anatomicalNameRu: "Нижний правый постоянный клык", isPrimary: false, quadrant: 4, type: "canine" },
	{ toothNumber: 42, label: "42", anatomicalNameRu: "Нижний правый боковой резец", isPrimary: false, quadrant: 4, type: "incisor_lateral" },
	{ toothNumber: 41, label: "41", anatomicalNameRu: "Нижний правый центральный резец", isPrimary: false, quadrant: 4, type: "incisor_central" },
];

export const PERMANENT_LOWER_LEFT: readonly PediatricToothItem[] = [
	{ toothNumber: 31, label: "31", anatomicalNameRu: "Нижний левый центральный резец", isPrimary: false, quadrant: 3, type: "incisor_central" },
	{ toothNumber: 32, label: "32", anatomicalNameRu: "Нижний левый боковой резец", isPrimary: false, quadrant: 3, type: "incisor_lateral" },
	{ toothNumber: 33, label: "33", anatomicalNameRu: "Нижний левый постоянный клык", isPrimary: false, quadrant: 3, type: "canine" },
	{ toothNumber: 34, label: "34", anatomicalNameRu: "Нижний левый первый премоляр", isPrimary: false, quadrant: 3, type: "molar_1" },
	{ toothNumber: 35, label: "35", anatomicalNameRu: "Нижний левый второй премоляр", isPrimary: false, quadrant: 3, type: "molar_2" },
	{ toothNumber: 36, label: "36", anatomicalNameRu: "Нижний левый первый моляр", isPrimary: false, quadrant: 3, type: "permanent_molar_1" },
	{ toothNumber: 37, label: "37", anatomicalNameRu: "Нижний левый второй моляр", isPrimary: false, quadrant: 3, type: "permanent_molar_1" },
	{ toothNumber: 38, label: "38", anatomicalNameRu: "Нижний левый третий моляр", isPrimary: false, quadrant: 3, type: "permanent_molar_1" },
];

export interface PediatricTeethChartProps {
	readonly activeTooth?: number | null | undefined;
	readonly onSelectTooth?: ((toothNumber: number) => void) | undefined;
	readonly mode?: PediatricDentitionMode;
	readonly onModeChange?: (mode: PediatricDentitionMode) => void;
	readonly toothFindings?: Readonly<Record<number, ToothClinicalFinding>>;
	readonly resorptionStages?: Readonly<Record<number, ResorptionStagePercent>> | undefined;
	readonly onResorptionChange?: ((toothNumber: number, stage: ResorptionStagePercent) => void) | undefined;
	readonly onToothFindingChange?: ((toothNumber: number, finding: ToothClinicalFinding) => void) | undefined;
	readonly toothSurfaces?: Readonly<Record<number, readonly ToothSurfaceCode[]>> | undefined;
	readonly onSurfaceToggle?: ((toothNumber: number, surface: ToothSurfaceCode) => void) | undefined;
	readonly onSetAllHealthy?: () => void;
	readonly onApplyMixedDentitionPreset?: () => void;
	readonly className?: string;
}
