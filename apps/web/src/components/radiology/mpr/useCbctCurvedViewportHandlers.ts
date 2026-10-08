/**
 * DENTE CRM — CBCT Panoramic & Cross-Section Interactive Viewport Handlers
 * Layer 5: Canonical Facade per Mandate 8b & Mandate 8k (<50 lines).
 * Decomposed into modular DAG layers under ./curvedViewport/
 * Standards: DICOM Part 3, Planmeca Romexis 6.x, Vatech Ez3D-i
 */

export type {
	CurvedCrossSectionPlaneSpec,
	ImplantDragState,
	MeasurementHandleDragDescriptor,
	PendingPanoSync,
	SplineControlPoint2D,
	SplineTangentNormal2D,
	UseCbctCurvedViewportHandlersParams,
	UseCbctCurvedViewportHandlersResult,
} from "./curvedViewport/types";

export {
	useCbctCurvedViewportHandlers,
} from "./curvedViewport/useCbctCurvedViewportHandlers";

export * from "./curvedViewport/constants";
export * from "./curvedViewport/curveSplineMath";
export * from "./curvedViewport/panoramicSliceHandlers";
export * from "./curvedViewport/crossSectionHandlers";
export * from "./curvedViewport/viewportInteractionHandlers";
