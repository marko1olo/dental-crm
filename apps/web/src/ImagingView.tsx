import React, { useCallback, useRef, useState } from "react";
import { useAppLogicContext } from "./contexts/AppLogicContext";
import { MobileChairsideRadiologyViewer } from "./components/radiology/MobileChairsideRadiologyViewer.js";
import { isDemoShowcaseMode } from "./lib/demoMode";
import {
	imagingKindLabels as defaultImagingKindLabels,
	imagingKindOptions as defaultImagingKindOptions,
	imagingSourceLabels as defaultImagingSourceLabels,
} from "./imagingUiLabels";
import { ImagingHiddenInputs, imagingStudyHasFile } from "./components/imaging";
import {
	ImagingDesktopWorkspace, ImagingViewModals,
	useImagingViewController, useImagingViewState, type ImagingViewProps,
} from "./views/imagingViewModules";

export * from "./views/imagingViewModules";

/**
 * Безопасная миниатюра снимка: при 403 или ошибке загрузки рендерит аккуратный векторный датчик.
 * Сохраняет фиксированные размеры 48x48px (aspectRatio: 1 / 1) для нулевого CLS.
 */
export function ImagingStudyThumbnail({ study, previewSrc }: { study?: any; previewSrc?: string }) {
	const [hasError, setHasError] = useState(false);
	const src = previewSrc || study?.previewUrl;
	const isDirectBlob = src?.startsWith("blob:") || src?.startsWith("data:");

	if (hasError || !src || (!isDirectBlob && !imagingStudyHasFile(study))) {
		return (
			<div
				className="w-12 h-12 rounded-lg bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)] flex flex-col items-center justify-center text-[var(--teal,#0d9488)] shrink-0 select-none"
				style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
				title={study?.title || "Рентген-снимок"}
			>
				<svg viewBox="0 0 28 28" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5">
					<rect x="4" y="2" width="20" height="24" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" />
					<rect x="7" y="5" width="14" height="18" rx="2" stroke="currentColor" strokeOpacity="0.4" strokeDasharray="1.5 1.5" />
					<circle cx="14" cy="14" r="3" stroke="currentColor" strokeOpacity="0.7" />
				</svg>
			</div>
		);
	}

	return (
		<img
			src={src}
			alt=""
			loading="lazy"
			decoding="async"
			className="w-12 h-12 object-cover rounded-lg shrink-0 aspect-square border border-[var(--line,#334155)] bg-[var(--paper-soft,#1e293b)]"
			style={{ width: "48px", height: "48px", minWidth: "48px", minHeight: "48px", aspectRatio: "1 / 1" }}
			onError={() => setHasError(true)}
		/>
	);
}

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

	const [internalSelectedStudyId, setInternalSelectedStudyId] = useState<string | null>(null);
	const handleSelectStudy = useCallback((id: string) => {
		setInternalSelectedStudyId(id);
		setSelectedImagingStudyId?.(id);
	}, [setSelectedImagingStudyId]);

	const hasActive = Boolean(activeImagingStudies && activeImagingStudies.length > 0);
	const hasVisible = Boolean(visibleImagingStudies && visibleImagingStudies.length > 0);
	const hasDashboard = Boolean(props.dashboard?.imagingStudies && props.dashboard.imagingStudies.length > 0);

	const resolvedStudies = hasActive
		? (activeImagingStudies as any[])
		: hasVisible
			? (visibleImagingStudies as any[])
			: hasDashboard
				? (props.dashboard!.imagingStudies as any[])
				: isDemoShowcaseMode()
					? [
						{
							id: "sample_rvg_16",
							patientId: activePatient?.id || "sample_patient",
							kind: "periapical",
							title: "Прицельный снимок RVG #16 (Эндодонтия)",
							toothCode: "16",
							region: "posterior",
							previewUrl: "/radiology/sample_rvg_tooth16.jpg",
							hasFile: true,
							capturedAt: new Date().toISOString(),
						} as any,
						{
							id: "sample_rvg_36",
							patientId: activePatient?.id || "sample_patient",
							kind: "periapical",
							title: "Прицельный снимок RVG #36 (Контроль обтурации)",
							toothCode: "36",
							region: "posterior",
							previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
							hasFile: true,
							capturedAt: new Date().toISOString(),
						} as any,
						{
							id: "sample_optg_pano",
							patientId: activePatient?.id || "sample_patient",
							kind: "opg",
							title: "Панорамная томограмма (ОПТГ)",
							region: "maxilla_mandible",
							previewUrl: "/radiology/sample_optg_panoramic.png",
							hasFile: true,
							capturedAt: new Date().toISOString(),
						} as any,
						{
							id: "sample_rvg_pathology",
							patientId: activePatient?.id || "sample_patient",
							kind: "periapical",
							title: "Прицельный снимок RVG #26 (Периодонтит)",
							toothCode: "26",
							region: "posterior",
							previewUrl: "/radiology/sample_rvg_pathology.jpg",
							hasFile: true,
							capturedAt: new Date().toISOString(),
						} as any,
						{
							id: "sample_cbct_mandible",
							patientId: activePatient?.id || "sample_patient",
							kind: "cbct",
							title: "Конусно-лучевая томография КЛКТ (Romexis / Ez3D)",
							region: "mandible",
							previewUrl: "/radiology/sample_optg_panoramic.png",
							hasFile: true,
							capturedAt: new Date().toISOString(),
						} as any,
					]
					: [];
	const effectiveSelectedStudy =
		(internalSelectedStudyId ? resolvedStudies.find((s) => s.id === internalSelectedStudyId) : null) ??
		selectedImagingStudy ??
		resolvedStudies[0] ??
		null;

	const handleStudyUploaded = (study: any) => {
		if (study?.id) {
			handleSelectStudy(study.id);
		}
	};

	const controller = useImagingViewController({ ...props, selectedImagingStudy: effectiveSelectedStudy }, appLogic);
	const {
		activeModal, setActiveModal, localImageIds, setLocalImageIds, isCapturingCameraPhoto,
		openPopoutStudio, handleOpenPanoramic, handleCameraPhotoCapture,
	} = controller;

	const viewState = useImagingViewState({ ...props, selectedImagingStudy: effectiveSelectedStudy }, appLogic, {
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
					selectedImagingStudy={effectiveSelectedStudy} activeImagingStudies={resolvedStudies}
					activePatient={activePatient} onSelectStudy={handleSelectStudy}
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
				props={{ ...props, selectedImagingStudy: effectiveSelectedStudy, visibleImagingStudies: resolvedStudies }}
				activePatient={activePatient} activeAppointment={activeAppointment}
				activeImagingStudies={resolvedStudies} selectedImagingStudy={effectiveSelectedStudy}
				selectedImagingViewerPlan={selectedImagingViewerPlan} isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
				isCapturingCameraPhoto={isCapturingCameraPhoto} pickBrowserImagingFolder={() => void pickBrowserImagingFolder()}
				pickBrowserImagingFiles={pickBrowserImagingFiles} cameraCaptureInputRef={cameraCaptureInputRef}
				setActiveModal={setActiveModal} imagingKindFilter={imagingKindFilter} setImagingKindFilter={setImagingKindFilter}
				imagingToothFilter={imagingToothFilter} setImagingToothFilter={setImagingToothFilter}
				imagingKindOptions={imagingKindOptions} imagingKindLabels={imagingKindLabels}
				imagingSourceLabels={imagingSourceLabels} isCbctActive={viewState.isCbctActive} localImageIds={localImageIds}
				setLocalImageIds={setLocalImageIds} isDicomwebLoading={viewState.isDicomwebLoading}
				dicomwebLoadProgress={viewState.dicomwebLoadProgress} handleLoadFromDicomweb={viewState.handleLoadFromDicomweb}
				visibleImagingStudies={resolvedStudies} imagingPreviewSource={imagingPreviewSource}
				imagingViewerHref={imagingViewerHref} setSelectedImagingStudyId={handleSelectStudy}
				formatShortDate={formatShortDate} effectiveMprProps={viewState.effectiveMprProps}
				viewer2dProps={{
					...viewState.viewer2dProps,
					activePatient,
					activeAppointment,
					onPickFolder: () => void pickBrowserImagingFolder(),
					onCaptureCamera: () => cameraCaptureInputRef.current?.click(),
					onOpenRvgCapture: () => setActiveModal("rvg_capture"),
					onStudyUploaded: handleStudyUploaded,
				}}
			/>

			{/* <CbctMprImplantStudioModal patientId={activePatient?.id} /> delegated canonically to ImagingViewModals */}
			<ImagingViewModals
				isCbctStudioOpen={activeModal === "cbct_studio"} setIsCbctStudioOpen={(o) => setActiveModal(o ? "cbct_studio" : null)}
				isCtSelectorOpen={activeModal === "ct_selector"} setIsCtSelectorOpen={(o) => setActiveModal(o ? "ct_selector" : null)}
				isPanoramicWindowOpen={activeModal === "panoramic"} setIsPanoramicWindowOpen={(o) => setActiveModal(o ? "panoramic" : null)}
				isRadiologyModuleOpen={activeModal === "radiology_module"} setIsRadiologyModuleOpen={(o) => setActiveModal(o ? "radiology_module" : null)}
				isExportModalOpen={activeModal === "export"} setIsExportModalOpen={(o) => setActiveModal(o ? "export" : null)}
				isComparisonOpen={activeModal === "comparison"} setIsComparisonOpen={(o) => setActiveModal(o ? "comparison" : null)}
				isRvgCaptureOpen={activeModal === "rvg_capture"} setIsRvgCaptureOpen={(o) => setActiveModal(o ? "rvg_capture" : null)}
				rvgInitialTooth={controller.rvgInitialTooth} onRvgSaveToEmr={controller.handleRvgSaveToEmr}
				selectedImagingStudy={effectiveSelectedStudy} activePatient={activePatient} activeAppointment={activeAppointment}
				activeImagingStudies={resolvedStudies} authClinicName={auth?.clinic?.name}
				effectivePreviewUrl={viewState.effectivePreviewUrl} selectedStudySummary={viewState.selectedStudySummary}
				setSelectedImagingStudyId={handleSelectStudy} openPopoutStudio={openPopoutStudio}
			/>
		</section>
	);
}
