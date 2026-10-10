import type { StateCreator } from "zustand";
import { resolveUpdater } from "../updater";
import { initialMeasurementsState } from "./initialImagingState";
import type { ImagingStore, MeasurementsSlice } from "./types";

export const createMeasurementsSlice: StateCreator<
	ImagingStore,
	[],
	[],
	MeasurementsSlice
> = (set) => ({
	...initialMeasurementsState,
	setCtPlanningActiveQuickActionId: (val) =>
		set((state) => ({
			ctPlanningActiveQuickActionId: resolveUpdater(
				val,
				state.ctPlanningActiveQuickActionId,
			),
		})),
	setCtPlanningImplantPlan: (val) =>
		set((state) => ({
			ctPlanningImplantPlan: resolveUpdater(val, state.ctPlanningImplantPlan),
		})),
	setImagingViewerAnnotations: (val) =>
		set((state) => ({
			imagingViewerAnnotations: resolveUpdater(
				val,
				state.imagingViewerAnnotations,
			),
		})),
	setImagingViewerActiveTool: (val) =>
		set((state) => ({
			imagingViewerActiveTool: resolveUpdater(
				val,
				state.imagingViewerActiveTool,
			),
		})),
	setImagingViewerNote: (val) =>
		set((state) => ({
			imagingViewerNote: resolveUpdater(val, state.imagingViewerNote),
		})),
	setImagingViewerSession: (val) =>
		set((state) => ({
			imagingViewerSession: resolveUpdater(val, state.imagingViewerSession),
		})),
	setImagingViewerSaveState: (val) =>
		set((state) => ({
			imagingViewerSaveState: resolveUpdater(val, state.imagingViewerSaveState),
		})),
	setImagingViewerLocalSavedAt: (val) =>
		set((state) => ({
			imagingViewerLocalSavedAt: resolveUpdater(
				val,
				state.imagingViewerLocalSavedAt,
			),
		})),
	setImagingViewerSaveError: (val) =>
		set((state) => ({
			imagingViewerSaveError: resolveUpdater(val, state.imagingViewerSaveError),
		})),
	setImagingViewerSessionReady: (val) =>
		set((state) => ({
			imagingViewerSessionReady: resolveUpdater(
				val,
				state.imagingViewerSessionReady,
			),
		})),
});
