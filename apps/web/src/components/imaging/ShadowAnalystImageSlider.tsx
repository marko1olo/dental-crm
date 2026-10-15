/**
 * @file ShadowAnalystImageSlider.tsx
 * Canonical Compatibility Facade (Mandate 8s: Single Canonical Domain Authority).
 * 
 * Re-exports ClinicalImageViewer from ./ClinicalImageViewer.
 * Pseudo-AI "Shadow Analyst" split-slider has been decommissioned in favor of
 * the unified clinical image cockpit with calibrated root canal caliper (Mandate 8e).
 */

import React from "react";
import {
	ClinicalImageViewer,
	type ClinicalImageViewerProps,
	type ViewerRulerMeasurement,
	extractTransformParams,
} from "./ClinicalImageViewer";

export type { ViewerRulerMeasurement };
export { extractTransformParams };

export interface ShadowAnalystImageSliderProps extends ClinicalImageViewerProps {}

export function ShadowAnalystImageSlider(props: ShadowAnalystImageSliderProps) {
	return <ClinicalImageViewer {...props} />;
}

export default ShadowAnalystImageSlider;
