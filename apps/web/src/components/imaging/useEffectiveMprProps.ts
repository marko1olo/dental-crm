import { useMemo } from "react";
import type { ImagingMprPanelProps } from "./ImagingMprPanel";

export function useEffectiveMprProps(
	props: Record<string, any>,
	appLogic: any,
	overrides: {
		selectedImagingStudy: any;
		setLocalImageIds: (ids: string[]) => void;
		selectedImagingViewerPlan?: any;
		imagingViewerHref?: (study: any) => string;
	},
): ImagingMprPanelProps {
	return useMemo<ImagingMprPanelProps>(() => {
		const source = {
			...appLogic,
			...props,
		};

		return {
			...source,
			selectedImagingStudy: overrides.selectedImagingStudy,
			setLocalImageIds: overrides.setLocalImageIds,
			selectedImagingViewerPlan: overrides.selectedImagingViewerPlan ?? source.selectedImagingViewerPlan,
			imagingViewerHref: overrides.imagingViewerHref ?? source.imagingViewerHref ?? (() => "#"),
			imagingViewerSaveTitle: source.imagingViewerSaveTitle ?? {},
			imagingViewerSaveState: source.imagingViewerSaveState ?? "idle",
			mprControlsReady: Boolean(source.mprControlsReady),
			imagingViewerActiveTool: source.imagingViewerActiveTool ?? "window_level",
			applyCtPlanningQuickAction: source.applyCtPlanningQuickAction ?? (() => {}),
			selectCtPlanningImplant: source.selectCtPlanningImplant ?? (() => {}),
			setMprProjection: source.setMprProjection ?? (() => {}),
			mprProjectionLabels: source.mprProjectionLabels ?? {},
			mprAxisDeg: typeof source.mprAxisDeg === "number" ? source.mprAxisDeg : 0,
			mprAxisBounds: source.mprAxisBounds ?? { min: -180, max: 180 },
			clampMprAxisDeg: source.clampMprAxisDeg ?? ((d: number) => d),
			setMprAxisDeg: source.setMprAxisDeg ?? (() => {}),
			formatSignedMprStep: source.formatSignedMprStep ?? ((v: number, u: string) => `${v}${u}`),
			mprSlabBounds: source.mprSlabBounds ?? { min: 0, max: 50 },
			clampMprSlabMm: source.clampMprSlabMm ?? ((m: number) => m),
			setMprSlabMm: source.setMprSlabMm ?? (() => {}),
			mprSliceMaxIndex: typeof source.mprSliceMaxIndex === "number" ? source.mprSliceMaxIndex : 0,
			mprSafeSliceIndex: typeof source.mprSafeSliceIndex === "number" ? source.mprSafeSliceIndex : 0,
			clampMprSliceIndex: source.clampMprSliceIndex ?? ((i: number) => i),
			setMprSliceIndex: source.setMprSliceIndex ?? (() => {}),
			mprSliceIndexFromFraction: source.mprSliceIndexFromFraction ?? (() => 0),
			resetMprControls: source.resetMprControls ?? (() => {}),
			formatTime: source.formatTime ?? ((t: any) => String(t ?? "")),
			restoreMprWorkbenchLocalDraft: source.restoreMprWorkbenchLocalDraft ?? (() => {}),
			describeMprClinicalPresetProjectionFallback: source.describeMprClinicalPresetProjectionFallback ?? (() => ""),
			mprWindowPresetLabels: source.mprWindowPresetLabels ?? {},
			mprWindowPreset: source.mprWindowPreset ?? "bone",
			setMprWindowPreset: source.setMprWindowPreset ?? (() => {}),
			setMprCrosshairEnabled: source.setMprCrosshairEnabled ?? (() => {}),
			setMprLinkedPlanesEnabled: source.setMprLinkedPlanesEnabled ?? (() => {}),
		};
	}, [props, appLogic, overrides.selectedImagingStudy, overrides.setLocalImageIds, overrides.selectedImagingViewerPlan, overrides.imagingViewerHref]);
}
