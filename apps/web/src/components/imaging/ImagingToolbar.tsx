import React from "react";
import { RefreshCw } from "lucide-react";
import type { ImagingStudy, ImagingViewerState, ViewerRulerMeasurement } from "./types.js";
import { ImagingOrientationGroup } from "./imagingToolbar/ImagingOrientationGroup.js";
import { ImagingZoomPanGroup } from "./imagingToolbar/ImagingZoomPanGroup.js";
import { ImagingFilterRulerGroup } from "./imagingToolbar/ImagingFilterRulerGroup.js";
import { ImagingToothVisitGroup } from "./imagingToolbar/ImagingToothVisitGroup.js";
import { ImagingBrightnessContrastSliders } from "./imagingToolbar/ImagingBrightnessContrastSliders.js";
import { ImagingSessionNotesSection } from "./imagingToolbar/ImagingSessionNotesSection.js";

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
	onAttachToTooth?: ((toothCode: string) => Promise<void> | void) | undefined;
	onAttachToVisit?: ((visitId: string) => Promise<void> | void) | undefined;
}

export function ImagingToolbar(props: ImagingToolbarProps) {
	const {
		selectedImagingStudy, imagingViewerState, setImagingViewerState, enhancementOn, setEnhancementOn,
		isRulerActive, setIsRulerActive, isPanActive, setIsPanActive, rulerMeasurements, setRulerMeasurements,
		onReset, imagingViewerNote, setImagingViewerNote, imagingViewerSaveState, imagingViewerSaveTitle,
		imagingViewerSaveDetail, imagingViewerNoteReady, imagingViewerSessionReady, canRetryImagingViewerSave,
		retryImagingViewerSessionSave, addImagingViewerNoteAnnotation, imagingViewerAnnotations, formatShortDate,
		activeAppointment, onAttachToTooth, onAttachToVisit,
	} = props;

	return (
		<div className="imaging-viewer-toolbar flex flex-col gap-1.5 p-2 bg-[var(--paper-soft)] border-t border-[var(--line)]" role="toolbar" aria-label="Настройки снимка">
			<div className="imaging-viewer-tools flex flex-wrap items-center justify-between gap-1.5 min-h-[36px]">
				<div className="flex items-center gap-1.5 flex-wrap">
					<ImagingOrientationGroup imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} />
					<ImagingZoomPanGroup imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} isPanActive={isPanActive} setIsPanActive={setIsPanActive as any} setIsRulerActive={setIsRulerActive as any} />
					<ImagingFilterRulerGroup imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} enhancementOn={enhancementOn} setEnhancementOn={setEnhancementOn as any} isRulerActive={isRulerActive} setIsRulerActive={setIsRulerActive as any} setIsPanActive={setIsPanActive as any} rulerMeasurements={rulerMeasurements} setRulerMeasurements={setRulerMeasurements} />
				</div>

				<div className="flex items-center gap-1.5 shrink-0 flex-wrap">
					<ImagingToothVisitGroup selectedImagingStudy={selectedImagingStudy} activeAppointment={activeAppointment} onAttachToTooth={onAttachToTooth} onAttachToVisit={onAttachToVisit} />
					<button
						className="viewer-tool-button h-8 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs"
						type="button"
						title="Сбросить все параметры просмотра"
						aria-label="Сбросить настройки снимка"
						onClick={onReset}
					>
						<RefreshCw size={13} aria-hidden="true" />
						<span className="text-xs font-semibold">Сброс</span>
					</button>
				</div>
			</div>

			<ImagingBrightnessContrastSliders imagingViewerState={imagingViewerState} setImagingViewerState={setImagingViewerState as any} />

			<ImagingSessionNotesSection
				selectedImagingStudy={selectedImagingStudy} imagingViewerNote={imagingViewerNote}
				setImagingViewerNote={setImagingViewerNote} imagingViewerSaveState={imagingViewerSaveState}
				imagingViewerSaveTitle={imagingViewerSaveTitle} imagingViewerSaveDetail={imagingViewerSaveDetail}
				imagingViewerNoteReady={imagingViewerNoteReady} imagingViewerSessionReady={imagingViewerSessionReady}
				canRetryImagingViewerSave={canRetryImagingViewerSave} retryImagingViewerSessionSave={retryImagingViewerSessionSave}
				addImagingViewerNoteAnnotation={addImagingViewerNoteAnnotation}
			/>

			{imagingViewerAnnotations && imagingViewerAnnotations.length > 0 ? (
				<section className="viewer-annotation-list" aria-label="Разметки к снимку">
					{imagingViewerAnnotations.slice(0, 3).map((a) => (
						<article key={a.id}>
							<strong>{a.label}</strong>
							<span>{a.toothCode ?? selectedImagingStudy?.region ?? "study"} · {formatShortDate ? formatShortDate(a.updatedAt) : a.updatedAt}</span>
						</article>
					))}
				</section>
			) : null}
		</div>
	);
}

export default ImagingToolbar;
