import React from "react";
import { Contrast, Ruler, Sparkles } from "lucide-react";
import type { ImagingViewerState, ViewerRulerMeasurement } from "../types.js";

export interface ImagingFilterRulerGroupProps {
	readonly imagingViewerState: ImagingViewerState;
	readonly setImagingViewerState: (updater: (prev: any) => any) => void;
	readonly enhancementOn: boolean;
	readonly setEnhancementOn: (updater: (prev: boolean) => boolean) => void;
	readonly isRulerActive: boolean;
	readonly setIsRulerActive: (updater: (prev: boolean) => boolean) => void;
	readonly setIsPanActive: (active: boolean) => void;
	readonly rulerMeasurements: ViewerRulerMeasurement[];
	readonly setRulerMeasurements: (m: ViewerRulerMeasurement[]) => void;
}

export const ImagingFilterRulerGroup: React.FC<ImagingFilterRulerGroupProps> = ({
	imagingViewerState,
	setImagingViewerState,
	enhancementOn,
	setEnhancementOn,
	isRulerActive,
	setIsRulerActive,
	setIsPanActive,
	rulerMeasurements,
	setRulerMeasurements,
}) => {
	const btnBase = "h-8 px-3 rounded-lg text-xs font-semibold gap-1.5 transition-all inline-flex items-center justify-center cursor-pointer shrink-0";
	const isInverted = Boolean(imagingViewerState.inverted);

	return (
		<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-0.5 shadow-2xs shrink-0 gap-0.5" role="group" aria-label="Фильтры контраста и измерения">
			<button
				className={`${btnBase} ${isInverted ? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-2xs font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
				type="button"
				title="Инверсия (Негатив для верхушек корней)"
				aria-label="Инвертировать снимок в негатив"
				aria-pressed={isInverted}
				onClick={() => setImagingViewerState((state: any) => ({ ...state, inverted: !state.inverted }))}
			>
				<Contrast size={14} aria-hidden="true" />
				<span>Негатив</span>
			</button>
			<button
				className={`${btnBase} ${enhancementOn ? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-2xs font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
				type="button"
				title="Улучшение контраста костных структур (CLAHE)"
				aria-label="Переключить CLAHE улучшение снимка"
				aria-pressed={enhancementOn}
				onClick={() => setEnhancementOn((prev: boolean) => !prev)}
			>
				<Sparkles size={14} aria-hidden="true" />
				<span>CLAHE</span>
			</button>
			<button
				className={`${btnBase} ${isRulerActive ? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-2xs font-bold" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
				type="button"
				title="Калиброванная линейка (измерение расстояний в мм)"
				aria-label="Включить режим калиброванной линейки"
				aria-pressed={isRulerActive}
				onClick={() => {
					setIsRulerActive((prev: boolean) => !prev);
					if (!isRulerActive) setIsPanActive(false);
				}}
			>
				<Ruler size={14} aria-hidden="true" />
				<span>Линейка</span>
				{rulerMeasurements.length > 0 && (
					<span className="ml-0.5 px-1.5 py-0.5 bg-[var(--teal-strong,#0f766e)] text-[10px] rounded-full text-white font-bold">
						{rulerMeasurements.length}
					</span>
				)}
			</button>
			{rulerMeasurements.length > 0 && (
				<button
					type="button"
					className="h-8 px-2 rounded-lg text-xs text-[var(--ink-muted)] hover:text-rose-500 hover:bg-[var(--paper-soft)] transition-all cursor-pointer font-semibold"
					title="Удалить все измерения линейки"
					onClick={() => setRulerMeasurements([])}
				>
					Очистить
				</button>
			)}
		</div>
	);
};
