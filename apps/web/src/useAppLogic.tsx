import { useAppLogic as useAppLogicCore } from "./hooks/appLogic";
import type { UseAppLogicReturn } from "./hooks/appLogic/types";

/**
 * Canonical facade for useAppLogic.
 * Decomposed under /decomposer skill and Mandate 8b into modular slices in ./hooks/appLogic/.
 */
export function useAppLogic(): UseAppLogicReturn {
	return useAppLogicCore();
}

export type * from "./hooks/appLogic/types";
