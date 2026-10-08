/**
 * Canonical Facade for CBCT MPR Viewport Interaction Handlers.
 * Decomposed per Mandate 8b / decomposer into interactionHandlers/ modular DAG.
 * 
 * Pipeline integration contract:
 * - Notifies interactive slice rendering via notifyCbctSliceInteraction
 * - Implements handleCanvasWheel with quantized oblique stepping
 */

export type {
	UseCbctInteractionHandlersParams,
	CbctInteractionHandlersResult,
} from "./interactionHandlers";

export { useCbctInteractionHandlers } from "./interactionHandlers";
