import type React from "react";
import type {
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomSeriesPreviewGroup,
	DicomSeriesPreviewResponse,
	ImagingFolderScanResponse,
	LocalImagingOrganizerResponse,
} from "@dental/shared";
import type { DicomFirstFrameViewerState, InputChangeEvent } from "../types";

export interface UseDicomViewerLogicParams {
	dicomFirstFramePreview?: DicomFirstFramePreviewResponse | null;
	dicomFirstFrameViewerState?: DicomFirstFrameViewerState | null;
	defaultDicomFirstFrameViewerState?: DicomFirstFrameViewerState | null;
	setDicomFirstFrameViewerState?:
		| React.Dispatch<React.SetStateAction<DicomFirstFrameViewerState>>
		| ((updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState) => void);
	dicomSeriesPreview?: DicomSeriesPreviewResponse | { series?: DicomSeriesPreviewGroup[] } | null;
	dicomLocalFolderDiscovery?: DicomLocalFolderDiscoveryResponse | null;
	localImagingOrganizer?: LocalImagingOrganizerResponse | null;
	imagingFolderScan?: ImagingFolderScanResponse | null;
	dicomFolderSeriesScan?: DicomFolderSeriesPreviewResponse | null;
	dicomFolderWorkupPlan?: DicomFolderWorkupPlanResponse | null;
	isDicomFirstFramePreviewing?: boolean;
}

export function useDicomViewerLogic(params: UseDicomViewerLogicParams) {
	const {
		dicomFirstFramePreview,
		dicomFirstFrameViewerState,
		defaultDicomFirstFrameViewerState,
		setDicomFirstFrameViewerState,
		dicomSeriesPreview,
		dicomLocalFolderDiscovery,
		localImagingOrganizer,
		imagingFolderScan,
		dicomFolderSeriesScan,
		dicomFolderWorkupPlan,
		isDicomFirstFramePreviewing,
	} = params;

	const typedDicomFirstFramePreview = dicomFirstFramePreview ?? null;
	const typedDicomFirstFrameViewerState: DicomFirstFrameViewerState =
		dicomFirstFrameViewerState ??
		defaultDicomFirstFrameViewerState ?? {
			rotationDeg: 0,
			flipHorizontal: false,
			inverted: false,
			brightness: 1,
			contrast: 1,
			zoom: 1,
		};
	const typedDefaultDicomFirstFrameViewerState: DicomFirstFrameViewerState =
		defaultDicomFirstFrameViewerState ?? typedDicomFirstFrameViewerState;

	const dicomFirstFrameSelectableCount =
		typedDicomFirstFramePreview?.selectableFileCount ?? 0;
	const dicomFirstFrameCurrentIndex =
		typedDicomFirstFramePreview?.sourceFileIndex ?? null;
	const dicomFirstFrameSliceMaxIndex = Math.max(
		0,
		dicomFirstFrameSelectableCount - 1,
	);
	const dicomFirstFrameLandmarkSlices =
		dicomFirstFrameSelectableCount > 3
			? [
					{
						label: "25%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.25),
					},
					{
						label: "Центр",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.5),
					},
					{
						label: "75%",
						targetIndex: Math.round(dicomFirstFrameSliceMaxIndex * 0.75),
					},
				].filter(
					(item, index, items) =>
						items.findIndex(
							(candidate) => candidate.targetIndex === item.targetIndex,
						) === index,
				)
			: [];

	const dicomFirstFrameCanSelectPrevious =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameCurrentIndex > 0 &&
		!isDicomFirstFramePreviewing;
	const dicomFirstFrameCanSelectNext =
		typeof dicomFirstFrameCurrentIndex === "number" &&
		dicomFirstFrameSelectableCount > 0 &&
		dicomFirstFrameCurrentIndex < dicomFirstFrameSelectableCount - 1 &&
		!isDicomFirstFramePreviewing;

	const typedDicomSeriesPreviewSeries: DicomSeriesPreviewGroup[] =
		dicomSeriesPreview?.series ?? [];
	const typedDicomLocalFolderDiscovery = dicomLocalFolderDiscovery ?? null;
	const typedLocalImagingOrganizer = localImagingOrganizer ?? null;
	const typedImagingFolderScan = imagingFolderScan ?? null;
	const typedDicomFolderSeriesScan = dicomFolderSeriesScan ?? null;
	const typedDicomFolderWorkupPlan = dicomFolderWorkupPlan ?? null;

	const updateDicomFirstFrameViewerState = (
		updater: (state: DicomFirstFrameViewerState) => DicomFirstFrameViewerState,
	) => {
		if (setDicomFirstFrameViewerState) {
			setDicomFirstFrameViewerState((state: DicomFirstFrameViewerState) =>
				updater(state),
			);
		}
	};

	const updateDicomFirstFrameViewerNumber = (
		key: "brightness" | "contrast",
		event: InputChangeEvent,
	) => {
		const value = Number(event.target.value);
		updateDicomFirstFrameViewerState((state) => ({ ...state, [key]: value }));
	};

	return {
		typedDicomFirstFramePreview,
		typedDicomFirstFrameViewerState,
		typedDefaultDicomFirstFrameViewerState,
		dicomFirstFrameSelectableCount,
		dicomFirstFrameCurrentIndex,
		dicomFirstFrameSliceMaxIndex,
		dicomFirstFrameLandmarkSlices,
		dicomFirstFrameCanSelectPrevious,
		dicomFirstFrameCanSelectNext,
		typedDicomSeriesPreviewSeries,
		typedDicomLocalFolderDiscovery,
		typedLocalImagingOrganizer,
		typedImagingFolderScan,
		typedDicomFolderSeriesScan,
		typedDicomFolderWorkupPlan,
		updateDicomFirstFrameViewerState,
		updateDicomFirstFrameViewerNumber,
	};
}
