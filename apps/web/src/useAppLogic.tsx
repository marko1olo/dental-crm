import { useAppLogic as useAppLogicCore } from "./hooks/appLogic";

/**
 * Canonical facade for useAppLogic.
 * Decomposed under /decomposer skill and Mandate 8b into modular slices in ./hooks/appLogic/.
 */
// biome-ignore lint/suspicious/noExplicitAny: master facade hook preserving full API contract
export function useAppLogic(): any {
	return useAppLogicCore();
}

export type * from "./hooks/appLogic/types";
