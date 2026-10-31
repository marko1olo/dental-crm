import type {
	DicomFirstFramePreviewResponse,
	DicomFolderSeriesPreviewResponse,
	DicomFolderWorkupPlanResponse,
	DicomLocalFolderDiscoveryResponse,
	DicomSeriesPreviewGroup,
	ImagingFolderScanResponse,
	LocalImagingOrganizerResponse,
} from "@dental/shared";
import type { DicomFirstFrameViewerState, InputChangeEvent } from "../types";

export interface UseDicomViewerLogicParams {
	dicomFirstFramePreview?: any;
	dicomFirstFrameViewerState?: any;
	defaultDicomFirstFrameViewerState?: any;
	setDicomFirstFrameViewerState?: any;
	dicomSeriesPreview?: any;
	dicomLocalFolderDiscovery?: any;
	localImagingOrganizer?: any;
	imagingFolderScan?: any;
	dicomFolderSeriesScan?: any;
	dicomFolderWorkupPlan?: any;
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

	const typedDicomFirstFramePreview =
		dicomFirstFramePreview as DicomFirstFramePreviewResponse | null;
	const typedDicomFirstFrameViewerState =
		dicomFirstFrameViewerState as DicomFirstFrameViewerState;
	const typedDefaultDicomFirstFrameViewerState =
		defaultDicomFirstFrameViewerState as DicomFirstFrameViewerState;

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

	const typedDicomSeriesPreviewSeries = (dicomSeriesPreview?.series ??
		[]) as DicomSeriesPreviewGroup[];
	const typedDicomLocalFolderDiscovery =
		dicomLocalFolderDiscovery as DicomLocalFolderDiscoveryResponse | null;
	const typedLocalImagingOrganizer =
		localImagingOrganizer as LocalImagingOrganizerResponse | null;
	const typedImagingFolderScan =
		imagingFolderScan as ImagingFolderScanResponse | null;
	const typedDicomFolderSeriesScan =
		dicomFolderSeriesScan as DicomFolderSeriesPreviewResponse | null;
	const typedDicomFolderWorkupPlan =
		dicomFolderWorkupPlan as DicomFolderWorkupPlanResponse | null;

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
