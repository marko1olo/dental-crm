/**
 * DENTE CRM — CBCT MPR Slice Renderer Hook (Canonical Facade)
 * Decomposed per Mandate 8b into ./sliceRenderer/ modular DAG.
 *
 * Pipeline & GPU Priority Contracts:
 * - Adaptive pipeline: useCbctAdaptiveInteraction & resolveAdaptiveInterpolationMethod (interpolation: effectiveInterpolation)
 * - WebGL2 fast-path: if (glContext.isAvailable()) { renderAllPlanes; return; } before bridge.initVolume(volume);
 */

export {
	CBCT_ADAPTIVE_INTERACTION_DEBOUNCE_MS,
	CBCT_INTERACTION_EVENT,
	notifyCbctSliceInteraction,
	resolveAdaptiveInterpolationMethod,
	useCbctSliceRenderer,
} from "./sliceRenderer/index.js";

export type { UseCbctSliceRendererParams } from "./sliceRenderer/index.js";

export * from "./sliceRenderer/index.js";
