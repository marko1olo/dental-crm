import { create } from "zustand";
import { createDicomWorkstationSlice } from "./createDicomWorkstationSlice";
import { createFilterSettingsSlice } from "./createFilterSettingsSlice";
import { createMeasurementsSlice } from "./createMeasurementsSlice";
import { createSliceNavigationSlice } from "./createSliceNavigationSlice";
import { initialImagingResetState } from "./initialImagingState";
import type { ImagingStore } from "./types";

export const useImagingStore = create<ImagingStore>((set, get, api) => ({
	...createSliceNavigationSlice(set, get, api),
	...createMeasurementsSlice(set, get, api),
	...createFilterSettingsSlice(set, get, api),
	...createDicomWorkstationSlice(set, get, api),
	reset: () => set(initialImagingResetState),
}));

export const selectMprNavigation = (state: ImagingStore) => ({
	mprProjection: state.mprProjection,
	mprAxisDeg: state.mprAxisDeg,
	mprSlabMm: state.mprSlabMm,
	mprSliceIndex: state.mprSliceIndex,
	mprCrosshairEnabled: state.mprCrosshairEnabled,
	mprLinkedPlanesEnabled: state.mprLinkedPlanesEnabled,
});

export const selectMeasurements = (state: ImagingStore) => ({
	activeTool: state.imagingViewerActiveTool,
	annotations: state.imagingViewerAnnotations,
	implantPlan: state.ctPlanningImplantPlan,
	quickActionId: state.ctPlanningActiveQuickActionId,
});

export const selectFilterSettings = (state: ImagingStore) => ({
	windowPreset: state.mprWindowPreset,
	viewerState: state.imagingViewerState,
	kindFilter: state.imagingKindFilter,
});

export * from "./createDicomWorkstationSlice";
export * from "./createFilterSettingsSlice";
export * from "./createMeasurementsSlice";
export * from "./createSliceNavigationSlice";
export * from "./initialImagingState";
export * from "./types";
