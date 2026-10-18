import { useMemo, useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import {
	computeViewerImageStyle, useEffectiveMprProps, useImagingAiAnalysis,
	useImagingPreviewBlob, useImagingMeasurementsPersistence, type AiProposal,
} from "../../components/imaging";
import { useImagingDicomweb } from "./useImagingDicomweb";
import type { ImagingViewProps } from "./imagingViewTypes";

export function useImagingViewState(
	props: ImagingViewProps,
	appLogic: any,
	controller: {
		localImageIds: string[];
		setLocalImageIds: (ids: string[]) => void;
		handleAttachTooth: (toothCode: string) => Promise<void>;
		handleAttachVisit: (visitId: string) => Promise<void>;
		pickBrowserImagingFiles: () => void;
		setActiveModal: (modal: any) => void;
	},
) {
	const auth = appLogic?.auth;
	const {
		selectedImagingStudy, activePatient, defaultImagingViewerState,
		imagingViewerState, imagingPreviewSource, selectedImagingViewerPlan,
		imagingViewerHref, browserPickedImagingFolder, imagingKindLabels,
	} = props;

	const authHeaders = useMemo(() => {
		const clinicToken = readDenteClinicToken();
		const staffToken = readDenteStaffToken();
		const token = auth?.token || staffToken || clinicToken;
		return {
			...(clinicToken ? { "x-dente-clinic-token": clinicToken } : {}),
			...(staffToken ? { "x-dente-staff-token": staffToken } : {}),
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		};
	}, [auth?.token]);

	const { isDicomwebLoading, dicomwebLoadProgress, handleLoadFromDicomweb } = useImagingDicomweb({
		selectedImagingStudy, activePatientId: activePatient?.id, authHeaders,
		localImageIds: controller.localImageIds, setLocalImageIds: controller.setLocalImageIds,
	});

	const {
		isAnalyzingAI, enhancementOn, setEnhancementOn, selectedStudyHasFile,
		handleAnalyzeAI, selectedStudySummary, selectedStudyToothUpdates,
	} = useImagingAiAnalysis({ selectedImagingStudy, auth });

	const [pendingAiProposal, setPendingAiProposal] = useState<AiProposal | null>(null);
	const [isRulerActive, setIsRulerActive] = useState(false);
	const [isPanActive, setIsPanActive] = useState(false);
	const { rulerMeasurements, setRulerMeasurements } = useImagingMeasurementsPersistence({
		selectedImagingStudy, auth, setImagingViewerState: props.setImagingViewerState,
	});

	const currentPixelSpacingMm = useMemo(() => {
		const k = selectedImagingStudy?.kind;
		return (k === "rvg" || k === "periapical" || k === "bitewing") ? 0.04 : (k === "panoramic" || k === "opg") ? 0.10 : (k === "cbct" || k === "ct") ? 0.125 : 0.04;
	}, [selectedImagingStudy?.kind]);

	const computedViewerImageStyle = useMemo(
		() => computeViewerImageStyle(imagingViewerState || defaultImagingViewerState, isPanActive, props.imagingViewerImageStyle),
		[props.imagingViewerImageStyle, imagingViewerState, defaultImagingViewerState, isPanActive],
	);

	const { effectivePreviewUrl, isPreviewLoading, previewLoadError } = useImagingPreviewBlob({
		selectedImagingStudy, imagingPreviewSource, auth,
	});

	const isCbctActive = controller.localImageIds?.length > 0 || selectedImagingStudy?.kind === "cbct";
	const effectiveMprProps = useEffectiveMprProps(props, appLogic, {
		selectedImagingStudy, setLocalImageIds: controller.setLocalImageIds,
		selectedImagingViewerPlan, imagingViewerHref,
	});

	const viewer2dProps = {
		...props, selectedImagingStudy, localImageIds: controller.localImageIds,
		setLocalImageIds: controller.setLocalImageIds, browserPickedImagingFolder,
		imagingViewerState, setImagingViewerState: props.setImagingViewerState,
		defaultImagingViewerState, computedViewerImageStyle, effectivePreviewUrl,
		isPreviewLoading, previewLoadError, selectedStudyHasFile, imagingKindLabels,
		isDicomwebLoading, dicomwebLoadProgress, onOpenCbctStudio: () => controller.setActiveModal("cbct_studio"),
		onLoadFromDicomweb: handleLoadFromDicomweb, enhancementOn, setEnhancementOn,
		isRulerActive, setIsRulerActive, currentPixelSpacingMm, rulerMeasurements,
		setRulerMeasurements, isPanActive, setIsPanActive, pickBrowserImagingFiles: controller.pickBrowserImagingFiles,
		isAnalyzingAI, onAnalyzeAI: handleAnalyzeAI, selectedStudySummary,
		selectedStudyToothUpdates, pendingAiProposal, setPendingAiProposal,
		onAttachToTooth: controller.handleAttachTooth, onAttachToVisit: controller.handleAttachVisit,
	};

	return {
		isDicomwebLoading, dicomwebLoadProgress, handleLoadFromDicomweb,
		isAnalyzingAI, enhancementOn, selectedStudyHasFile, handleAnalyzeAI,
		selectedStudySummary, effectivePreviewUrl, isPreviewLoading,
		previewLoadError, isCbctActive, effectiveMprProps, viewer2dProps,
	};
}
