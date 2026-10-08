/**
 * useDicomWorkbenchModule — Canonical Facade (Layer 5)
 *
 * Re-exports DICOM / CT / CBCT viewer workbench logic from ./dicomWorkbench/
 * Preserves 100% public contracts, AST properties, and handler guards.
 */

import {
	useDicomWorkbenchModule as useDicomWorkbenchModuleImpl,
	type DicomFirstFramePreviewRequestContext,
	type UseDicomWorkbenchParams,
} from "./dicomWorkbench";

export type { DicomFirstFramePreviewRequestContext, UseDicomWorkbenchParams };

export function useDicomWorkbenchModule(params: UseDicomWorkbenchParams) {
	const mod = useDicomWorkbenchModuleImpl(params);

	return {
		imagingPreviewObjectUrls: mod.imagingPreviewObjectUrls,
		dicomFirstFramePreviewRequest: mod.dicomFirstFramePreviewRequest,
		selectedImagingStudy: mod.selectedImagingStudy,
		selectedImagingViewerPlan: mod.selectedImagingViewerPlan,
		cbctWorkbenchSeries: mod.cbctWorkbenchSeries,
		latestDicomWorkbenchServerBundle: mod.latestDicomWorkbenchServerBundle,
		currentImagingViewerSessionState: mod.currentImagingViewerSessionState,
		mprSafeSliceIndex: mod.mprSafeSliceIndex,
		mprSliceMaxIndex: mod.mprSliceMaxIndex,
		imagingPreviewWorkset: mod.imagingPreviewWorkset,
		latestImagingStudy: mod.latestImagingStudy,
		stageLocalImagingFolderRecovery: mod.stageLocalImagingFolderRecovery,
		rememberLocalImagingFolder: mod.rememberLocalImagingFolder,
		startLocalDicomOperation: mod.startLocalDicomOperation,
		finishLocalDicomOperation: mod.finishLocalDicomOperation,
		cancelLocalDicomOperation: mod.cancelLocalDicomOperation,
		isLocalDicomOperationAbortError: mod.isLocalDicomOperationAbortError,
		previewDicomFirstFrame: mod.previewDicomFirstFrame,
		previewDicomFirstFrameSlice: mod.previewDicomFirstFrameSlice,
		fetchDicomFolderWorkup: mod.fetchDicomFolderWorkup,
		selectPreferredDicomWorkupPlan: mod.selectPreferredDicomWorkupPlan,
		applyDicomFolderWorkupResult: mod.applyDicomFolderWorkupResult,
		buildDicomFolderWorkupPlan: mod.buildDicomFolderWorkupPlan,
		prepareDicomWorkbenchFromFolder: mod.prepareDicomWorkbenchFromFolder,
		previewDicomSeries: mod.previewDicomSeries,
		checkDicomWebConnector: mod.checkDicomWebConnector,
		buildDicomViewerWorkbenchManifest: mod.buildDicomViewerWorkbenchManifest,
		buildDicomViewerLaunchManifest: mod.buildDicomViewerLaunchManifest,
		buildDicomViewerToolStateBundle: mod.buildDicomViewerToolStateBundle,
		downloadDicomViewerToolStateBundle: mod.downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest: mod.downloadDicomWorkbenchManifest,
		clearDicomWorkbenchRecovery: mod.clearDicomWorkbenchRecovery,
		applyDicomWorkbenchManifest: mod.applyDicomWorkbenchManifest,
		restoreDicomWorkbenchServerBundle: mod.restoreDicomWorkbenchServerBundle,
		loadDicomWorkbenchBundles: mod.loadDicomWorkbenchBundles,
		saveDicomWorkbenchBundleToServer: mod.saveDicomWorkbenchBundleToServer,
		retryImagingViewerSessionSave: mod.retryImagingViewerSessionSave,
		reconnectDicomWorkbenchFromCurrentFolder: mod.reconnectDicomWorkbenchFromCurrentFolder,
		checkDicomWorkstationReadiness: mod.checkDicomWorkstationReadiness,
		buildDicomRenderCachePlan: mod.buildDicomRenderCachePlan,
	};
}
