/**
 * PanoramicCrossSectionControls.tsx — Степпер кросс-секций и толщина среза
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CrossSectionSlicePlane } from "../panoramicMprMath.js";

interface Props {
	crossSections: CrossSectionSlicePlane[];
	activeCrossSectionIdx: number;
	onSelectCrossSectionIdx: (idx: number) => void;
	sliceThicknessMm: number;
	onChangeSliceThicknessMm: (thickness: number) => void;
}

export const PanoramicCrossSectionControls: React.FC<Props> = ({
	crossSections,
	activeCrossSectionIdx,
	onSelectCrossSectionIdx,
	sliceThicknessMm,
	onChangeSliceThicknessMm,
}) => {
	return (
		<div className="flex items-center gap-2 shrink-0">
			{crossSections.length > 0 && (
				<div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-lg border border-neutral-800">
					<span className="text-neutral-400 font-bold text-[10px] hidden sm:inline">Срез:</span>
					<button
						type="button"
						onClick={() => onSelectCrossSectionIdx(Math.max(0, activeCrossSectionIdx - 1))}
						disabled={activeCrossSectionIdx <= 0}
						className="mpr-btn-touch min-h-[28px] min-w-[28px] p-0.5 rounded-md hover:bg-neutral-800 disabled:opacity-40"
						title="Предыдущий срез (шаг 1.5мм)"
					>
						<ChevronLeft className="w-3.5 h-3.5" />
					</button>
					<span className="text-[10px] font-mono font-extrabold text-blue-400 min-w-[60px] text-center">
						#{activeCrossSectionIdx + 1}/{crossSections.length}
					</span>
					<button
						type="button"
						onClick={() => onSelectCrossSectionIdx(Math.min(crossSections.length - 1, activeCrossSectionIdx + 1))}
						disabled={activeCrossSectionIdx >= crossSections.length - 1}
						className="mpr-btn-touch min-h-[28px] min-w-[28px] p-0.5 rounded-md hover:bg-neutral-800 disabled:opacity-40"
						title="Следующий срез (шаг 1.5мм)"
					>
						<ChevronRight className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			<div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-neutral-800">
				<span className="text-neutral-400 font-medium text-[10px] hidden md:inline">Слой:</span>
				<input
					type="range"
					min="0.5"
					max="20"
					step="0.5"
					value={sliceThicknessMm}
					onChange={(e) => onChangeSliceThicknessMm(Number(e.target.value))}
					className="mpr-slider-touch w-14 sm:w-16"
				/>
				<span className="text-[10px] font-bold text-[var(--teal,#0d9488)] w-8 text-right font-mono">
					{sliceThicknessMm.toFixed(1)}
				</span>
			</div>
		</div>
	);
};
