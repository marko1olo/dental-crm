import { useMemo } from "react";
import type { ImagingStudy } from "@dental/shared";
import type { ImagingStudy as LocalImagingStudy } from "./types.js";
import type { ImagingViewerPlan } from "../../constants/imagingConstants";
import type { ImagingMprPanelProps } from "./ImagingMprPanel";

export function useEffectiveMprProps(
	props: Record<string, unknown> | null | undefined,
	appLogic: Record<string, unknown> | null | undefined,
	overrides: {
		selectedImagingStudy: unknown;
		setLocalImageIds: (ids: string[]) => void;
		selectedImagingViewerPlan?: unknown;
		imagingViewerHref?: unknown;
	},
): ImagingMprPanelProps {
	return useMemo<ImagingMprPanelProps>(() => {
		const source = {
			...(appLogic ?? {}),
			...(props ?? {}),
		} as Record<string, unknown>;

		return {
			...source,
			selectedImagingStudy: overrides.selectedImagingStudy as ImagingStudy | null | undefined,
			setLocalImageIds: overrides.setLocalImageIds,
			selectedImagingViewerPlan: (overrides.selectedImagingViewerPlan ?? source.selectedImagingViewerPlan) as ImagingViewerPlan | null | undefined,
			imagingViewerHref: (overrides.imagingViewerHref ?? source.imagingViewerHref ?? (() => "#")) as (study?: ImagingStudy | null) => string,
			imagingViewerSaveTitle: (source.imagingViewerSaveTitle as Record<string, string>) ?? {},
			imagingViewerSaveState: (source.imagingViewerSaveState as string) ?? "idle",
			mprControlsReady: Boolean(source.mprControlsReady),
			imagingViewerActiveTool: (source.imagingViewerActiveTool as string) ?? "window_level",
			applyCtPlanningQuickAction: (source.applyCtPlanningQuickAction as ((id: string) => void)) ?? (() => {}),
			selectCtPlanningImplant: (source.selectCtPlanningImplant as ((id: string | null) => void)) ?? (() => {}),
			setMprProjection: (source.setMprProjection as ((p: string) => void)) ?? (() => {}),
			mprProjectionLabels: (source.mprProjectionLabels as Record<string, string>) ?? {},
			mprAxisDeg: typeof source.mprAxisDeg === "number" ? source.mprAxisDeg : 0,
			mprAxisBounds: (source.mprAxisBounds as { min: number; max: number }) ?? { min: -180, max: 180 },
			clampMprAxisDeg: (source.clampMprAxisDeg as ((d: number) => number)) ?? ((d: number) => d),
			setMprAxisDeg: (source.setMprAxisDeg as ((d: number) => void)) ?? (() => {}),
			formatSignedMprStep: (source.formatSignedMprStep as ((v: number, u: string) => string)) ?? ((v: number, u: string) => `${v}${u}`),
			mprSlabBounds: (source.mprSlabBounds as { min: number; max: number }) ?? { min: 0, max: 50 },
			clampMprSlabMm: (source.clampMprSlabMm as ((m: number) => number)) ?? ((m: number) => m),
			setMprSlabMm: (source.setMprSlabMm as ((m: number) => void)) ?? (() => {}),
			mprSliceMaxIndex: typeof source.mprSliceMaxIndex === "number" ? source.mprSliceMaxIndex : 0,
			mprSafeSliceIndex: typeof source.mprSafeSliceIndex === "number" ? source.mprSafeSliceIndex : 0,
			clampMprSliceIndex: (source.clampMprSliceIndex as ((i: number, max: number) => number)) ?? ((i: number) => i),
			setMprSliceIndex: (source.setMprSliceIndex as ((i: number) => void)) ?? (() => {}),
			mprSliceIndexFromFraction: (source.mprSliceIndexFromFraction as ((f: number, max: number) => number)) ?? (() => 0),
			resetMprControls: (source.resetMprControls as (() => void)) ?? (() => {}),
			formatTime: (source.formatTime as ((t: unknown) => string)) ?? ((t: unknown) => String(t ?? "")),
			restoreMprWorkbenchLocalDraft: (source.restoreMprWorkbenchLocalDraft as (() => void)) ?? (() => {}),
			describeMprClinicalPresetProjectionFallback: (source.describeMprClinicalPresetProjectionFallback as ((p: string, s?: readonly string[], l?: Record<string, string>) => string | null)) ?? (() => ""),
			mprWindowPresetLabels: (source.mprWindowPresetLabels as Record<string, string>) ?? {},
			mprWindowPreset: (source.mprWindowPreset as string) ?? "bone",
			setMprWindowPreset: (source.setMprWindowPreset as ((p: string) => void)) ?? (() => {}),
			setMprCrosshairEnabled: (source.setMprCrosshairEnabled as ((e: boolean) => void)) ?? (() => {}),
			setMprLinkedPlanesEnabled: (source.setMprLinkedPlanesEnabled as ((e: boolean) => void)) ?? (() => {}),
		};
	}, [props, appLogic, overrides.selectedImagingStudy, overrides.setLocalImageIds, overrides.selectedImagingViewerPlan, overrides.imagingViewerHref]);
}
