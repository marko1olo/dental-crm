/**
 * index.ts — Public API barrel for DENTE AI Action Dispatcher.
 *
 * Implements:
 * - Mandate 8e: Doctor Autonomy
 * - Mandate 8l: Action Engine
 * - Mandate 8n: Scale Sovereignty
 */

export type {
	CRMActionCategory,
	CRMToolCall,
	CRMActionResult,
	ActionExecutionContext,
} from "./types.js";

export { normalizeToothNumber } from "./types.js";

export {
	isDestructiveAction,
	getActionTitleRu,
	dispatchCrmAction,
} from "./actionDispatcherCore.js";

export { handleClinicalAction } from "./clinicalActionHandlers.js";
export { handlePharmacologyAction } from "./pharmacologyActionHandlers.js";
export { handleSchedulingAction } from "./schedulingActionHandlers.js";
