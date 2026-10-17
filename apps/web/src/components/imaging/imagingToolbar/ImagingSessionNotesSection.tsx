import React from "react";
import { ClipboardList, Plus, RefreshCw } from "lucide-react";
import { IMAGING_QUICK_CHIPS, imagingDescriptionTemplate, type ImagingStudy } from "../types.js";

export interface ImagingSessionNotesSectionProps {
	readonly selectedImagingStudy?: ImagingStudy | null | undefined;
	readonly imagingViewerNote: string;
	readonly setImagingViewerNote: (note: string) => void;
	readonly imagingViewerSaveState: string;
	readonly imagingViewerSaveTitle: Record<string, string>;
	readonly imagingViewerSaveDetail: string;
	readonly imagingViewerNoteReady: boolean;
	readonly imagingViewerSessionReady: boolean;
	readonly canRetryImagingViewerSave?: boolean | undefined;
	readonly retryImagingViewerSessionSave?: (() => void) | undefined;
	readonly addImagingViewerNoteAnnotation?: (() => void) | undefined;
}

export const ImagingSessionNotesSection: React.FC<ImagingSessionNotesSectionProps> = ({
	selectedImagingStudy,
	imagingViewerNote,
	setImagingViewerNote,
	imagingViewerSaveState,
	imagingViewerSaveTitle,
	imagingViewerSaveDetail,
	imagingViewerNoteReady,
	imagingViewerSessionReady,
	canRetryImagingViewerSave,
	retryImagingViewerSessionSave,
	addImagingViewerNoteAnnotation,
}) => {
	return (
		<section className={`viewer-session-strip viewer-save-state-${imagingViewerSaveState}`} aria-label="Автосохранение сеанса">
			<div>
				<strong>{imagingViewerSaveTitle[imagingViewerSaveState] || "Автосохранение"}</strong>
				<span>{imagingViewerSaveDetail}</span>
			</div>
			<div className="flex flex-col gap-1.5 w-full min-w-0">
				<div className="flex flex-col gap-1 min-w-0">
					<textarea
						aria-label="Заметка к снимку"
						value={imagingViewerNote}
						onChange={(e) => setImagingViewerNote(e.target.value)}
						placeholder="Опишите снимок: что видно, какое заключение..."
						rows={imagingViewerNote ? 2 : 1}
						style={{ width: "100%", resize: "vertical", minHeight: imagingViewerNote ? "56px" : "34px", lineHeight: 1.35, padding: "6px 8px", fontSize: "12px" }}
					/>
					<button
						type="button"
						className="text-button self-start inline-flex items-center gap-1.5 cursor-pointer text-xs"
						title="Вставить заготовку описания под тип этого снимка"
						onClick={() => {
							const template = imagingDescriptionTemplate(selectedImagingStudy?.kind, selectedImagingStudy?.toothCode, selectedImagingStudy?.region);
							setImagingViewerNote(imagingViewerNote.trim() ? `${imagingViewerNote.trim()}\n\n${template}` : template);
						}}
					>
						<ClipboardList size={14} aria-hidden="true" /> Шаблон описания
					</button>
				</div>
				<div className="quick-chips-row flex flex-wrap gap-1.5 mt-0.5 min-w-0">
					{IMAGING_QUICK_CHIPS.map((chip) => (
						<button
							key={chip}
							type="button"
							className="quick-chip quick-chip--sm text-xs cursor-pointer"
							title={chip}
							onClick={() => setImagingViewerNote(imagingViewerNote?.trim() ? `${imagingViewerNote.trim()}\n• ${chip}` : `• ${chip}`)}
						>
							{chip.startsWith("Норма (") ? "Норма (б/о)" : chip}
						</button>
					))}
				</div>
			</div>
			<div className="viewer-session-actions">
				{addImagingViewerNoteAnnotation && (
					<button
						className="secondary-button text-xs cursor-pointer inline-flex items-center gap-1"
						type="button"
						onClick={addImagingViewerNoteAnnotation}
						disabled={!imagingViewerNoteReady || !imagingViewerSessionReady}
					>
						<Plus size={14} aria-hidden="true" /> Заметка
					</button>
				)}
				{canRetryImagingViewerSave && retryImagingViewerSessionSave ? (
					<button className="secondary-button text-xs cursor-pointer inline-flex items-center gap-1" type="button" onClick={retryImagingViewerSessionSave}>
						<RefreshCw size={14} aria-hidden="true" /> Повторить
					</button>
				) : null}
			</div>
		</section>
	);
};
