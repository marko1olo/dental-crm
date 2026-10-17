import type { RecallCycleType } from "./recallCycleTypes";
import type { RecallCallingScript } from "./recallCallingScriptTypes";
import { PROPHYLAXIS_CALLING_SCRIPTS } from "./recallCallingScriptsProphylaxis";
import { SPECIALIZED_CALLING_SCRIPTS } from "./recallCallingScriptsSpecialized";

export const CLINICAL_CALLING_SCRIPTS: Readonly<Record<RecallCycleType, RecallCallingScript>> = {
	...(PROPHYLAXIS_CALLING_SCRIPTS as Record<RecallCycleType, RecallCallingScript>),
	...(SPECIALIZED_CALLING_SCRIPTS as Record<RecallCycleType, RecallCallingScript>),
};
