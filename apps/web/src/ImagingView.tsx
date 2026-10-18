import React, { useRef } from "react";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { MobileChairsideRadiologyViewer } from "./components/radiology/MobileChairsideRadiologyViewer.js";
import {
	imagingKindLabels as defaultImagingKindLabels,
	imagingKindOptions as defaultImagingKindOptions,
	imagingSourceLabels as defaultImagingSourceLabels,
} from "./imagingUiLabels";
import { ImagingHiddenInputs } from "./components/imaging";
import {
	ImagingDesktopWorkspace, ImagingViewModals,
	useImagingViewController, useImagingViewState, type ImagingViewProps,
} from "./views/imagingViewModules";

export * from "./views/imagingViewModules";

export function ImagingView(props: ImagingViewProps) {
	const appLogic = useAppLogicContext();
	const auth = appLogic?.auth;
	const {
		activeAppointment, activeImagingStudies, activePatient, attachBrowserDirectoryInputRef,
		browserImagingFileInputAccept, formatShortDate, handleBrowserDirectoryInputChange,
		imagingKindFilter = "all", imagingToothFilter = "all", imagingPreviewSource,
		imagingViewerHref, isBrowserImagingFolderPicking, pickBrowserImagingFolder,
		selectedImagingStudy, selectedImagingViewerPlan, setImagingKindFilter,
		setImagingToothFilter, setSelectedImagingStudyId, visibleImagingStudies,
	} = props;
	const imagingKindLabels = props.imagingKindLabels ?? defaultImagingKindLabels;
	const imagingKindOptions = props.imagingKindOptions ?? defaultImagingKindOptions;
	const imagingSourceLabels = props.imagingSourceLabels ?? defaultImagingSourceLabels;

	const localFilesInputRef = useRef<HTMLInputElement | null>(null);
	const cameraCaptureInputRef = useRef<HTMLInputElement | null>(null);
	const browserImagingFilesInputRef = props.browserImagingFilesInputRef || localFilesInputRef;
	const pickBrowserImagingFiles = props.pickBrowserImagingFiles || (() => browserImagingFilesInputRef.current?.click());

	const controller = useImagingViewController(props, appLogic);
	const {
		activeModal, setActiveModal, localImageIds, setLocalImageIds, isCapturingCameraPhoto,
		openPopoutStudio, handleOpenPanoramic, handleCameraPhotoCapture,
	} = controller;

	const viewState = useImagingViewState(props, appLogic, {
		localImageIds, setLocalImageIds, handleAttachTooth: controller.handleAttachTooth,
		handleAttachVisit: controller.handleAttachVisit, pickBrowserImagingFiles, setActiveModal,
	});

	return (
		<section className="imaging-panel" id="imaging" aria-label="Снимки пациента">
			<ImagingHiddenInputs
				attachBrowserDirectoryInputRef={attachBrowserDirectoryInputRef}
				browserImagingFilesInputRef={browserImagingFilesInputRef}
				cameraCaptureInputRef={cameraCaptureInputRef}
				browserImagingFileInputAccept={browserImagingFileInputAccept}
				handleBrowserDirectoryInputChange={handleBrowserDirectoryInputChange}
				handleCameraPhotoCapture={handleCameraPhotoCapture}
			/>

			{/* 1. MOBILE CHAIRSIDE RADIOLOGY VIEWER (<768px, Apple HIG) */}
			<div className="block md:hidden w-full h-full">
				<MobileChairsideRadiologyViewer
					selectedImagingStudy={selectedImagingStudy} activeImagingStudies={activeImagingStudies ?? []}
					activePatient={activePatient} onSelectStudy={(id) => setSelectedImagingStudyId?.(id)}
					effectivePreviewUrl={viewState.effectivePreviewUrl} isPreviewLoading={viewState.isPreviewLoading}
					previewLoadError={viewState.previewLoadError} selectedStudyHasFile={viewState.selectedStudyHasFile}
					imagingKindLabels={imagingKindLabels} onCaptureCamera={() => cameraCaptureInputRef.current?.click()}
					onPickFiles={pickBrowserImagingFiles} onAnalyzeAI={viewState.handleAnalyzeAI}
					isAnalyzingAI={viewState.isAnalyzingAI} onOpenCbctStudio={() => setActiveModal("cbct_studio")}
					onOpenPanoramic={handleOpenPanoramic} onOpenRadiologyModule={() => setActiveModal("radiology_module")}
				/>
			</div>

			{/* 2. DESKTOP WORKSPACE (>=768px) */}
			<ImagingDesktopWorkspace
				props={props} activePatient={activePatient} activeAppointment={activeAppointment}
				activeImagingStudies={activeImagingStudies ?? []} selectedImagingStudy={selectedImagingStudy}
				selectedImagingViewerPlan={selectedImagingViewerPlan} isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
				isCapturingCameraPhoto={isCapturingCameraPhoto} pickBrowserImagingFolder={() => void pickBrowserImagingFolder()}
				pickBrowserImagingFiles={pickBrowserImagingFiles} cameraCaptureInputRef={cameraCaptureInputRef}
				setActiveModal={setActiveModal} imagingKindFilter={imagingKindFilter} setImagingKindFilter={setImagingKindFilter}
				imagingToothFilter={imagingToothFilter} setImagingToothFilter={setImagingToothFilter}
				imagingKindOptions={imagingKindOptions} imagingKindLabels={imagingKindLabels}
				imagingSourceLabels={imagingSourceLabels} isCbctActive={viewState.isCbctActive} localImageIds={localImageIds}
				setLocalImageIds={setLocalImageIds} isDicomwebLoading={viewState.isDicomwebLoading}
				dicomwebLoadProgress={viewState.dicomwebLoadProgress} handleLoadFromDicomweb={viewState.handleLoadFromDicomweb}
				visibleImagingStudies={visibleImagingStudies} imagingPreviewSource={imagingPreviewSource}
				imagingViewerHref={imagingViewerHref} setSelectedImagingStudyId={setSelectedImagingStudyId}
				formatShortDate={formatShortDate} effectiveMprProps={viewState.effectiveMprProps} viewer2dProps={viewState.viewer2dProps}
			/>

			<ImagingViewModals
				isCbctStudioOpen={activeModal === "cbct_studio"} setIsCbctStudioOpen={(o) => setActiveModal(o ? "cbct_studio" : null)}
				isCtSelectorOpen={activeModal === "ct_selector"} setIsCtSelectorOpen={(o) => setActiveModal(o ? "ct_selector" : null)}
				isPanoramicWindowOpen={activeModal === "panoramic"} setIsPanoramicWindowOpen={(o) => setActiveModal(o ? "panoramic" : null)}
				isRadiologyModuleOpen={activeModal === "radiology_module"} setIsRadiologyModuleOpen={(o) => setActiveModal(o ? "radiology_module" : null)}
				isExportModalOpen={activeModal === "export"} setIsExportModalOpen={(o) => setActiveModal(o ? "export" : null)}
				isComparisonOpen={activeModal === "comparison"} setIsComparisonOpen={(o) => setActiveModal(o ? "comparison" : null)}
				selectedImagingStudy={selectedImagingStudy} activePatient={activePatient} activeAppointment={activeAppointment}
				activeImagingStudies={activeImagingStudies ?? []} authClinicName={auth?.clinic?.name}
				effectivePreviewUrl={viewState.effectivePreviewUrl} selectedStudySummary={viewState.selectedStudySummary}
				setSelectedImagingStudyId={setSelectedImagingStudyId} openPopoutStudio={openPopoutStudio}
			/>
		</section>
	);
}
