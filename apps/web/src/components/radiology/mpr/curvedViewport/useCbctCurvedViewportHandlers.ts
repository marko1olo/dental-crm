/**
 * DENTE CRM — CBCT Panoramic & Cross-Section Interactive Viewport Handlers
 * Layer 3: Master Hook implementation coordinating curved viewport events
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

import { useCrossSectionViewportHandlers } from "./crossSectionHandlers";
import { usePanoramicViewportHandlers } from "./panoramicSliceHandlers";
import type {
	UseCbctCurvedViewportHandlersParams,
	UseCbctCurvedViewportHandlersResult,
} from "./types";

/**
 * Master hook aggregating interactive event handlers for both panoramic and cross-section viewports
 */
export function useCbctCurvedViewportHandlers(
	params: UseCbctCurvedViewportHandlersParams,
): UseCbctCurvedViewportHandlersResult {
	const panoHandlers = usePanoramicViewportHandlers(params);
	const crossSectionHandlers = useCrossSectionViewportHandlers(params);

	return {
		isDraggingPano: panoHandlers.isDraggingPano,
		handlePanoMouseDown: panoHandlers.handlePanoMouseDown,
		handlePanoMouseMove: panoHandlers.handlePanoMouseMove,
		handlePanoMouseUp: panoHandlers.handlePanoMouseUp,
		handleCrossSectionMouseDown:
			crossSectionHandlers.handleCrossSectionMouseDown,
		handleCrossSectionMouseMove:
			crossSectionHandlers.handleCrossSectionMouseMove,
		handleCrossSectionMouseUp:
			crossSectionHandlers.handleCrossSectionMouseUp,
	};
}
