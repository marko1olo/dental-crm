import React from "react";
import {
	Activity,
	Eye,
	Hand,
	Move,
	RefreshCw,
	RotateCcw,
	Ruler,
	Sliders,
	Sparkles,
	SunMedium,
	ZoomIn,
} from "lucide-react";
import type { ImagingViewportControlsProps } from "./imagingViewTypes";

/**
 * Layer 4: Панель инструментов радиодиагностики (Clinical Radiology Toolbar).
 * Соответствует стандарту плотной эргономики клиники (1 строка 32–36px, 8px сетка, 0 цветового шума).
 */
export function ImagingViewportControls(props: ImagingViewportControlsProps) {
	const {
		isRulerActive, setIsRulerActive, isPanActive, setIsPanActive, enhancementOn, setEnhancementOn,
		rulerMeasurements = [], onClearMeasurements, currentPixelSpacingMm, onAnalyzeAI, isAnalyzingAI,
		onOpenCbctStudio, onLoadFromDicomweb, isDicomwebLoading, dicomwebLoadProgress, hasDicomwebSource, className = "",
	} = props;

	const btnClass = (active: boolean) => `h-8 px-2.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
		active ? "bg-[var(--teal)] text-white shadow-xs" : "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-card)] border border-[var(--line)]"
	}`;

	return (
		<div className={`imaging-viewport-controls flex items-center justify-between gap-2 p-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] min-h-[36px] ${className}`} data-testid="imaging-viewport-controls" role="toolbar" aria-label="Панель инструментов рентгенодиагностики">
			<div className="flex items-center gap-1.5 flex-wrap">
				<button type="button" data-testid="btn-tool-ruler" onClick={() => setIsRulerActive((prev) => !prev)} className={btnClass(isRulerActive)} title={isRulerActive ? "Выключить линейку" : "Включить линейку (измерение расстояния в мм)"}>
					<Ruler size={14} className="shrink-0" /> <span>Линейка</span>
					{currentPixelSpacingMm ? (<span className="text-[10px] opacity-75 hidden sm:inline">({currentPixelSpacingMm} мм/пкс)</span>) : null}
					{rulerMeasurements.length > 0 ? (<span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-white/20 text-white ml-0.5">{rulerMeasurements.length}</span>) : null}
				</button>

				{rulerMeasurements.length > 0 && onClearMeasurements ? (
					<button type="button" data-testid="btn-clear-ruler" onClick={onClearMeasurements} className="h-8 px-2 text-xs text-[var(--muted)] hover:text-red-500 rounded-md transition-colors flex items-center gap-1 cursor-pointer" title="Сбросить измерения линейки">
						<RotateCcw size={12} /> <span className="hidden sm:inline">Сброс</span>
					</button>
				) : null}

				<button type="button" data-testid="btn-tool-pan" onClick={() => setIsPanActive((prev) => !prev)} className={btnClass(isPanActive)} title={isPanActive ? "Выключить перемещение" : "Перемещение снимка (панорамирование)"}>
					<Hand size={14} className="shrink-0" /> <span className="hidden sm:inline">Рука</span>
				</button>

				<button type="button" data-testid="btn-tool-enhance" onClick={() => setEnhancementOn((prev) => !prev)} className={btnClass(enhancementOn)} title={enhancementOn ? "Выключить усиление контрастности" : "Оптическое усиление костных структур"}><SunMedium size={14} className="shrink-0" /> <span className="hidden sm:inline">Контраст</span></button>
			</div>

			<div className="flex items-center gap-1.5">
				{onAnalyzeAI ? (
					<button type="button" data-testid="btn-imaging-ai-analyze" onClick={onAnalyzeAI} disabled={isAnalyzingAI} className="h-8 px-3 text-xs font-medium rounded-md bg-[var(--paper)] hover:bg-[var(--paper-card)] border border-[var(--line)] text-[var(--ink)] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50" title="ИИ-поиск патологий (кариес, периодонтит, костные карманы)"><Activity size={13} className={`text-[var(--teal)] shrink-0 ${isAnalyzingAI ? "animate-pulse" : ""}`} /> <span>{isAnalyzingAI ? "Анализ..." : "ИИ-разметка"}</span></button>
				) : null}

				{onOpenCbctStudio ? (
					<button type="button" data-testid="btn-open-cbct-studio-toolbar" onClick={onOpenCbctStudio} className="h-8 px-3 text-xs font-medium rounded-md bg-[var(--paper)] hover:bg-[var(--paper-card)] border border-[var(--line)] text-[var(--ink)] transition-colors flex items-center gap-1.5 cursor-pointer" title="Открыть 3D студию мультипланарной реконструкции"><Sparkles size={13} className="text-cyan-500 shrink-0" /> <span className="hidden md:inline">3D Студия</span></button>
				) : null}

				{hasDicomwebSource && onLoadFromDicomweb ? (
					<button type="button" data-testid="btn-pacs-refresh" onClick={onLoadFromDicomweb} disabled={isDicomwebLoading} className="h-8 px-2.5 text-xs font-medium rounded-md bg-[var(--paper)] hover:bg-[var(--paper-card)] border border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50" title="Синхронизировать с PACS архивом"><RefreshCw size={13} className={isDicomwebLoading ? "animate-spin" : ""} /> <span className="hidden lg:inline">{dicomwebLoadProgress || "PACS"}</span></button>
				) : null}
			</div>
		</div>
	);
}
