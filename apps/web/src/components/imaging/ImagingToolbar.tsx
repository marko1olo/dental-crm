import React from "react";
import {
	ClipboardList,
	Contrast,
	FlipHorizontal,
	Hand,
	Plus,
	RefreshCw,
	RotateCcw,
	RotateCw,
	Ruler,
	Sparkles,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import {
	IMAGING_QUICK_CHIPS,
	imagingDescriptionTemplate,
	type ImagingStudy,
	type ImagingViewerState,
	type ViewerRulerMeasurement,
} from "./types";

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
	imagingViewerNoteMissingId?: string | undefined;
	imagingViewerRetryMissingId?: string | undefined;
	canRetryImagingViewerSave?: boolean | undefined;
	retryImagingViewerSessionSave?: (() => void) | undefined;
	addImagingViewerNoteAnnotation?: (() => void) | undefined;
	imagingViewerAnnotations?: Array<{
		id: string;
		label: string;
		toothCode?: string | null | undefined;
		updatedAt: string;
	}> | undefined;
	formatShortDate?: ((date: string) => string) | undefined;
	isOnline?: boolean | undefined;
}

export function ImagingToolbar({
	selectedImagingStudy,
	imagingViewerState,
	setImagingViewerState,
	enhancementOn,
	setEnhancementOn,
	isRulerActive,
	setIsRulerActive,
	isPanActive,
	setIsPanActive,
	rulerMeasurements,
	setRulerMeasurements,
	onReset,
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
	isOnline = true,
}: ImagingToolbarProps) {
	return (
		<div
			className="imaging-viewer-toolbar flex flex-col gap-1.5 p-2 bg-[var(--paper-soft)] border-t border-[var(--line)]"
			role="toolbar"
			aria-label="Настройки рентген-снимка"
		>
			<div className="imaging-viewer-tools flex flex-wrap items-center justify-between gap-1.5 min-h-[32px]">
				<div className="flex items-center gap-1.5 flex-wrap">
					{/* Group 1: [ ↺ | ↻ | ⇄ | 180° ] Rotation & Orientation Segmented Controls */}
					<div
						className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0.5 shadow-2xs shrink-0 gap-0.5"
						role="group"
						aria-label="Ориентация и поворот"
					>
						<button
							className="viewer-tool-button h-7 px-2 rounded text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer shrink-0"
							type="button"
							title="Повернуть влево"
							aria-label="Повернуть снимок влево"
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									rotationDeg: (state.rotationDeg || 0) - 90,
								}))
							}
						>
							<RotateCcw size={13} aria-hidden="true" />
						</button>
						<button
							className="viewer-tool-button h-7 px-2 rounded text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer shrink-0"
							type="button"
							title="Повернуть вправо"
							aria-label="Повернуть снимок вправо"
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									rotationDeg: (state.rotationDeg || 0) + 90,
								}))
							}
						>
							<RotateCw size={13} aria-hidden="true" />
						</button>
						<button
							className={`viewer-tool-button h-7 px-2 rounded text-xs transition-all inline-flex items-center justify-center cursor-pointer shrink-0 ${imagingViewerState.flipHorizontal ? "bg-[var(--teal)] text-white font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
							type="button"
							title="Зеркально"
							aria-label="Зеркально отразить снимок"
							aria-pressed={Boolean(imagingViewerState.flipHorizontal)}
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									flipHorizontal: !state.flipHorizontal,
								}))
							}
						>
							<FlipHorizontal size={13} aria-hidden="true" />
						</button>
						<button
							className="viewer-tool-button h-7 px-1.5 rounded text-[11px] font-bold text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer shrink-0"
							type="button"
							title="Повернуть на 180° (верхняя / нижняя челюсть)"
							aria-label="Повернуть снимок на 180 градусов"
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									rotationDeg: ((state.rotationDeg || 0) + 180) % 360,
								}))
							}
						>
							180°
						</button>
					</div>

					{/* Group 2: [ - | + | 100% | Hand ] Zoom Segmented Controls */}
					<div
						className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0.5 shadow-2xs shrink-0 gap-0.5"
						role="group"
						aria-label="Масштаб снимка"
					>
						<button
							className="viewer-tool-button h-7 px-2 rounded text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer shrink-0"
							type="button"
							title="Уменьшить"
							aria-label="Уменьшить снимок"
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									zoom: Math.max(0.75, Number(((state.zoom || 1) - 0.1).toFixed(2))),
								}))
							}
						>
							<ZoomOut size={13} aria-hidden="true" />
						</button>
						<button
							className="viewer-tool-button h-7 px-2 rounded text-xs text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center cursor-pointer shrink-0"
							type="button"
							title="Увеличить"
							aria-label="Увеличить снимок"
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									zoom: Math.min(2.5, Number(((state.zoom || 1) + 0.1).toFixed(2))),
								}))
							}
						>
							<ZoomIn size={13} aria-hidden="true" />
						</button>
						<button
							className={`viewer-tool-button h-7 px-2 rounded text-[11px] font-bold transition-all inline-flex items-center justify-center cursor-pointer shrink-0 ${Math.abs((imagingViewerState.zoom || 1) - 1.0) < 0.05 ? "bg-[var(--teal-soft,#f0fdfa)] text-[var(--teal,#0d9488)]" : "text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
							type="button"
							title="Сбросить масштаб (100%)"
							aria-label="Сбросить масштаб до 100%"
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									zoom: 1.0,
									pan: { x: 0, y: 0 },
								}))
							}
						>
							100%
						</button>
						<button
							className={`viewer-tool-button h-7 px-2 rounded text-xs transition-all inline-flex items-center justify-center cursor-pointer shrink-0 ${isPanActive ? "bg-[var(--teal)] text-white font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
							type="button"
							title="Панорамирование (перетаскивание снимка)"
							aria-label="Панорамирование снимка"
							aria-pressed={isPanActive}
							onClick={() => {
								setIsPanActive(!isPanActive);
								if (!isPanActive) setIsRulerActive(false);
							}}
						>
							<Hand size={13} aria-hidden="true" />
						</button>
					</div>

					{/* Group 3: [ Негатив | CLAHE | Линейка ] Clinical Contrast & Enhancement */}
					<div
						className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[var(--paper)] p-0.5 shadow-2xs shrink-0 gap-0.5"
						role="group"
						aria-label="Фильтры контраста и измерения"
					>
						<button
							className={`viewer-tool-button h-7 px-2.5 rounded text-xs font-semibold gap-1 transition-all inline-flex items-center justify-center cursor-pointer shrink-0 ${imagingViewerState.inverted ? "bg-[var(--teal)] text-white shadow-2xs font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
							type="button"
							title="Инверсия (Негатив для верхушек корней и эндодонтии)"
							aria-label="Инвертировать снимок в негатив"
							aria-pressed={Boolean(imagingViewerState.inverted)}
							onClick={() =>
								setImagingViewerState((state: any) => ({
									...state,
									inverted: !state.inverted,
								}))
							}
						>
							<Contrast size={13} aria-hidden="true" />
							<span>Негатив</span>
						</button>
						<button
							className={`viewer-tool-button h-7 px-2.5 rounded text-xs font-semibold gap-1 transition-all inline-flex items-center justify-center cursor-pointer shrink-0 ${enhancementOn ? "bg-[var(--teal)] text-white shadow-2xs font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
							type="button"
							title="Включить/выключить улучшение снимка (CLAHE симуляция)"
							aria-label="Переключить CLAHE улучшение снимка"
							aria-pressed={enhancementOn}
							onClick={() => setEnhancementOn(!enhancementOn)}
						>
							<Sparkles size={13} aria-hidden="true" />
							<span>CLAHE</span>
						</button>
						<button
							className={`viewer-tool-button h-7 px-2.5 rounded text-xs font-semibold gap-1 transition-all inline-flex items-center justify-center cursor-pointer shrink-0 ${isRulerActive ? "bg-[var(--teal)] text-white shadow-2xs font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
							type="button"
							title="Калиброванная линейка (измерение расстояний в мм)"
							aria-label="Включить режим калиброванной линейки"
							aria-pressed={isRulerActive}
							onClick={() => {
								setIsRulerActive(!isRulerActive);
								if (!isRulerActive) setIsPanActive(false);
							}}
						>
							<Ruler size={13} aria-hidden="true" />
							<span>Линейка</span>
							{rulerMeasurements.length > 0 && (
								<span className="ml-0.5 px-1 py-0.2 bg-teal-800 text-[10px] rounded-full text-white">
									{rulerMeasurements.length}
								</span>
							)}
						</button>
						{rulerMeasurements.length > 0 && (
							<button
								type="button"
								className="viewer-tool-button h-7 px-1.5 rounded text-[11px] text-[var(--muted)] hover:text-red-400 hover:bg-[var(--paper-soft)] transition-all cursor-pointer"
								title="Удалить все измерения линейки"
								onClick={() => setRulerMeasurements([])}
							>
								Очистить
							</button>
						)}
					</div>
				</div>

				{/* Secondary Reset Button */}
				<button
					className="viewer-tool-button h-7 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95 transition-all inline-flex items-center justify-center gap-1 text-xs shrink-0 cursor-pointer shadow-2xs"
					type="button"
					title="Сбросить все параметры просмотра"
					aria-label="Сбросить настройки снимка"
					onClick={onReset}
				>
					<RefreshCw size={12} aria-hidden="true" />
					<span className="text-[11px] font-medium">Сброс</span>
				</button>
			</div>

			{/* Compact Single-Line Slider Bar for Brightness & Contrast */}
			<div className="viewer-slider-grid flex flex-wrap sm:flex-nowrap items-center gap-3 w-full static pt-1 px-0.5">
				<label className="text-[11px] font-medium text-[var(--muted)] flex items-center gap-2 flex-1 min-w-[140px]">
					<span className="shrink-0 font-semibold text-[var(--ink)]">Яркость:</span>
					<input
						min="0.65"
						max="1.45"
						step="0.05"
						type="range"
						className="flex-1 h-1.5 accent-[var(--teal,#0d9488)] cursor-pointer"
						value={imagingViewerState.brightness ?? 1}
						onChange={(event) =>
							setImagingViewerState((state: any) => ({
								...state,
								brightness: Number(event.target.value),
							}))
						}
					/>
					<span className="text-[10px] text-[var(--teal,#0d9488)] font-mono w-8 text-right font-bold">
						{Math.round((imagingViewerState.brightness ?? 1) * 100)}%
					</span>
				</label>
				<label className="text-[11px] font-medium text-[var(--muted)] flex items-center gap-2 flex-1 min-w-[140px]">
					<span className="shrink-0 font-semibold text-[var(--ink)]">Контраст:</span>
					<input
						min="0.75"
						max="1.85"
						step="0.05"
						type="range"
						className="flex-1 h-1.5 accent-[var(--teal,#0d9488)] cursor-pointer"
						value={imagingViewerState.contrast ?? 1}
						onChange={(event) =>
							setImagingViewerState((state: any) => ({
								...state,
								contrast: Number(event.target.value),
							}))
						}
					/>
					<span className="text-[10px] text-[var(--teal,#0d9488)] font-mono w-8 text-right font-bold">
						{Math.round((imagingViewerState.contrast ?? 1) * 100)}%
					</span>
				</label>
			</div>

			{/* Session notes, description template and quick chips */}
			<section
				className={`viewer-session-strip viewer-save-state-${imagingViewerSaveState}`}
				aria-label="Автосохранение сеанса просмотра снимка"
			>
				<div>
					<strong>{imagingViewerSaveTitle[imagingViewerSaveState] || "Автосохранение"}</strong>
					<span>{imagingViewerSaveDetail}</span>
				</div>
				<div className="flex flex-col gap-1.5 w-full min-w-0">
					<div className="flex flex-col gap-1 min-w-0">
						<textarea
							aria-label="Заметка к снимку"
							value={imagingViewerNote}
							onChange={(event) => setImagingViewerNote(event.target.value)}
							placeholder="Опишите снимок: что видно, какое заключение..."
							rows={imagingViewerNote ? 2 : 1}
							style={{
								width: "100%",
								resize: "vertical",
								minHeight: imagingViewerNote ? "56px" : "34px",
								lineHeight: 1.35,
								padding: "6px 8px",
								fontSize: "12px",
							}}
						/>
						<button
							type="button"
							className="text-button self-start inline-flex items-center gap-1.5"
							title="Вставить заготовку описания под тип этого снимка"
							onClick={() => {
								const template = imagingDescriptionTemplate(
									selectedImagingStudy?.kind,
									selectedImagingStudy?.toothCode,
									selectedImagingStudy?.region,
								);
								setImagingViewerNote(
									imagingViewerNote.trim()
										? `${imagingViewerNote.trim()}\n\n${template}`
										: template,
								);
							}}
						>
							<ClipboardList size={14} aria-hidden="true" />
							Шаблон описания
						</button>
					</div>
					<div className="quick-chips-row flex flex-wrap gap-1.5 mt-0.5 min-w-0">
						{IMAGING_QUICK_CHIPS.map((chip) => {
							const shortLabel = chip.startsWith("Норма (") ? "Норма (б/о)" : chip;
							return (
								<button
									key={chip}
									type="button"
									className="quick-chip quick-chip--sm"
									title={chip}
									onClick={() =>
										setImagingViewerNote(
											imagingViewerNote?.trim()
												? `${imagingViewerNote.trim()}\n• ${chip}`
												: `• ${chip}`,
										)
									}
								>
									{shortLabel}
								</button>
							);
						})}
					</div>
				</div>
				<div className="viewer-session-actions">
					{addImagingViewerNoteAnnotation && (
						<button
							className="secondary-button"
							type="button"
							onClick={addImagingViewerNoteAnnotation}
							aria-describedby={
								!imagingViewerNoteReady || !imagingViewerSessionReady
									? imagingViewerNoteMissingId
									: undefined
							}
							disabled={!imagingViewerNoteReady || !imagingViewerSessionReady}
						>
							<Plus aria-hidden="true" /> Заметка
						</button>
					)}
					{canRetryImagingViewerSave && retryImagingViewerSessionSave ? (
						<button className="secondary-button" type="button" onClick={retryImagingViewerSessionSave}>
							<RefreshCw aria-hidden="true" /> Повторить
						</button>
					) : null}
				</div>
				{!imagingViewerSessionReady ? (
					<p className="viewer-note-missing" id={imagingViewerNoteMissingId} role="status" aria-live="polite">
						Дождитесь загрузки просмотра, чтобы прикрепить заметку к снимку.
					</p>
				) : !imagingViewerNoteReady ? (
					<p className="viewer-note-missing" id={imagingViewerNoteMissingId} role="status" aria-live="polite">
						Напишите текст заметки, чтобы прикрепить ее к снимку.
					</p>
				) : null}
				{canRetryImagingViewerSave && !isOnline ? (
					<p className="viewer-note-missing" id={imagingViewerRetryMissingId} role="status" aria-live="polite">
						Внимание: нет подключения к сети. Повторная отправка сохранит снимок локально и синхронизирует при появлении связи.
					</p>
				) : null}
			</section>

			{imagingViewerAnnotations && imagingViewerAnnotations.length > 0 ? (
				<section
					className="viewer-annotation-list"
					aria-label="Сохраненные разметки к снимкам"
				>
					{imagingViewerAnnotations.slice(0, 3).map((annotation) => (
						<article key={annotation.id}>
							<strong>{annotation.label}</strong>
							<span>
								{annotation.toothCode ??
									selectedImagingStudy?.region ??
									"study"}{" "}
								· {formatShortDate ? formatShortDate(annotation.updatedAt) : annotation.updatedAt}
							</span>
						</article>
					))}
				</section>
			) : null}
		</div>
	);
}
