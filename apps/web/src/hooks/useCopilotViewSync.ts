/**
 * useCopilotViewSync.ts — Two-way Copilot View & Context Synchronization Hook.
 * Bridges active CRM screen, patient UUID, tooth FDI, and doctor name into Copilot turns.
 */

export {
	useCopilotContextSync as useCopilotViewSync,
	useCopilotContextSync,
	formatCopilotUiContextHeader,
	parseCopilotUiContextHeader,
	enrichMessageWithUiContext,
	getCurrentCopilotUiContext,
	getCanonicalViewName,
	syncCopilotContextToWindow,
	VIEW_CANONICAL_NAMES,
	type CopilotUiContext,
	type ParsedCopilotMessage,
} from "../components/copilot/CopilotContextSync";
