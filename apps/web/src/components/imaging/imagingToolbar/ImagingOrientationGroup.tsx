import React from "react";
import { FlipHorizontal, RotateCcw, RotateCw } from "lucide-react";
import type { ImagingViewerState } from "../types.js";

export interface ImagingOrientationGroupProps {
	readonly imagingViewerState: ImagingViewerState;
	readonly setImagingViewerState: (updater: (prev: any) => any) => void;
}

export const ImagingOrientationGroup: React.FC<ImagingOrientationGroupProps> = ({
	imagingViewerState,
	setImagingViewerState,
}) => {
	const btnBase = "h-8 px-2.5 rounded-lg text-xs font-bold transition-colors inline-flex items-center justify-center cursor-pointer shrink-0";
	const isFlipped = Boolean(imagingViewerState.flipHorizontal);

	return (
		<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper)] p-0.5 shadow-2xs shrink-0 gap-0.5" role="group" aria-label="Ориентация и поворот">
			<button
				className={`${btnBase} text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95`}
				type="button"
				title="Повернуть влево"
				aria-label="Повернуть снимок влево"
				onClick={() => setImagingViewerState((state: any) => ({ ...state, rotationDeg: (state.rotationDeg || 0) - 90 }))}
			>
				<RotateCcw size={14} aria-hidden="true" />
			</button>
			<button
				className={`${btnBase} text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95`}
				type="button"
				title="Повернуть вправо"
				aria-label="Повернуть снимок вправо"
				onClick={() => setImagingViewerState((state: any) => ({ ...state, rotationDeg: (state.rotationDeg || 0) + 90 }))}
			>
				<RotateCw size={14} aria-hidden="true" />
			</button>
			<button
				className={`${btnBase} ${isFlipped ? "border border-[var(--teal)] bg-[var(--teal)] text-white shadow-2xs" : "text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}
				type="button"
				title="Зеркально"
				aria-label="Зеркально отразить снимок"
				aria-pressed={isFlipped}
				onClick={() => setImagingViewerState((state: any) => ({ ...state, flipHorizontal: !state.flipHorizontal }))}
			>
				<FlipHorizontal size={14} aria-hidden="true" />
			</button>
			<button
				className={`${btnBase} text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] active:scale-95`}
				type="button"
				title="Повернуть на 180°"
				aria-label="Повернуть снимок на 180 градусов"
				onClick={() => setImagingViewerState((state: any) => ({ ...state, rotationDeg: ((state.rotationDeg || 0) + 180) % 360 }))}
			>
				180°
			</button>
		</div>
	);
};
