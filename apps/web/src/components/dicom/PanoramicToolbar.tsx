import React from "react";
import {
	ChevronLeft,
	ChevronRight,
	Compass,
	Contrast,
	MousePointer,
	RotateCcw,
	Ruler,
	Sparkles,
} from "lucide-react";
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
	readonly isSharpenActive?: boolean | undefined;
	readonly onToggleSharpen?: (() => void) | undefined;
	readonly isInvertColors?: boolean | undefined;
	readonly onToggleInvertColors?: (() => void) | undefined;
	readonly activeTool?: "select" | "ruler" | "angle" | undefined;
	readonly onSelectTool?: ((tool: "select" | "ruler" | "angle") => void) | undefined;
	readonly onReset?: (() => void) | undefined;
}

export const PanoramicToolbar: React.FC<PanoramicToolbarProps> = ({
	activePreset,
	onSelectPreset,
	crossSections,
	activeCrossSectionIdx,
	onSelectCrossSectionIdx,
	sliceThicknessMm,
	onChangeSliceThicknessMm,
	isSharpenActive = false,
	onToggleSharpen,
	isInvertColors = false,
	onToggleInvertColors,
	activeTool = "select",
	onSelectTool,
	onReset,
}) => {
	const activeSlice = crossSections[activeCrossSectionIdx] ?? crossSections[0];

	return (
		<div
			className="panoramic-toolbar-1row h-12 min-h-[48px] max-h-[48px] px-3 flex flex-nowrap items-center justify-between gap-2 border-b text-xs overflow-x-auto no-scrollbar shrink-0 select-none"
			style={{
				background: "var(--paper-strong, #09090b)",
				borderColor: "var(--line, #27272a)",
				color: "var(--ink, #ffffff)",
			}}
			data-testid="panoramic-toolbar-1row"
		>
			{/* LEFT GROUP: Interactive Clinical Tools & Filters */}
			<div className="flex items-center gap-1.5 shrink-0">
				{/* Tool Selectors */}
				<div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-neutral-800">
					<button
						type="button"
						onClick={() => onSelectTool?.("select")}
						className={`secondary-button px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] ${
							activeTool === "select"
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs border-[var(--teal,#0d9488)]"
								: "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
						}`}
						title="Навигация и денситометрия HU"
						data-testid="btn-tool-select"
					>
						<MousePointer className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Курсор</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTool?.("ruler")}
						className={`secondary-button px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] ${
							activeTool === "ruler"
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs border-[var(--teal,#0d9488)]"
								: "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
						}`}
						title="Метрическая линейка 1:1 в мм"
						data-testid="btn-tool-ruler"
					>
						<Ruler className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Линейка</span>
					</button>

					<button
						type="button"
						onClick={() => onSelectTool?.("angle")}
						className={`secondary-button px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] ${
							activeTool === "angle"
								? "bg-[var(--teal,#0d9488)] text-white shadow-xs border-[var(--teal,#0d9488)]"
								: "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
						}`}
						title="Угломер оси наклона (°)"
						data-testid="btn-tool-angle"
					>
						<Compass className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Угол</span>
					</button>
				</div>

				<div className="w-[1px] h-5 bg-neutral-800 shrink-0" />

				{/* Filters: Sharpen, Invert, Reset */}
				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={onToggleSharpen}
						className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] border ${
							isSharpenActive
								? "bg-teal-600/30 text-teal-300 border-teal-500/50 shadow-xs"
								: "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
						}`}
						title="Резкость трабекул (Sharpen Filter)"
						data-testid="btn-filter-sharpen"
					>
						<Sparkles className="w-3.5 h-3.5 text-teal-400" />
						<span className="hidden md:inline">Резкость</span>
					</button>

					<button
						type="button"
						onClick={onToggleInvertColors}
						className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] border ${
							isInvertColors
								? "bg-amber-600/30 text-amber-300 border-amber-500/50 shadow-xs"
								: "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
						}`}
						title="Инверсия цветов (Негатив/Позитив)"
						data-testid="btn-filter-invert"
					>
						<Contrast className="w-3.5 h-3.5 text-amber-400" />
						<span className="hidden md:inline">Инверсия</span>
					</button>

					<button
						type="button"
						onClick={onReset}
						className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-300 hover:bg-neutral-800"
						title="Сброс масштаба, фильтров и инструментов"
						data-testid="btn-tool-reset"
					>
						<RotateCcw className="w-3.5 h-3.5" />
						<span className="hidden lg:inline">Сброс</span>
					</button>
				</div>
			</div>

			{/* CENTER GROUP: HU Presets (Windowing WW/WL) */}
			<div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
				<span className="text-neutral-400 font-bold whitespace-nowrap text-[11px] hidden sm:inline">
					Окно:
				</span>
				<div className="flex gap-1">
					{VISIOGRAPH_PRESETS_LIST.map((preset) => (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPreset(preset.id)}
							className={`secondary-button px-2 py-1 rounded-md text-[11px] font-bold min-h-[30px] transition-all whitespace-nowrap ${
								activePreset === preset.id
									? "bg-[var(--teal,#0d9488)] text-white shadow-xs border-[var(--teal,#0d9488)]"
									: "bg-neutral-900/90 text-neutral-300 border border-neutral-800 hover:bg-neutral-800"
							}`}
							title={preset.description}
						>
							{preset.shortLabel}
						</button>
					))}
				</div>
			</div>

			{/* RIGHT GROUP: Cross-Section Stepper & Slice Thickness */}
			<div className="flex items-center gap-2 shrink-0">
				{/* Cross-Section Stepper (Step 1.0 - 2.0 mm) */}
				{crossSections.length > 0 && (
					<div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-lg border border-neutral-800">
						<span className="text-neutral-400 font-bold text-[10px] hidden sm:inline">
							Срез:
						</span>
						<button
							type="button"
							onClick={() =>
								onSelectCrossSectionIdx(Math.max(0, activeCrossSectionIdx - 1))
							}
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
							onClick={() =>
								onSelectCrossSectionIdx(
									Math.min(crossSections.length - 1, activeCrossSectionIdx + 1),
								)
							}
							disabled={activeCrossSectionIdx >= crossSections.length - 1}
							className="mpr-btn-touch min-h-[28px] min-w-[28px] p-0.5 rounded-md hover:bg-neutral-800 disabled:opacity-40"
							title="Следующий срез (шаг 1.5мм)"
						>
							<ChevronRight className="w-3.5 h-3.5" />
						</button>
					</div>
				)}

				{/* Slice Thickness Slider */}
				<div className="flex items-center gap-1.5 bg-black/40 px-2 py-0.5 rounded-lg border border-neutral-800">
					<span className="text-neutral-400 font-medium text-[10px] hidden md:inline">
						Слой:
					</span>
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
		</div>
	);
};
