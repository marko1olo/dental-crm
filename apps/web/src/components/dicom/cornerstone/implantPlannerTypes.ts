/**
 * implantPlannerTypes.ts — Типы параметров и результатов позиционирования имплантата (Мандат 8b <= 120 строк).
 */

import type { ImplantData } from "../cornerstoneTypes";
import type { CtPlanningMarkup } from "../ctPlanningPersistence";

export interface ImplantPlacementParams {
	volumeId: string | null;
	selectedSystemId: string;
	selectedDiameter: number;
	selectedLength: number;
	selectedFdiCode: string;
	restoredMarkup: CtPlanningMarkup | null;
	renderingEngineId?: string;
}

export interface ImplantPlacementResult {
	implant: ImplantData;
	fdiCode: string;
	distToNerve: number | null;
}
