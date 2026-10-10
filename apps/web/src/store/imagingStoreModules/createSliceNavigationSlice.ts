import type { StateCreator } from "zustand";
import { resolveUpdater } from "../updater";
import { initialSliceNavigationState } from "./initialImagingState";
import type { ImagingStore, SliceNavigationSlice } from "./types";

export const createSliceNavigationSlice: StateCreator<
	ImagingStore,
	[],
	[],
	SliceNavigationSlice
> = (set) => ({
	...initialSliceNavigationState,
	setMprProjection: (val) =>
		set((state) => ({
			mprProjection: resolveUpdater(val, state.mprProjection),
		})),
	setMprAxisDeg: (val) =>
		set((state) => ({
			mprAxisDeg: resolveUpdater(val, state.mprAxisDeg),
		})),
	setMprSlabMm: (val) =>
		set((state) => ({
			mprSlabMm: resolveUpdater(val, state.mprSlabMm),
		})),
	setMprSliceIndex: (val) =>
		set((state) => ({
			mprSliceIndex: resolveUpdater(val, state.mprSliceIndex),
		})),
	setMprCrosshairEnabled: (val) =>
		set((state) => ({
			mprCrosshairEnabled: resolveUpdater(val, state.mprCrosshairEnabled),
		})),
	setMprLinkedPlanesEnabled: (val) =>
		set((state) => ({
			mprLinkedPlanesEnabled: resolveUpdater(val, state.mprLinkedPlanesEnabled),
		})),
	setMprWorkbenchLocalSavedAt: (val) =>
		set((state) => ({
			mprWorkbenchLocalSavedAt: resolveUpdater(
				val,
				state.mprWorkbenchLocalSavedAt,
			),
		})),
	setMprWorkbenchDraftRestored: (val) =>
		set((state) => ({
			mprWorkbenchDraftRestored: resolveUpdater(
				val,
				state.mprWorkbenchDraftRestored,
			),
		})),
});
