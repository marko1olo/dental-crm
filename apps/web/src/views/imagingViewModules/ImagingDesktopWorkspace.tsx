import React from "react";
import { ImagingHeader, Imaging2dViewerSection, ImagingMprPanel } from "../../components/imaging";
import { ImagingSeriesGallery } from "./ImagingSeriesGallery";
import { ImagingCbctActiveCard } from "./ImagingCbctActiveCard";
import type { ImagingModalId, ImagingStudy, ImagingViewProps } from "./imagingViewTypes";

export interface ImagingDesktopWorkspaceProps {
	props: ImagingViewProps;
	activePatient: { id?: string; name?: string; fullName?: string; cardNumber?: string; medicalCardNumber?: string; [key: string]: unknown } | null;
	activeAppointment: unknown;
	activeImagingStudies: ImagingStudy[];
	selectedImagingStudy: ImagingStudy | null;
	selectedImagingViewerPlan: unknown;
	isBrowserImagingFolderPicking: boolean;
	isCapturingCameraPhoto: boolean;
	pickBrowserImagingFolder: () => void;
	pickBrowserImagingFiles: () => void;
	cameraCaptureInputRef: React.RefObject<HTMLInputElement | null>;
	setActiveModal: (modal: ImagingModalId) => void;
	imagingKindFilter: string;
	setImagingKindFilter: (val: string) => void;
	imagingToothFilter: string;
	setImagingToothFilter: (val: string) => void;
	imagingKindOptions: Array<{ value: string; label: string; [key: string]: unknown }>;
	imagingKindLabels: Record<string, string>;
	imagingSourceLabels: Record<string, string>;
	isCbctActive: boolean;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
	isDicomwebLoading: boolean;
	dicomwebLoadProgress: string | null;
	handleLoadFromDicomweb: () => void;
	visibleImagingStudies: ImagingStudy[];
	imagingPreviewSource?: ((study: ImagingStudy) => string | undefined) | undefined;
	imagingViewerHref?: ((study: ImagingStudy) => string) | undefined;
	setSelectedImagingStudyId?: (id: string) => void;
	formatShortDate?: ((date: string) => string) | undefined;
	effectiveMprProps: Record<string, unknown>;
	viewer2dProps: Record<string, unknown>;
}

export function ImagingDesktopWorkspace({
	props, activePatient, activeAppointment, activeImagingStudies,
	selectedImagingStudy, selectedImagingViewerPlan, isBrowserImagingFolderPicking,
	isCapturingCameraPhoto, pickBrowserImagingFolder, pickBrowserImagingFiles,
	cameraCaptureInputRef, setActiveModal, imagingKindFilter, setImagingKindFilter,
	imagingToothFilter, setImagingToothFilter, imagingKindOptions, imagingKindLabels,
	imagingSourceLabels, isCbctActive, localImageIds, setLocalImageIds,
	isDicomwebLoading, dicomwebLoadProgress, handleLoadFromDicomweb,
	visibleImagingStudies, imagingPreviewSource, imagingViewerHref,
	setSelectedImagingStudyId, formatShortDate, effectiveMprProps, viewer2dProps,
}: ImagingDesktopWorkspaceProps) {
	return (
		<div className="hidden md:flex md:flex-col gap-3.5 w-full">
			<ImagingHeader
				activePatient={activePatient} activeAppointment={activeAppointment} activeImagingStudies={activeImagingStudies}
				selectedImagingViewerPlan={selectedImagingViewerPlan} isBrowserImagingFolderPicking={isBrowserImagingFolderPicking}
				isCapturingCameraPhoto={isCapturingCameraPhoto} onPickFolder={() => void pickBrowserImagingFolder()}
				onPickFiles={pickBrowserImagingFiles} onCaptureCamera={() => cameraCaptureInputRef.current?.click()}
				onOpenCbctStudio={() => setActiveModal("cbct_studio")} onOpenPanoramic={() => setActiveModal("panoramic")}
				onOpenRadiologyModule={() => setActiveModal("radiology_module")} onOpenRvgCapture={() => setActiveModal("rvg_capture")} onOpenCtSelector={() => setActiveModal("ct_selector")}
				onOpenExport={() => setActiveModal("export")} onOpenComparison={() => setActiveModal("comparison")}
				imagingKindFilter={imagingKindFilter} setImagingKindFilter={setImagingKindFilter}
				imagingKindOptions={imagingKindOptions} imagingKindLabels={imagingKindLabels}
			/>

			<div className="imaging-layout">
				<article className="imaging-viewer">
					{isCbctActive ? (
						<ImagingCbctActiveCard
							selectedImagingStudy={selectedImagingStudy} localImageIds={localImageIds}
							isDicomwebLoading={isDicomwebLoading} dicomwebLoadProgress={dicomwebLoadProgress}
							onOpenCbctStudio={() => setActiveModal("cbct_studio")}
							onLoadFromDicomweb={handleLoadFromDicomweb}
							onImagesLoaded={setLocalImageIds}
						/>
					) : (
						<Imaging2dViewerSection {...viewer2dProps} />
					)}
				</article>

				<ImagingSeriesGallery
					visibleImagingStudies={visibleImagingStudies} activeImagingStudies={activeImagingStudies}
					selectedImagingStudy={selectedImagingStudy} activePatient={activePatient}
					imagingKindFilter={imagingKindFilter} setImagingKindFilter={setImagingKindFilter}
					imagingToothFilter={imagingToothFilter} setImagingToothFilter={setImagingToothFilter}
					imagingKindLabels={imagingKindLabels} imagingSourceLabels={imagingSourceLabels}
					imagingPreviewSource={imagingPreviewSource} imagingViewerHref={imagingViewerHref}
					onSelectStudy={(id) => setSelectedImagingStudyId?.(id)} formatShortDate={formatShortDate}
				/>
			</div>

			{selectedImagingStudy?.kind === "cbct" ? <ImagingMprPanel {...effectiveMprProps} /> : null}
		</div>
	);
}
