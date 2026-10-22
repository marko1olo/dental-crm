import React, { Suspense } from "react";
import { ImagingViewport } from "./ImagingViewport";
import { ImagingToolbar } from "./ImagingToolbar";
import { ClinicalXrayProtocolPanel } from "./ClinicalXrayProtocolPanel";
import { DicomArchiveUploader } from "./DicomArchiveUploader";
import { ImagingEmptyStateStage } from "./ImagingEmptyStateStage";
import type { ViewerRulerMeasurement, AiProposal } from "./types";

export interface Imaging2dViewerSectionProps {
	selectedImagingStudy: any;
	localImageIds: string[];
	setLocalImageIds: (ids: string[]) => void;
	browserPickedImagingFolder?: any;
	imagingViewerState?: any;
	setImagingViewerState: (state: any) => void;
	defaultImagingViewerState?: any;
	computedViewerImageStyle: React.CSSProperties;
	effectivePreviewUrl?: string | null | undefined;
	isPreviewLoading: boolean;
	previewLoadError: boolean;
	selectedStudyHasFile: boolean;
	imagingKindLabels: Record<string, string>;
	isDicomwebLoading: boolean;
	dicomwebLoadProgress: string | null;
	onOpenCbctStudio: () => void;
	onLoadFromDicomweb: () => void;
	enhancementOn: boolean;
	setEnhancementOn: (on: boolean) => void;
	isRulerActive: boolean;
	setIsRulerActive: (active: boolean) => void;
	currentPixelSpacingMm: number;
	rulerMeasurements: ViewerRulerMeasurement[];
	setRulerMeasurements: (m: ViewerRulerMeasurement[]) => void;
	isPanActive: boolean;
	setIsPanActive: (active: boolean) => void;
	pickBrowserImagingFiles: () => void;
	isAnalyzingAI: boolean;
	onAnalyzeAI: () => void;
	selectedStudySummary: string | null;
	selectedStudyToothUpdates?: unknown[] | undefined;
	pendingAiProposal: AiProposal | null;
	setPendingAiProposal: (p: AiProposal | null) => void;
	setImagingViewerActiveTool?: ((tool: string) => void) | undefined;
	setCtPlanningActiveQuickActionId?: ((id: string | null) => void) | undefined;
	setCtPlanningImplantPlan?: ((plan: any) => void) | undefined;
	imagingViewerNote?: string | undefined;
	setImagingViewerNote?: ((note: string) => void) | undefined;
	imagingViewerSaveState?: string | undefined;
	imagingViewerSaveTitle?: Record<string, string> | undefined;
	imagingViewerSaveDetail?: string | undefined;
	imagingViewerNoteReady?: boolean | undefined;
	imagingViewerSessionReady?: boolean | undefined;
	imagingViewerNoteMissingId?: string | undefined;
	imagingViewerRetryMissingId?: string | undefined;
	canRetryImagingViewerSave?: boolean | undefined;
	retryImagingViewerSessionSave?: (() => void) | undefined;
	addImagingViewerNoteAnnotation?: (() => void) | undefined;
	imagingViewerAnnotations?: any[] | undefined;
	formatShortDate?: ((date: any) => string) | undefined;
	isOnline?: boolean | undefined;
	activeAppointment?: any;
	activePatient?: any;
	onAttachToTooth?: (toothCode: string) => Promise<void> | void;
	onAttachToVisit?: (visitId: string) => Promise<void> | void;
	onPickFolder?: () => void;
	onCaptureCamera?: () => void;
	onOpenRvgCapture?: () => void;
	onStudyUploaded?: (study: any) => void;
}

export function Imaging2dViewerSection(props: Imaging2dViewerSectionProps) {
	const {
		selectedImagingStudy,
		localImageIds,
		setLocalImageIds,
		browserPickedImagingFolder,
		imagingViewerState,
		setImagingViewerState,
		defaultImagingViewerState,
		computedViewerImageStyle,
		effectivePreviewUrl,
		isPreviewLoading,
		previewLoadError,
		selectedStudyHasFile,
		imagingKindLabels,
		isDicomwebLoading,
		dicomwebLoadProgress,
		onOpenCbctStudio,
		onLoadFromDicomweb,
		enhancementOn,
		setEnhancementOn,
		isRulerActive,
		setIsRulerActive,
		currentPixelSpacingMm,
		rulerMeasurements,
		setRulerMeasurements,
		isPanActive,
		setIsPanActive,
		pickBrowserImagingFiles,
		isAnalyzingAI,
		onAnalyzeAI,
		selectedStudySummary,
		selectedStudyToothUpdates,
		pendingAiProposal,
		setPendingAiProposal,
		setImagingViewerActiveTool,
		setCtPlanningActiveQuickActionId,
		setCtPlanningImplantPlan,
		imagingViewerNote,
		setImagingViewerNote,
		imagingViewerSaveState,
		imagingViewerSaveTitle,
		imagingViewerSaveDetail,
		imagingViewerNoteReady,
		imagingViewerSessionReady,
		imagingViewerNoteMissingId,
		imagingViewerRetryMissingId,
		canRetryImagingViewerSave,
		retryImagingViewerSessionSave,
		addImagingViewerNoteAnnotation,
		imagingViewerAnnotations,
		formatShortDate,
		isOnline,
		activeAppointment,
		activePatient,
		onAttachToTooth,
		onAttachToVisit,
		onPickFolder,
		onCaptureCamera,
		onOpenRvgCapture,
		onStudyUploaded,
	} = props;

	if (!selectedImagingStudy && localImageIds.length === 0 && !browserPickedImagingFolder) {
		return (
			<div className="w-full h-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-[460px]">
				<ImagingEmptyStateStage
					activePatient={activePatient}
					activeAppointment={activeAppointment}
					onPickFiles={pickBrowserImagingFiles}
					onPickFolder={onPickFolder}
					onCaptureCamera={onCaptureCamera}
					onOpenRvgCapture={onOpenRvgCapture}
					onStudyUploaded={onStudyUploaded}
				/>
			</div>
		);
	}

	return (
		<>
			<ImagingViewport
				selectedImagingStudy={selectedImagingStudy}
				localImageIds={localImageIds}
				setLocalImageIds={setLocalImageIds}
				browserPickedImagingFolder={browserPickedImagingFolder}
				imagingViewerState={imagingViewerState}
				setImagingViewerState={setImagingViewerState}
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
				onStudyUploaded={onStudyUploaded}
			/>

			<ImagingToolbar
				selectedImagingStudy={selectedImagingStudy}
				imagingViewerState={imagingViewerState}
				setImagingViewerState={setImagingViewerState}
				enhancementOn={enhancementOn}
				setEnhancementOn={setEnhancementOn}
				isRulerActive={isRulerActive}
				setIsRulerActive={setIsRulerActive}
				isPanActive={isPanActive}
				setIsPanActive={setIsPanActive}
				rulerMeasurements={rulerMeasurements}
				setRulerMeasurements={setRulerMeasurements}
				onReset={() => {
					setImagingViewerState({
						...defaultImagingViewerState,
						pan: { x: 0, y: 0 },
					});
					if (setImagingViewerActiveTool) setImagingViewerActiveTool("window_level");
					if (setCtPlanningActiveQuickActionId) setCtPlanningActiveQuickActionId(null);
					if (setCtPlanningImplantPlan) setCtPlanningImplantPlan(null);
					setIsRulerActive(false);
					setIsPanActive(false);
					setRulerMeasurements([]);
				}}
				imagingViewerNote={imagingViewerNote ?? ""}
				setImagingViewerNote={setImagingViewerNote ?? (() => {})}
				imagingViewerSaveState={imagingViewerSaveState ?? "saved"}
				imagingViewerSaveTitle={imagingViewerSaveTitle ?? {}}
				imagingViewerSaveDetail={imagingViewerSaveDetail ?? ""}
				imagingViewerNoteReady={Boolean(imagingViewerNoteReady)}
				imagingViewerSessionReady={Boolean(imagingViewerSessionReady)}
				canRetryImagingViewerSave={canRetryImagingViewerSave}
				retryImagingViewerSessionSave={retryImagingViewerSessionSave}
				addImagingViewerNoteAnnotation={addImagingViewerNoteAnnotation}
				imagingViewerAnnotations={imagingViewerAnnotations}
				formatShortDate={formatShortDate}
				activeAppointment={activeAppointment}
				{...(onAttachToTooth ? { onAttachToTooth } : {})}
				{...(onAttachToVisit ? { onAttachToVisit } : {})}
			/>

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
