/**
 * useDicomWorkbenchState (Layer 3)
 *
 * Encapsulates computed state, local AbortController operations,
 * MPR slice clamping, session state, and imaging folder draft recovery.
 */

import type {
	Dashboard,
	ImagingViewerSessionState,
} from "@dental/shared";
import { useMemo, useRef, useState } from "react";
import {
	imagingViewerPlans,
	type LocalImagingFolderDraft,
} from "../../../AppConstants";
import {
	isBrowserImagingScanAbortError,
	viewerWindowPresetForStudy,
} from "../../../AppHelpers";
import {
	imagingCaptureDistanceMs,
	imagingComparisonScore,
} from "../../../imagingComparison";
import { useAppStore } from "../../../store/appStore";
import { useImagingStore } from "../../../store/imagingStore";
import { buildLocalImagingFolderRecoveryDraft } from "./dicomStudyLoader";
import { clampMprSlice } from "./dicomSyncCoordinator";
import type { DicomFirstFramePreviewRequestContext } from "./types";

export function useDicomWorkbenchState(
	currentView: string,
	visibleImagingStudies: Dashboard["imagingStudies"],
) {
	const imagingStore = useImagingStore();
	const { dashboard } = useAppStore();

	const [dicomFirstFramePreviewRequest, setDicomFirstFramePreviewRequest] =
		useState<DicomFirstFramePreviewRequestContext | null>(null);

	const localDicomOperationAbortRef = useRef<AbortController | null>(null);

	const activeOrganizationId =
		dashboard?.clinicSettings?.profile?.organizationId ?? null;

	const cbctWorkbenchSeries =
		imagingStore.dicomSeriesPreview?.series?.find(
			(series) => series.mprReadiness.volumeCandidate,
		) ??
		imagingStore.dicomSeriesPreview?.series?.find(
			(series) => series.recommendedViewer === "cbct_mpr",
		) ??
		null;

	const latestImagingStudy = visibleImagingStudies[0] ?? null;
	const selectedImagingStudy =
		visibleImagingStudies?.find(
			(study) => study.id === imagingStore.selectedImagingStudyId,
		) ?? latestImagingStudy;

	const selectedImagingViewerPlan = selectedImagingStudy
		? imagingViewerPlans[selectedImagingStudy.kind]
		: null;

	const latestDicomWorkbenchServerBundle =
		imagingStore.dicomWorkbenchServerBundles?.[0] ?? null;

	const mprSliceMaxIndex = Math.max(
		0,
		(cbctWorkbenchSeries?.fileCount ?? 1) - 1,
	);
	const mprSafeSliceIndex = clampMprSlice(
		imagingStore.mprSliceIndex,
		mprSliceMaxIndex,
	);

	const currentImagingViewerSessionState = useMemo<ImagingViewerSessionState>(
		() => ({
			mode:
				selectedImagingViewerPlan?.mode === "cbct_mpr"
					? "mpr"
					: selectedImagingViewerPlan?.mode === "photo"
						? "photo"
						: "two_d",
			activeTool: imagingStore.imagingViewerActiveTool,
			activeQuickActionId: imagingStore.ctPlanningActiveQuickActionId,
			windowPreset:
				selectedImagingStudy?.kind === "cbct"
					? imagingStore.mprWindowPreset
					: viewerWindowPresetForStudy(selectedImagingStudy?.kind),
			windowCenter: null,
			windowWidth: null,
			brightness: imagingStore.imagingViewerState.brightness,
			contrast: imagingStore.imagingViewerState.contrast,
			inverted: imagingStore.imagingViewerState.inverted,
			rotationDeg: imagingStore.imagingViewerState.rotationDeg,
			flipHorizontal: imagingStore.imagingViewerState.flipHorizontal,
			zoom: imagingStore.imagingViewerState.zoom,
			panX: 0,
			panY: 0,
			sliceIndex:
				selectedImagingStudy?.kind === "cbct" ? mprSafeSliceIndex : null,
			projection:
				selectedImagingStudy?.kind === "cbct"
					? imagingStore.mprProjection
					: null,
			axisDeg: imagingStore.mprAxisDeg,
			slabMm: imagingStore.mprSlabMm,
			crosshair: imagingStore.mprCrosshairEnabled,
			linkedPlanes: imagingStore.mprLinkedPlanesEnabled,
			implantPlan: imagingStore.ctPlanningImplantPlan,
		}),
		[
			imagingStore.ctPlanningActiveQuickActionId,
			imagingStore.ctPlanningImplantPlan,
			imagingStore.imagingViewerActiveTool,
			imagingStore.imagingViewerState,
			imagingStore.mprAxisDeg,
			imagingStore.mprCrosshairEnabled,
			imagingStore.mprLinkedPlanesEnabled,
			imagingStore.mprProjection,
			mprSafeSliceIndex,
			imagingStore.mprSlabMm,
			imagingStore.mprWindowPreset,
			selectedImagingStudy?.kind,
			selectedImagingViewerPlan?.mode,
		],
	);

	const imagingPreviewWorkset = useMemo(() => {
		if (currentView !== "imaging" || !dashboard?.imagingStudies?.length) {
			return [];
		}
		const activeStudies = (dashboard.imagingStudies || [])
			.filter((study) => study.patientId === dashboard?.activeVisit?.patientId)
			.sort((left, right) => right.capturedAt.localeCompare(left.capturedAt));
		const visibleStudies =
			imagingStore.imagingKindFilter === "all"
				? activeStudies
				: activeStudies.filter(
						(study) => study.kind === imagingStore.imagingKindFilter,
					);
		const selectedStudy =
			visibleStudies?.find(
				(study) => study.id === imagingStore.selectedImagingStudyId,
			) ??
			visibleStudies[0] ??
			null;
		const comparisonStudies = selectedStudy
			? activeStudies
					.filter((study) => study.id !== selectedStudy.id)
					.map((study) => ({
						study,
						score: imagingComparisonScore(selectedStudy, study),
					}))
					.sort(
						(left, right) =>
							right.score - left.score ||
							imagingCaptureDistanceMs(
								selectedStudy.capturedAt,
								left.study.capturedAt,
							) -
								imagingCaptureDistanceMs(
									selectedStudy.capturedAt,
									right.study.capturedAt,
								) ||
							right.study.capturedAt.localeCompare(left.study.capturedAt),
					)
					.slice(0, 4)
					.map((item) => item.study)
			: [];
		const workset = new Map<string, (typeof visibleStudies)[number]>();
		[selectedStudy, ...comparisonStudies, ...visibleStudies].forEach(
			(study) => {
				if (study) workset.set(study.id, study);
			},
		);
		return Array.from(workset.values());
	}, [
		currentView,
		dashboard,
		imagingStore.imagingKindFilter,
		imagingStore.selectedImagingStudyId,
	]);

	function stageLocalImagingFolderRecovery(
		folderPath: string,
		metadata: Partial<
			Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
		> = {},
	) {
		const draft = buildLocalImagingFolderRecoveryDraft(
			folderPath,
			metadata,
			activeOrganizationId,
		);
		imagingStore.setLocalImagingFolderDraft(draft);
		return draft;
	}

	function rememberLocalImagingFolder(
		folderPath: string,
		metadata: Partial<
			Omit<LocalImagingFolderDraft, "version" | "folderPath" | "savedAt">
		> = {},
	) {
		const draft = stageLocalImagingFolderRecovery(folderPath, metadata);
		if (draft) imagingStore.setImagingFolderPath(draft.folderPath);
		return draft;
	}

	function startLocalDicomOperation() {
		localDicomOperationAbortRef.current?.abort();
		const controller = new AbortController();
		localDicomOperationAbortRef.current = controller;
		imagingStore.setIsLocalDicomOperationActive(true);
		return controller;
	}

	function finishLocalDicomOperation(controller: AbortController) {
		if (localDicomOperationAbortRef.current !== controller) return;
		localDicomOperationAbortRef.current = null;
		imagingStore.setIsLocalDicomOperationActive(false);
	}

	function cancelLocalDicomOperation() {
		localDicomOperationAbortRef.current?.abort();
	}

	function isLocalDicomOperationAbortError(error: unknown) {
		return isBrowserImagingScanAbortError(error);
	}

	return {
		imagingStore,
		dashboard,
		activeOrganizationId,
		dicomFirstFramePreviewRequest,
		setDicomFirstFramePreviewRequest,
		cbctWorkbenchSeries,
		latestImagingStudy,
		selectedImagingStudy,
		selectedImagingViewerPlan,
		latestDicomWorkbenchServerBundle,
		mprSliceMaxIndex,
		mprSafeSliceIndex,
		currentImagingViewerSessionState,
		imagingPreviewWorkset,
		stageLocalImagingFolderRecovery,
		rememberLocalImagingFolder,
		startLocalDicomOperation,
		finishLocalDicomOperation,
		cancelLocalDicomOperation,
		isLocalDicomOperationAbortError,
	};
}
