/**
 * types.ts — Типы разметки КЛКТ и планирования имплантатов (Мандат 8b <= 120 строк).
 */

export const CT_PLANNING_SAVE_URL = "/api/imaging/planning/save";
export const CT_PLANNING_LOAD_PATH = "/api/imaging/planning/load";

export function ctPlanningLoadUrl(patientId: string, studyInstanceUid: string): string {
	const query = new URLSearchParams({ studyUid: studyInstanceUid, patientId });
	return `${CT_PLANNING_LOAD_PATH}?${query.toString()}`;
}

export interface WorldPoint3 {
	x: number;
	y: number;
	z: number;
}

export interface StoredImplant {
	id: string;
	fdiCode: string;
	diameter: number;
	length: number;
	startWorld: [number, number, number];
	endWorld: [number, number, number];
	boneDensity: { averageHU: number; classification: string };
	distanceToNerve?: number | null;
	systemId?: string | undefined;
	brandName?: string | undefined;
	lineName?: string | undefined;
	platformCode?: string | undefined;
	platformColor?: string | undefined;
}

export interface CtPlanningMarkup {
	splinePoints: WorldPoint3[];
	nervePoints: WorldPoint3[];
	implants: StoredImplant[];
}

export function emptyCtPlanningMarkup(): CtPlanningMarkup {
	return { splinePoints: [], nervePoints: [], implants: [] };
}

export function ctPlanningMarkupIsEmpty(markup: CtPlanningMarkup): boolean {
	return (
		markup.splinePoints.length === 0 &&
		markup.nervePoints.length === 0 &&
		markup.implants.length === 0
	);
}

export interface CtPlanningSaveBody {
	patientId: string;
	studyInstanceUid: string;
	splinePointsJson: string;
	nervePointsJson: string;
	implantsJson: string;
}

export type CtPlanningSaveOutcome =
	| { status: "saved" }
	| { status: "refused"; message: string };

export type CtPlanningLoadOutcome =
	| { status: "loaded"; markup: CtPlanningMarkup; hadRow: boolean }
	| { status: "refused"; message: string };
