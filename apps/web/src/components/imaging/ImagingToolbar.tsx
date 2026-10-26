/**
 * ImagingToolbar.tsx — Панель инструментов просмотра снимка (зум, панорамирование, фильтры, экспорт)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import type { ImagingStudy, ImagingViewerState, ViewerRulerMeasurement } from "./types.js";
import { ImagingOrientationGroup } from "./imagingToolbar/ImagingOrientationGroup.js";
import { ImagingZoomPanGroup } from "./imagingToolbar/ImagingZoomPanGroup.js";
import { ImagingFilterRulerGroup } from "./imagingToolbar/ImagingFilterRulerGroup.js";
import { ImagingBrightnessContrastSliders } from "./imagingToolbar/ImagingBrightnessContrastSliders.js";
import { ImagingSessionNotesSection } from "./imagingToolbar/ImagingSessionNotesSection.js";
import { ImagingToolbarRightActions } from "./imagingToolbar/ImagingToolbarRightActions.js";

export interface ImagingToolbarProps {
	selectedImagingStudy?: ImagingStudy | null | undefined;
	imagingViewerState: ImagingViewerState;
	setImagingViewerState: React.Dispatch<React.SetStateAction<ImagingViewerState>> | ((state: any) => void);
	enhancementOn: boolean;
	setEnhancementOn: React.Dispatch<React.SetStateAction<boolean>> | ((on: boolean) => void);
	isRulerActive: boolean;
	setIsRulerActive: React.Dispatch<React.SetStateAction<boolean>> | ((active: boolean) => void);
	isPanActive: boolean;
	setIsPanActive: React.Dispatch<React.SetStateAction<boolean>> | ((active: boolean) => void);
	rulerMeasurements: ViewerRulerMeasurement[];
	setRulerMeasurements: (measurements: ViewerRulerMeasurement[]) => void;
	onReset: () => void;
	imagingViewerNote: string;
	setImagingViewerNote: (note: string) => void;
	imagingViewerSaveState: "saved" | "saving" | "unsaved" | "error" | string;
	imagingViewerSaveTitle: Record<string, string>;
	imagingViewerSaveDetail: string;
	imagingViewerNoteReady: boolean;
	imagingViewerSessionReady: boolean;
	canRetryImagingViewerSave?: boolean | undefined;
	retryImagingViewerSessionSave?: (() => void) | undefined;
	addImagingViewerNoteAnnotation?: (() => void) | undefined;
	imagingViewerAnnotations?: Array<{ id: string; label: string; toothCode?: string | null | undefined; updatedAt: string }> | undefined;
	formatShortDate?: ((date: string) => string) | undefined;
	activeAppointment?: { id: string; date?: string; patientName?: string } | null | undefined;
	activePatient?: any;
	effectivePreviewUrl?: string | null | undefined;
	onAttachToTooth?: ((toothCode: string) => Promise<void> | void) | undefined;
	onAttachToVisit?: ((visitId: string) => Promise<void> | void) | undefined;
	showNotes?: boolean;
}

export function ImagingToolbar(props: ImagingToolbarProps) {
	const {
		selectedImagingStudy, imagingViewerState, setImagingViewerState, enhancementOn, setEnhancementOn,
		isRulerActive, setIsRulerActive, isPanActive, setIsPanActive, rulerMeasurements, setRulerMeasurements,
		onReset, imagingViewerNote, setImagingViewerNote, imagingViewerSaveState, imagingViewerSaveTitle,
		imagingViewerSaveDetail, imagingViewerNoteReady, imagingViewerSessionReady, canRetryImagingViewerSave,
		retryImagingViewerSessionSave, addImagingViewerNoteAnnotation, imagingViewerAnnotations, formatShortDate,
		activeAppointment, activePatient, effectivePreviewUrl, onAttachToTooth, onAttachToVisit,
		showNotes = true,
	} = props;

	const previewSrc = effectivePreviewUrl || selectedImagingStudy?.previewUrl;

	return (
		<div className="imaging-viewer-toolbar flex flex-col gap-1.5 p-2 bg-[var(--paper-soft)] border-b border-[var(--line)]" role="toolbar" aria-label="Настройки снимка">
			<div className="imaging-viewer-tools flex flex-wrap items-center justify-between gap-1.5 min-h-[36px]">
				<div className="flex items-center gap-1.5 flex-wrap">
					<ImagingOrientationGroup imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} />
					<ImagingZoomPanGroup imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} isPanActive={isPanActive} setIsPanActive={setIsPanActive as any} setIsRulerActive={setIsRulerActive as any} />
					<ImagingFilterRulerGroup imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} enhancementOn={enhancementOn} setEnhancementOn={setEnhancementOn as any} isRulerActive={isRulerActive} setIsRulerActive={setIsRulerActive as any} setIsPanActive={setIsPanActive as any} rulerMeasurements={rulerMeasurements} setRulerMeasurements={setRulerMeasurements} />
				</div>

				<ImagingToolbarRightActions
					selectedImagingStudy={selectedImagingStudy}
					activeAppointment={activeAppointment}
					activePatient={activePatient}
					previewSrc={previewSrc}
					rulerMeasurementsCount={rulerMeasurements.length}
					onAttachToTooth={onAttachToTooth}
					onAttachToVisit={onAttachToVisit}
					onReset={onReset}
				/>
			</div>

			<ImagingBrightnessContrastSliders imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} />

			{showNotes && (
				<>
					<ImagingSessionNotesSection
						selectedImagingStudy={selectedImagingStudy} imagingViewerNote={imagingViewerNote}
						setImagingViewerNote={setImagingViewerNote} imagingViewerSaveState={imagingViewerSaveState}
						imagingViewerSaveTitle={imagingViewerSaveTitle} imagingViewerSaveDetail={imagingViewerSaveDetail}
						imagingViewerNoteReady={imagingViewerNoteReady} imagingViewerSessionReady={imagingViewerSessionReady}
						canRetryImagingViewerSave={canRetryImagingViewerSave} retryImagingViewerSessionSave={retryImagingViewerSessionSave}
						addImagingViewerNoteAnnotation={addImagingViewerNoteAnnotation}
					/>
					{imagingViewerAnnotations && imagingViewerAnnotations.length > 0 && (
						<section className="viewer-annotation-list" aria-label="Разметки к снимку">
							{imagingViewerAnnotations.slice(0, 3).map((a) => (
								<article key={a.id}>
									<strong>{a.label}</strong>
									<span>{a.toothCode ?? selectedImagingStudy?.region ?? "study"} · {formatShortDate ? formatShortDate(a.updatedAt) : a.updatedAt}</span>
								</article>
							))}
						</section>
					)}
				</>
			)}
		</div>
	);
}

export default ImagingToolbar;
