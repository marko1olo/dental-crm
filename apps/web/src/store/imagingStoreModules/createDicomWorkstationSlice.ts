import type { StateCreator } from "zustand";
import { resolveUpdater } from "../updater";
import { initialDicomWorkstationState } from "./initialImagingState";
import type { DicomWorkstationSlice, ImagingStore } from "./types";

export const createDicomWorkstationSlice: StateCreator<
	ImagingStore,
	[],
	[],
	DicomWorkstationSlice
> = (set) => ({
	...initialDicomWorkstationState,
	setImagingImportText: (val) =>
		set((state) => ({
			imagingImportText: resolveUpdater(val, state.imagingImportText),
		})),
	setImagingImportSourceKind: (val) =>
		set((state) => ({
			imagingImportSourceKind: resolveUpdater(
				val,
				state.imagingImportSourceKind,
			),
		})),
	setLocalImagingFolderDraft: (val) =>
		set((state) => ({
			localImagingFolderDraft: resolveUpdater(
				val,
				state.localImagingFolderDraft,
			),
		})),
	setImagingFolderPath: (val) =>
		set((state) => ({
			imagingFolderPath: resolveUpdater(val, state.imagingFolderPath),
		})),
	setBrowserPickedImagingFolder: (val) =>
		set((state) => ({
			browserPickedImagingFolder: resolveUpdater(
				val,
				state.browserPickedImagingFolder,
			),
		})),
	setBrowserImagingScanProgress: (val) =>
		set((state) => ({
			browserImagingScanProgress: resolveUpdater(
				val,
				state.browserImagingScanProgress,
			),
		})),
	setBrowserDirectoryPickerAvailable: (val) =>
		set((state) => ({
			browserDirectoryPickerAvailable: resolveUpdater(
				val,
				state.browserDirectoryPickerAvailable,
			),
		})),
	setImagingImportPreview: (val) =>
		set((state) => ({
			imagingImportPreview: resolveUpdater(val, state.imagingImportPreview),
		})),
	setImagingImportCommit: (val) =>
		set((state) => ({
			imagingImportCommit: resolveUpdater(val, state.imagingImportCommit),
		})),
	setImagingFolderScan: (val) =>
		set((state) => ({
			imagingFolderScan: resolveUpdater(val, state.imagingFolderScan),
		})),
	setDicomLocalFolderDiscovery: (val) =>
		set((state) => ({
			dicomLocalFolderDiscovery: resolveUpdater(
				val,
				state.dicomLocalFolderDiscovery,
			),
		})),
	setLocalImagingOrganizer: (val) =>
		set((state) => ({
			localImagingOrganizer: resolveUpdater(val, state.localImagingOrganizer),
		})),
	setDicomSeriesPreview: (val) =>
		set((state) => ({
			dicomSeriesPreview: resolveUpdater(val, state.dicomSeriesPreview),
		})),
	setDicomFolderSeriesScan: (val) =>
		set((state) => ({
			dicomFolderSeriesScan: resolveUpdater(val, state.dicomFolderSeriesScan),
		})),
	setDicomFolderWorkupPlan: (val) =>
		set((state) => ({
			dicomFolderWorkupPlan: resolveUpdater(val, state.dicomFolderWorkupPlan),
		})),
	setDicomFirstFramePreview: (val) =>
		set((state) => ({
			dicomFirstFramePreview: resolveUpdater(val, state.dicomFirstFramePreview),
		})),
	setDicomFirstFrameViewerState: (val) =>
		set((state) => ({
			dicomFirstFrameViewerState: resolveUpdater(
				val,
				state.dicomFirstFrameViewerState,
			),
		})),
	setDicomWebEndpointUrl: (val) =>
		set((state) => ({
			dicomWebEndpointUrl: resolveUpdater(val, state.dicomWebEndpointUrl),
		})),
	setDicomWebCheck: (val) =>
		set((state) => ({
			dicomWebCheck: resolveUpdater(val, state.dicomWebCheck),
		})),
	setDicomViewerLaunchManifest: (val) =>
		set((state) => ({
			dicomViewerLaunchManifest: resolveUpdater(
				val,
				state.dicomViewerLaunchManifest,
			),
		})),
	setDicomViewerToolStateBundle: (val) =>
		set((state) => ({
			dicomViewerToolStateBundle: resolveUpdater(
				val,
				state.dicomViewerToolStateBundle,
			),
		})),
	setDicomViewerWorkbenchManifest: (val) =>
		set((state) => ({
			dicomViewerWorkbenchManifest: resolveUpdater(
				val,
				state.dicomViewerWorkbenchManifest,
			),
		})),
	setDicomWorkbenchLocalSavedAt: (val) =>
		set((state) => ({
			dicomWorkbenchLocalSavedAt: resolveUpdater(
				val,
				state.dicomWorkbenchLocalSavedAt,
			),
		})),
	setDicomWorkbenchServerBundle: (val) =>
		set((state) => ({
			dicomWorkbenchServerBundle: resolveUpdater(
				val,
				state.dicomWorkbenchServerBundle,
			),
		})),
	setDicomWorkbenchServerBundles: (val) =>
		set((state) => ({
			dicomWorkbenchServerBundles: resolveUpdater(
				val,
				state.dicomWorkbenchServerBundles,
			),
		})),
	setDicomWorkstationReadiness: (val) =>
		set((state) => ({
			dicomWorkstationReadiness: resolveUpdater(
				val,
				state.dicomWorkstationReadiness,
			),
		})),
	setDicomRenderCachePlan: (val) =>
		set((state) => ({
			dicomRenderCachePlan: resolveUpdater(val, state.dicomRenderCachePlan),
		})),
	setIsImagingImportLoading: (val) =>
		set((state) => ({
			isImagingImportLoading: resolveUpdater(val, state.isImagingImportLoading),
		})),
	setIsImagingImportCommitting: (val) =>
		set((state) => ({
			isImagingImportCommitting: resolveUpdater(
				val,
				state.isImagingImportCommitting,
			),
		})),
	setIsImagingFolderScanning: (val) =>
		set((state) => ({
			isImagingFolderScanning: resolveUpdater(
				val,
				state.isImagingFolderScanning,
			),
		})),
	setIsDicomLocalDiscovering: (val) =>
		set((state) => ({
			isDicomLocalDiscovering: resolveUpdater(
				val,
				state.isDicomLocalDiscovering,
			),
		})),
	setIsLocalImagingOrganizing: (val) =>
		set((state) => ({
			isLocalImagingOrganizing: resolveUpdater(
				val,
				state.isLocalImagingOrganizing,
			),
		})),
	setIsDicomSeriesPreviewLoading: (val) =>
		set((state) => ({
			isDicomSeriesPreviewLoading: resolveUpdater(
				val,
				state.isDicomSeriesPreviewLoading,
			),
		})),
	setIsDicomWebChecking: (val) =>
		set((state) => ({
			isDicomWebChecking: resolveUpdater(val, state.isDicomWebChecking),
		})),
	setIsDicomManifestBuilding: (val) =>
		set((state) => ({
			isDicomManifestBuilding: resolveUpdater(
				val,
				state.isDicomManifestBuilding,
			),
		})),
	setIsDicomToolStateBuilding: (val) =>
		set((state) => ({
			isDicomToolStateBuilding: resolveUpdater(
				val,
				state.isDicomToolStateBuilding,
			),
		})),
	setIsDicomWorkbenchBuilding: (val) =>
		set((state) => ({
			isDicomWorkbenchBuilding: resolveUpdater(
				val,
				state.isDicomWorkbenchBuilding,
			),
		})),
	setIsDicomWorkbenchServerSaving: (val) =>
		set((state) => ({
			isDicomWorkbenchServerSaving: resolveUpdater(
				val,
				state.isDicomWorkbenchServerSaving,
			),
		})),
	setIsDicomWorkbenchReconnecting: (val) =>
		set((state) => ({
			isDicomWorkbenchReconnecting: resolveUpdater(
				val,
				state.isDicomWorkbenchReconnecting,
			),
		})),
	setIsDicomWorkstationChecking: (val) =>
		set((state) => ({
			isDicomWorkstationChecking: resolveUpdater(
				val,
				state.isDicomWorkstationChecking,
			),
		})),
	setIsDicomRenderCachePlanning: (val) =>
		set((state) => ({
			isDicomRenderCachePlanning: resolveUpdater(
				val,
				state.isDicomRenderCachePlanning,
			),
		})),
	setIsDicomFolderWorkupPlanning: (val) =>
		set((state) => ({
			isDicomFolderWorkupPlanning: resolveUpdater(
				val,
				state.isDicomFolderWorkupPlanning,
			),
		})),
	setIsDicomFirstFramePreviewing: (val) =>
		set((state) => ({
			isDicomFirstFramePreviewing: resolveUpdater(
				val,
				state.isDicomFirstFramePreviewing,
			),
		})),
	setIsBrowserImagingFolderPicking: (val) =>
		set((state) => ({
			isBrowserImagingFolderPicking: resolveUpdater(
				val,
				state.isBrowserImagingFolderPicking,
			),
		})),
	setIsLocalDicomOperationActive: (val) =>
		set((state) => ({
			isLocalDicomOperationActive: resolveUpdater(
				val,
				state.isLocalDicomOperationActive,
			),
		})),
});
