import type { ToothState } from "../../odontogram/ToothChart";

export interface Point2D {
	x: number;
	y: number;
}

export interface OpgToothDetection {
	id: number | string;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	cx: number;
	cy: number;
	width: number;
	height: number;
	confidence: number;
}

export type OpgPathologyType = "impacted_tooth" | "periapical_lesion" | "caries" | "bone_loss";

export interface OpgPathologyDetection {
	id: number | string;
	label: OpgPathologyType;
	confidence: number;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	cx: number;
	cy: number;
}

export interface OpgToothSlot {
	fdi: number;
	quadrant: 1 | 2 | 3 | 4;
	slotNumber: number;
	status: ToothState;
	toothDetection?: OpgToothDetection | undefined;
	pathologies: OpgPathologyDetection[];
	clinicalDescriptionRu: string;
}

export interface OpgAnalysisResult {
	midlineX: number;
	splitY: number;
	teeth: Record<number, OpgToothSlot>;
	totalTeethDetected: number;
	missingTeethCount: number;
	impactedTeethCount: number;
	pathologiesCount: number;
	protocol043Ru: string;
	timestamp: string;
}

export const ALL_FDI_SLOTS: number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	48, 47, 46, 45, 44, 43, 42, 41,
	31, 32, 33, 34, 35, 36, 37, 38,
];
