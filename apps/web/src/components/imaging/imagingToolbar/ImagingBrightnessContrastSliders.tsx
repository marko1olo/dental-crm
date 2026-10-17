import React from "react";
import type { ImagingViewerState } from "../types.js";

export interface ImagingBrightnessContrastSlidersProps {
	readonly imagingViewerState: ImagingViewerState;
	readonly setImagingViewerState: (updater: (prev: any) => any) => void;
}

export const ImagingBrightnessContrastSliders: React.FC<ImagingBrightnessContrastSlidersProps> = ({
	imagingViewerState,
	setImagingViewerState,
}) => {
	const brightness = imagingViewerState.brightness ?? 1;
	const contrast = imagingViewerState.contrast ?? 1;

	return (
		<div className="viewer-slider-grid flex flex-wrap sm:flex-nowrap items-center gap-3 w-full static pt-1 px-0.5">
			<label className="text-xs font-medium text-[var(--ink-muted)] flex items-center gap-2 flex-1 min-w-[140px]">
				<span className="shrink-0 font-semibold text-[var(--ink)]">Яркость:</span>
				<input
					min="0.65"
					max="1.45"
					step="0.05"
					type="range"
					className="flex-1 h-1.5 accent-[var(--teal)] cursor-pointer"
					value={brightness}
					onChange={(e) => {
						const val = Number(e.target.value);
						setImagingViewerState((state: any) => ({ ...state, brightness: val }));
					}}
				/>
				<span className="text-xs text-[var(--teal)] font-mono w-9 text-right font-bold">
					{Math.round(brightness * 100)}%
				</span>
			</label>
			<label className="text-xs font-medium text-[var(--ink-muted)] flex items-center gap-2 flex-1 min-w-[140px]">
				<span className="shrink-0 font-semibold text-[var(--ink)]">Контраст:</span>
				<input
					min="0.75"
					max="1.85"
					step="0.05"
					type="range"
					className="flex-1 h-1.5 accent-[var(--teal)] cursor-pointer"
					value={contrast}
					onChange={(e) => {
						const val = Number(e.target.value);
						setImagingViewerState((state: any) => ({ ...state, contrast: val }));
					}}
				/>
				<span className="text-xs text-[var(--teal)] font-mono w-9 text-right font-bold">
					{Math.round(contrast * 100)}%
				</span>
			</label>
		</div>
	);
};
