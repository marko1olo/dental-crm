/**
 * useDicomWorkbenchModule (Layer 3 Coordinator Hook)
 *
 * Assembles DICOM workbench state, preview lifecycle, and mutation actions
 * into a single unified hook interface.
 */

import { useAppStore } from "../../../store/appStore";
import type { UseDicomWorkbenchParams } from "./types";
import { useDicomPreviewLifecycle } from "./useDicomPreviewLifecycle";
import { useDicomWorkbenchActions } from "./useDicomWorkbenchActions";
import { useDicomWorkbenchState } from "./useDicomWorkbenchState";

export function useDicomWorkbenchModule({
	auth,
	currentView,
	visibleImagingStudies,
}: UseDicomWorkbenchParams) {
	const { setError, ohifBaseUrl } = useAppStore();

	const state = useDicomWorkbenchState(currentView, visibleImagingStudies);
	const lifecycle = useDicomPreviewLifecycle(state.imagingPreviewWorkset, auth);
	const actions = useDicomWorkbenchActions({
		auth,
		state,
		setError,
		ohifBaseUrl,
	});

	return {
		// State
		imagingPreviewObjectUrls: lifecycle.imagingPreviewObjectUrls,
		dicomFirstFramePreviewRequest: state.dicomFirstFramePreviewRequest,

		// Computed
		selectedImagingStudy: state.selectedImagingStudy,
		selectedImagingViewerPlan: state.selectedImagingViewerPlan,
		cbctWorkbenchSeries: state.cbctWorkbenchSeries,
		latestDicomWorkbenchServerBundle: state.latestDicomWorkbenchServerBundle,
		currentImagingViewerSessionState: state.currentImagingViewerSessionState,
		mprSafeSliceIndex: state.mprSafeSliceIndex,
		mprSliceMaxIndex: state.mprSliceMaxIndex,
		imagingPreviewWorkset: state.imagingPreviewWorkset,
		latestImagingStudy: state.latestImagingStudy,

		// Folder recovery
		stageLocalImagingFolderRecovery: state.stageLocalImagingFolderRecovery,
		rememberLocalImagingFolder: state.rememberLocalImagingFolder,

		// Local operation helpers
		startLocalDicomOperation: state.startLocalDicomOperation,
		finishLocalDicomOperation: state.finishLocalDicomOperation,
		cancelLocalDicomOperation: state.cancelLocalDicomOperation,
		isLocalDicomOperationAbortError: state.isLocalDicomOperationAbortError,

		// DICOM workbench functions
		previewDicomFirstFrame: actions.previewDicomFirstFrame,
		previewDicomFirstFrameSlice: actions.previewDicomFirstFrameSlice,
		fetchDicomFolderWorkup: actions.fetchDicomFolderWorkup,
		selectPreferredDicomWorkupPlan: actions.selectPreferredDicomWorkupPlan,
		applyDicomFolderWorkupResult: actions.applyDicomFolderWorkupResult,
		buildDicomFolderWorkupPlan: actions.buildDicomFolderWorkupPlan,
		prepareDicomWorkbenchFromFolder: actions.prepareDicomWorkbenchFromFolder,
		previewDicomSeries: actions.previewDicomSeries,
		checkDicomWebConnector: actions.checkDicomWebConnector,
		buildDicomViewerWorkbenchManifest: actions.buildDicomViewerWorkbenchManifest,
		buildDicomViewerLaunchManifest: actions.buildDicomViewerLaunchManifest,
		buildDicomViewerToolStateBundle: actions.buildDicomViewerToolStateBundle,
		downloadDicomViewerToolStateBundle: actions.downloadDicomViewerToolStateBundle,
		downloadDicomWorkbenchManifest: actions.downloadDicomWorkbenchManifest,
		clearDicomWorkbenchRecovery: actions.clearDicomWorkbenchRecovery,
		applyDicomWorkbenchManifest: actions.applyDicomWorkbenchManifest,
		restoreDicomWorkbenchServerBundle: actions.restoreDicomWorkbenchServerBundle,
		loadDicomWorkbenchBundles: actions.loadDicomWorkbenchBundles,
		saveDicomWorkbenchBundleToServer: actions.saveDicomWorkbenchBundleToServer,
		retryImagingViewerSessionSave: actions.retryImagingViewerSessionSave,
		reconnectDicomWorkbenchFromCurrentFolder: actions.reconnectDicomWorkbenchFromCurrentFolder,
		checkDicomWorkstationReadiness: actions.checkDicomWorkstationReadiness,
		buildDicomRenderCachePlan: actions.buildDicomRenderCachePlan,
	};
}
