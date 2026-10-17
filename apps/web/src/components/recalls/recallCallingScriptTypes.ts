import type { RecallCycleType } from "./recallCycleTypes";

export interface RecallScriptObjection {
	readonly id: string;
	readonly title: string;
	readonly patientPhrase: string;
	readonly clinicalRationale: string;
	readonly suggestedResponse: string;
	readonly psychologicalTip: string;
}

export interface RecallCallingScript {
	readonly cycleType: RecallCycleType;
	readonly title: string;
	readonly greeting: string;
	readonly clinicalContext: string;
	readonly callToAction: string;
	readonly objections: readonly RecallScriptObjection[];
}
