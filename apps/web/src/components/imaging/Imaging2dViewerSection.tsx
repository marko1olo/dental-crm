/**
 * Imaging2dViewerSection.tsx — Секция 2D-просмотрщика снимков с тулбаром и протоколом
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { ImagingViewport } from "./ImagingViewport.js";
import { ImagingSessionNotesSection } from "./imagingToolbar/ImagingSessionNotesSection.js";
import { ClinicalXrayProtocolPanel } from "./ClinicalXrayProtocolPanel.js";
import { ImagingEmptyStateStage } from "./ImagingEmptyStateStage.js";
import type { Imaging2dViewerSectionProps } from "./imaging2dViewer/types.js";
import { Imaging2dToolbarWrapper } from "./imaging2dViewer/Imaging2dToolbarWrapper.js";

export type { Imaging2dViewerSectionProps };

export function Imaging2dViewerSection(props: Imaging2dViewerSectionProps) {
	const {
		selectedImagingStudy, localImageIds, browserPickedImagingFolder,
		computedViewerImageStyle, effectivePreviewUrl, isPreviewLoading,
		previewLoadError, selectedStudyHasFile, imagingKindLabels,
		isDicomwebLoading, dicomwebLoadProgress, onOpenCbctStudio,
		onLoadFromDicomweb, enhancementOn, isRulerActive, currentPixelSpacingMm,
		rulerMeasurements, setRulerMeasurements, isPanActive, pickBrowserImagingFiles,
		isAnalyzingAI, onAnalyzeAI, selectedStudySummary, selectedStudyToothUpdates,
		pendingAiProposal, setPendingAiProposal, activeAppointment, activePatient,
		onPickFolder, onCaptureCamera, onOpenRvgCapture, onStudyUploaded,
	} = props;

	if (!selectedImagingStudy && localImageIds.length === 0 && !browserPickedImagingFolder) {
		return (
			<div className="w-full h-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-[460px]">
				<ImagingEmptyStateStage
					activePatient={activePatient}
					activeAppointment={activeAppointment}
					onPickFiles={pickBrowserImagingFiles}
					{...(onPickFolder ? { onPickFolder } : {})}
					{...(onCaptureCamera ? { onCaptureCamera } : {})}
					{...(onOpenRvgCapture ? { onOpenRvgCapture } : {})}
					{...(onStudyUploaded ? { onStudyUploaded } : {})}
				/>
			</div>
		);
	}

	return (
		<>
			<Imaging2dToolbarWrapper {...props} />

			<ImagingViewport
				selectedImagingStudy={selectedImagingStudy}
				localImageIds={localImageIds}
				setLocalImageIds={props.setLocalImageIds}
				browserPickedImagingFolder={browserPickedImagingFolder}
				imagingViewerState={props.imagingViewerState}
				setImagingViewerState={props.setImagingViewerState}
				computedViewerImageStyle={computedViewerImageStyle}
				effectivePreviewUrl={effectivePreviewUrl ?? null}
				isPreviewLoading={isPreviewLoading}
				previewLoadError={Boolean(previewLoadError)}
				selectedStudyHasFile={selectedStudyHasFile}
				imagingKindLabels={imagingKindLabels}
				isDicomwebLoading={isDicomwebLoading}
				dicomwebLoadProgress={dicomwebLoadProgress}
				onOpenCbctStudio={onOpenCbctStudio}
				onLoadFromDicomweb={onLoadFromDicomweb}
				enhancementOn={enhancementOn}
				isRulerActive={isRulerActive}
				currentPixelSpacingMm={currentPixelSpacingMm}
				rulerMeasurements={rulerMeasurements}
				setRulerMeasurements={setRulerMeasurements}
				isPanActive={isPanActive}
				onAttachFile={pickBrowserImagingFiles}
				isAnalyzingAI={isAnalyzingAI}
				onAnalyzeAI={onAnalyzeAI}
				selectedStudySummary={selectedStudySummary}
				pendingAiProposal={pendingAiProposal}
				setPendingAiProposal={setPendingAiProposal}
				{...(onStudyUploaded ? { onStudyUploaded } : {})}
			/>

			<div className="imaging-notes-dock border-t border-[var(--line)] bg-[var(--paper-soft)] p-2">
				<ImagingSessionNotesSection
					selectedImagingStudy={selectedImagingStudy}
					imagingViewerNote={props.imagingViewerNote ?? ""}
					setImagingViewerNote={props.setImagingViewerNote ?? (() => {})}
					imagingViewerSaveState={props.imagingViewerSaveState ?? "saved"}
					imagingViewerSaveTitle={props.imagingViewerSaveTitle ?? {}}
					imagingViewerSaveDetail={props.imagingViewerSaveDetail ?? ""}
					imagingViewerNoteReady={Boolean(props.imagingViewerNoteReady)}
					imagingViewerSessionReady={Boolean(props.imagingViewerSessionReady)}
					canRetryImagingViewerSave={props.canRetryImagingViewerSave}
					retryImagingViewerSessionSave={props.retryImagingViewerSessionSave}
					addImagingViewerNoteAnnotation={props.addImagingViewerNoteAnnotation}
				/>
			</div>

			{selectedStudySummary && (
				<div className="sa-report-column clinical-xray-report-column">
					<ClinicalXrayProtocolPanel
						summary={selectedStudySummary}
						toothUpdates={selectedStudyToothUpdates as any}
						studyTitle={selectedImagingStudy?.title}
						patientId={selectedImagingStudy?.patientId}
					/>
				</div>
			)}
		</>
	);
}
