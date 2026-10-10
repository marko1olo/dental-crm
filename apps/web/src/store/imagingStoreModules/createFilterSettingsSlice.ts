import type { StateCreator } from "zustand";
import { resolveUpdater } from "../updater";
import { initialFilterSettingsState } from "./initialImagingState";
import type { FilterSettingsSlice, ImagingStore } from "./types";

export const createFilterSettingsSlice: StateCreator<
	ImagingStore,
	[],
	[],
	FilterSettingsSlice
> = (set) => ({
	...initialFilterSettingsState,
	setMprWindowPreset: (val) =>
		set((state) => ({
			mprWindowPreset: resolveUpdater(val, state.mprWindowPreset),
		})),
	setImagingViewerState: (val) =>
		set((state) => ({
			imagingViewerState: resolveUpdater(val, state.imagingViewerState),
		})),
	setSelectedImagingStudyId: (val) =>
		set((state) => ({
			selectedImagingStudyId: resolveUpdater(val, state.selectedImagingStudyId),
		})),
	setImagingKindFilter: (val) =>
		set((state) => ({
			imagingKindFilter: resolveUpdater(val, state.imagingKindFilter),
		})),
	setImagingCreateSavingKind: (val) =>
		set((state) => ({
			imagingCreateSavingKind: resolveUpdater(
				val,
				state.imagingCreateSavingKind,
			),
		})),
});
