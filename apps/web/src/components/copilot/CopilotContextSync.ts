/**
 * CopilotContextSync.ts — Facade module for Copilot UI context synchronization.
 * Decomposed per Mandate 8b into ./contextSync/
 */

export type {
	Clinical043Snapshot,
	CopilotUiContext,
	CopilotContextState,
	ParsedCopilotMessage,
} from "./contextSync/contextSyncTypes";

export {
	VIEW_CANONICAL_NAMES,
	getCanonicalViewName,
} from "./contextSync/contextSyncTypes";

export {
	formatCopilotUiContextHeader,
	parseCopilotUiContextHeader,
} from "./contextSync/contextHeaderFormatter";

export {
	syncCopilotContextToWindow,
	enrichMessageWithUiContext,
	getCurrentCopilotUiContext,
} from "./contextSync/contextStoreReader";

export { useCopilotContextSync } from "./contextSync/useCopilotContextSyncHook";
