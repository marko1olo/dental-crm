import type { RecallCycleDefinition, RecallCycleType } from "./recallCycleTypes";
import { PROPHYLAXIS_RECALL_CYCLES } from "./recallCycleCatalogProphylaxis";
import { ORTHO_AND_RESTORATIVE_CYCLES } from "./recallCycleCatalogOrtho";

export const RECALL_CYCLE_CATALOG: Readonly<Record<RecallCycleType, RecallCycleDefinition>> = {
	...(PROPHYLAXIS_RECALL_CYCLES as Record<RecallCycleType, RecallCycleDefinition>),
	...(ORTHO_AND_RESTORATIVE_CYCLES as Record<RecallCycleType, RecallCycleDefinition>),
};
