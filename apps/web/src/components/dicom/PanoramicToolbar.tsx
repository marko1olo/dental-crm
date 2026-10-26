/**
 * PanoramicToolbar.tsx — 1-строчный клинический тулбар панорамного модуля (Apple HIG)
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { VISIOGRAPH_PRESETS_LIST, type VisiographPresetId } from "../visiograph/VisiographWindowPresets.js";
import type { CrossSectionSlicePlane } from "./panoramicMprMath.js";
import { PanoramicToolsAndFilters } from "./panoramicToolbar/PanoramicToolsAndFilters.js";
import { PanoramicCrossSectionControls } from "./panoramicToolbar/PanoramicCrossSectionControls.js";

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
	return (
		<div
			className="panoramic-toolbar-1row h-12 min-h-[48px] max-h-[48px] px-3 flex flex-nowrap items-center justify-between gap-2 border-b text-xs overflow-x-auto no-scrollbar shrink-0 select-none"
			style={{ background: "var(--paper-strong, #09090b)", borderColor: "var(--line, #27272a)", color: "var(--ink, #ffffff)" }}
			data-testid="panoramic-toolbar-1row"
		>
			<PanoramicToolsAndFilters
				activeTool={activeTool}
				onSelectTool={onSelectTool}
				isSharpenActive={isSharpenActive}
				onToggleSharpen={onToggleSharpen}
				isInvertColors={isInvertColors}
				onToggleInvertColors={onToggleInvertColors}
				onReset={onReset}
			/>

			{/* CENTER GROUP: HU Presets (Windowing WW/WL) */}
			<div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
				<span className="text-neutral-400 font-bold whitespace-nowrap text-[11px] hidden sm:inline">Окно:</span>
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

			<PanoramicCrossSectionControls
				crossSections={crossSections}
				activeCrossSectionIdx={activeCrossSectionIdx}
				onSelectCrossSectionIdx={onSelectCrossSectionIdx}
				sliceThicknessMm={sliceThicknessMm}
				onChangeSliceThicknessMm={onChangeSliceThicknessMm}
			/>
		</div>
	);
};
