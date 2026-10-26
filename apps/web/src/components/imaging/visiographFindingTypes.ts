import type { ToothState } from "../odontogram/ToothChart";

export const AI_TO_TOOTH_STATE: Record<string, ToothState> = {
	treatment: "Caries",
	missing: "Missing",
};

export const AI_STATES_WITHOUT_FORMULA_STATE: Record<string, string> = {
	planned: "запланировано вмешательство",
	watch: "требует наблюдения",
	done: "ранее вылечен",
};

export interface VisiographFinding {
	readonly code: string;
	readonly toothNumber: number;
}

export interface VisiographFindingPlan {
	readonly groups: ReadonlyArray<{
		readonly state: ToothState;
		readonly teeth: readonly VisiographFinding[];
	}>;
	readonly unreadableCodes: readonly string[];
	readonly noFormulaStateCodes: readonly string[];
}
