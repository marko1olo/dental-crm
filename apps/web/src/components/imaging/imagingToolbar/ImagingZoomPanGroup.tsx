import React from "react";
import { Hand, ZoomIn, ZoomOut } from "lucide-react";
import type { ImagingViewerState } from "../types.js";

export interface ImagingZoomPanGroupProps {
	readonly imagingViewerState: ImagingViewerState;
	readonly setImagingViewerState: (updater: (prev: any) => any) => void;
	readonly isPanActive: boolean;
	readonly setIsPanActive: (updater: (prev: boolean) => boolean) => void;
	readonly setIsRulerActive: (active: boolean) => void;
}

export const ImagingZoomPanGroup: React.FC<ImagingZoomPanGroupProps> = ({
	imagingViewerState,
	setImagingViewerState,
	isPanActive,
	setIsPanActive,
	setIsRulerActive,
}) => {
	const btnBase = "h-8 px-2.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center cursor-pointer shrink-0";
	const is100Percent = Math.abs((imagingViewerState.zoom || 1) - 1.0) < 0.05;

	return (
		<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-0.5 shadow-2xs shrink-0 gap-0.5" role="group" aria-label="Масштаб снимка">
			<button
				className={`${btnBase} text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95`}
				type="button"
				title="Уменьшить"
				aria-label="Уменьшить снимок"
				onClick={() => setImagingViewerState((state: any) => ({ ...state, zoom: Math.max(0.75, Number(((state.zoom || 1) - 0.1).toFixed(2))) }))}
			>
				<ZoomOut size={14} aria-hidden="true" />
			</button>
			<button
				className={`${btnBase} text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95`}
				type="button"
				title="Увеличить"
				aria-label="Увеличить снимок"
				onClick={() => setImagingViewerState((state: any) => ({ ...state, zoom: Math.min(2.5, Number(((state.zoom || 1) + 0.1).toFixed(2))) }))}
			>
				<ZoomIn size={14} aria-hidden="true" />
			</button>
			<button
				className={`${btnBase} ${is100Percent ? "bg-[var(--primary-soft,rgba(13,148,136,0.12))] text-[var(--teal)] font-bold" : "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
				type="button"
				title="Сбросить масштаб (100%)"
				aria-label="Сбросить масштаб до 100%"
				onClick={() => setImagingViewerState((state: any) => ({ ...state, zoom: 1.0, pan: { x: 0, y: 0 } }))}
			>
				100%
			</button>
			<button
				className={`${btnBase} ${isPanActive ? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-2xs" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
				type="button"
				title="Панорамирование (перетаскивание снимка)"
				aria-label="Панорамирование снимка"
				aria-pressed={isPanActive}
				onClick={() => {
					setIsPanActive((prev: boolean) => !prev);
					if (!isPanActive) setIsRulerActive(false);
				}}
			>
				<Hand size={14} aria-hidden="true" />
			</button>
		</div>
	);
};
