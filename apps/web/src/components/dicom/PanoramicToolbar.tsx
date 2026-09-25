import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
	VISIOGRAPH_PRESETS_LIST,
	type VisiographPresetId,
} from "../visiograph/VisiographWindowPresets";
import type { CrossSectionSlicePlane } from "./panoramicMprMath";

export interface PanoramicToolbarProps {
	readonly activePreset: VisiographPresetId;
	readonly onSelectPreset: (preset: VisiographPresetId) => void;
	readonly crossSections: CrossSectionSlicePlane[];
	readonly activeCrossSectionIdx: number;
	readonly onSelectCrossSectionIdx: (idx: number) => void;
	readonly sliceThicknessMm: number;
	readonly onChangeSliceThicknessMm: (thickness: number) => void;
}

export const PanoramicToolbar: React.FC<PanoramicToolbarProps> = ({
	activePreset,
	onSelectPreset,
	crossSections,
	activeCrossSectionIdx,
	onSelectCrossSectionIdx,
	sliceThicknessMm,
	onChangeSliceThicknessMm,
}) => {
	const activeSlice = crossSections[activeCrossSectionIdx] ?? crossSections[0];

	return (
		<div className="bg-neutral-950/90 px-3 py-1.5 flex flex-nowrap items-center justify-between gap-2 border-b border-neutral-800 text-xs overflow-x-auto no-scrollbar min-h-[36px]">
			{/* HU Presets */}
			<div className="flex items-center gap-1.5 shrink-0 overflow-x-auto">
				<span className="text-neutral-400 font-medium whitespace-nowrap text-[11px]">
					HU:
				</span>
				<div className="flex gap-1">
					{VISIOGRAPH_PRESETS_LIST.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPreset(preset.id)}
							className={`px-2.5 py-1 rounded-lg text-[11px] font-bold min-h-[30px] transition-all whitespace-nowrap ${
								activePreset === preset.id
									? "bg-blue-600 text-white shadow-md"
									: "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
							}`}
							title={preset.description}
						>
							{preset.shortLabel}
						</button>
					))}
				</div>
			</div>

			{/* Cross-Section Stepper (Step 1.0 - 2.0 mm) */}
			{crossSections.length > 0 && (
				<div className="flex items-center gap-1.5 shrink-0 mpr-slice-stepper">
					<span className="text-neutral-400 font-bold text-[11px] hidden sm:inline">
						Кросс-срез:
					</span>
					<button
						type="button"
						onClick={() =>
							onSelectCrossSectionIdx(Math.max(0, activeCrossSectionIdx - 1))
						}
						disabled={activeCrossSectionIdx <= 0}
						className="mpr-btn-touch min-h-[30px] min-w-[30px] p-1 rounded-md"
						title="Предыдущий срез (шаг 1.5мм)"
					>
						<ChevronLeft className="w-3.5 h-3.5" />
					</button>

					<span className="text-[11px] font-extrabold text-blue-400 min-w-[65px] text-center">
						#{activeCrossSectionIdx + 1} / {crossSections.length} (
						{activeSlice?.arcLengthMm.toFixed(1)} мм)
					</span>

					<button
						type="button"
						onClick={() =>
							onSelectCrossSectionIdx(
								Math.min(crossSections.length - 1, activeCrossSectionIdx + 1),
							)
						}
						disabled={activeCrossSectionIdx >= crossSections.length - 1}
						className="mpr-btn-touch min-h-[30px] min-w-[30px] p-1 rounded-md"
						title="Следующий срез (шаг 1.5мм)"
					>
						<ChevronRight className="w-3.5 h-3.5" />
					</button>
				</div>
			)}

			{/* Slice Thickness Slider */}
			<div className="flex items-center gap-1.5 shrink-0">
				<span className="text-neutral-400 font-medium text-[11px] hidden sm:inline">
					Толщина:
				</span>
				<input
					type="range"
					min="0.5"
					max="20"
					step="0.5"
					value={sliceThicknessMm}
					onChange={(e) => onChangeSliceThicknessMm(Number(e.target.value))}
					className="mpr-slider-touch w-16 sm:w-20"
				/>
				<span className="text-[11px] font-bold text-[var(--teal)] w-10 text-right">
					{sliceThicknessMm.toFixed(1)} мм
				</span>
			</div>
		</div>
	);
};
