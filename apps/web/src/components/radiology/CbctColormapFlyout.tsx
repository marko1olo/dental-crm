/**
 * DENTE CRM — CBCT Colormap & Sharpening Flyout Library
 * Clinical Colormap Presets & WebGL2 Hardware Synchronization
 */

import { Check, Palette, X } from "lucide-react";
import React from "react";
import type { SlabProjectionMode } from "./cbctMprMath";
import {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
} from "./mpr/webgl/CbctVolumeGlContext";

export { CBCT_COLORMAP_MODES, type CbctColorMapMode };

/** Clinical Colormap Presets (DICOM Grayscale, Misch D1-D4 Bone Density, Endo Microcracks, Inverted Paper) */
export interface CbctColormapPreset {
	readonly id: CbctColorMapMode;
	readonly code: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly descriptionRu: string;
	readonly testId: string;
}

export const CBCT_COLORMAP_PRESETS: readonly CbctColormapPreset[] = [
	{
		id: "grayscale",
		code: 0,
		label: "Серый (DICOM)",
		shortLabel: "Серый",
		descriptionRu: "Стандартный монохромный рентген DICOM PS 3.3",
		testId: "cbct-colormap-grayscale",
	},
	{
		id: "bone_density",
		code: 1,
		label: "Плотность кости (Миш D1-D4)",
		shortLabel: "Миш D1-D4",
		descriptionRu: "Клиническая карта плотности кости Misch D1-D4 (D1-D4)",
		testId: "cbct-colormap-bone-density",
	},
	{
		id: "endo",
		code: 2,
		label: "Эндо (Микротрещины)",
		shortLabel: "Эндо",
		descriptionRu: "Высококонтрастный режим для поиска скрытых каналов (MB2) и микротрещин",
		testId: "cbct-colormap-endo",
	},
	{
		id: "inverted",
		code: 3,
		label: "Белая бумага (Печать)",
		shortLabel: "Печать",
		descriptionRu: "Инвертированный рентген (негатив) для качественной печати на бумаге",
		testId: "cbct-colormap-inverted",
	},
] as const;

/** Cycles sharpness amount in 1-click: Off (0.0) -> 50% (0.5) -> 100% (1.0) -> Off (0.0) */
export function getNextSharpenAmount(current: number): number {
	if (current < 0.25) return 0.5;
	if (current < 0.75) return 1.0;
	return 0.0;
}

export interface CbctColormapFlyoutProps {
	readonly activeColorMap: CbctColorMapMode;
	readonly onSelectColorMap: (mode: CbctColorMapMode) => void;
	readonly onClose: () => void;
}

export const CbctColormapFlyout: React.FC<CbctColormapFlyoutProps> = ({
	activeColorMap,
	onSelectColorMap,
	onClose,
}) => {
	return (
		<div
			role="dialog"
			aria-label="Цветовые карты WebGL2"
			data-testid="cbct-colormap-flyout"
			className="absolute left-full ml-2 top-0 max-sm:top-auto max-sm:bottom-0 z-50 w-72 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100 max-sm:max-h-[calc(100vh-120px)] max-sm:overflow-y-auto"
		>
			<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
				<div className="flex items-center gap-1.5">
					<Palette className="w-4 h-4 text-purple-400" />
					<span className="text-xs font-bold text-zinc-100">
						Цветовые карты WebGL2
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-7 h-7 min-w-[28px] min-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
					aria-label="Закрыть меню"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			<div className="space-y-1">
				{CBCT_COLORMAP_PRESETS.map((p) => {
					const isActive = activeColorMap === p.id;
					return (
						<button
							key={p.id}
							type="button"
							onClick={() => onSelectColorMap(p.id)}
							className={`w-full px-2.5 py-1.5 [@media(pointer:coarse)]:py-2 rounded-lg text-left transition-colors flex items-center justify-between gap-2 border ${
								isActive
									? "bg-zinc-800 text-purple-300 border-purple-500/60 shadow-xs"
									: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-zinc-800"
							}`}
							data-testid={p.testId}
						>
							<div className="flex flex-col min-w-0">
								<div className="flex items-center gap-2">
									<span
										className={`w-2.5 h-2.5 rounded-full shrink-0 ${
											p.id === "bone_density"
												? "bg-gradient-to-r from-orange-500 to-emerald-400"
												: p.id === "endo"
													? "bg-sky-400"
													: p.id === "inverted"
														? "bg-zinc-100"
														: "bg-zinc-500"
										}`}
									/>
									<span className="text-xs font-semibold truncate text-zinc-100">
										{p.label}
									</span>
								</div>
								<span className="text-[10px] text-zinc-400 font-sans truncate pl-4.5">
									{p.descriptionRu}
								</span>
							</div>
							{isActive && (
								<Check className="w-4 h-4 text-purple-400 shrink-0" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};

/** Active Cursor / Mouse Tool Modes */
export type CbctToolMode =
	| "crosshair"
	| "pan"
	| "zoom"
	| "window_level"
	| "rotate"
	| "ruler"
	| "angle"
	| "probe"
	| "nerve"
	| "endo_canal";

export interface CbctLeftToolDockProps {
	/** Active cursor / mouse tool */
	readonly activeTool: CbctToolMode;
	/** Callback when tool is selected */
	readonly onSelectTool: (tool: CbctToolMode) => void;

	/** Current slab projection mode ('single' | 'mip' | 'average' | 'minip') */
	readonly slabMode?: SlabProjectionMode | string | undefined;
	/** Callback when slab projection mode is selected */
	readonly onSelectSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;

	/** Current slab thickness in physical millimeters (1..30 mm) */
	readonly slabThicknessMm?: number | undefined;
	/** Callback when slab thickness changes */
	readonly onChangeSlabThicknessMm?: ((thicknessMm: number) => void) | undefined;

	/** Active HU preset ID (e.g. 'bone_dense', 'enamel_dentin', 'soft_tissue') */
	readonly activePresetId?: string | undefined;
	/** Callback when HU preset is selected */
	readonly onSelectPreset?: ((presetId: string) => void) | undefined;

	/** WebGL2 Colormap Mode ('grayscale' | 'bone_density' | 'endo' | 'inverted' or 0..3) */
	readonly colorMap?: CbctColorMapMode | number | undefined;
	/** Callback when Colormap Mode changes */
	readonly onSelectColorMap?: ((mode: CbctColorMapMode) => void) | undefined;

	/** Hardware Trabecular Sharpening Amount (0.0 .. 1.0) */
	readonly sharpenAmount?: number | undefined;
	/** Callback when Sharpening Amount changes */
	readonly onChangeSharpenAmount?: ((amount: number) => void) | undefined;

	/** 1-Click Reset all axes rotation, zoom, and pan */
	readonly onResetAll?: (() => void) | undefined;
	/** 1-Click Reset view (zoom, pan, rotation) */
	readonly onResetView?: (() => void) | undefined;

	/** Invert Grayscale LUT (Negative/Positive toggle) */
	readonly invertColors?: boolean | undefined;
	/** Callback to toggle LUT inversion */
	readonly onToggleInvertColors?: (() => void) | undefined;

	/** Show / Hide Dental Arch (OPTT Spline) */
	readonly showDentalArch?: boolean | undefined;
	/** Callback to toggle Dental Arch visibility */
	readonly onToggleDentalArch?: (() => void) | undefined;
	/** Callback to trigger automatic dental arch detection */
	readonly onAutoDetectArch?: (() => void) | undefined;

	/** Active Studio Mode ('diagnostic' | 'implant' | 'endo' | 'tmj') */
	readonly studioMode?: string | undefined;
	/** Callback to switch Studio Mode */
	readonly onSelectStudioMode?: ((mode: "implant" | "diagnostic") => void) | undefined;

	/** Trigger loading real DICOM folder */
	readonly onOpenDicomFolder?: (() => void) | undefined;
	/** Trigger loading real DICOM ZIP archive */
	readonly onOpenDicomZip?: (() => void) | undefined;
	/** Clear View mode: temporarily hide all overlays and grids for fine bone crack inspection */
	readonly isClearView?: boolean | undefined;
	/** Callback to toggle Clear View mode */
	readonly onToggleClearView?: (() => void) | undefined;

	/** Optional container class name */
	readonly className?: string | undefined;
}

export interface DockTooltipProps {
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly shortcut?: string | undefined;
	readonly titleColor?: string | undefined;
	readonly bottomClass?: string | undefined;
}

export const DockTooltip: React.FC<DockTooltipProps> = ({
	title,
	subtitle,
	shortcut,
	titleColor = "",
	bottomClass = "top-1/2 -translate-y-1/2",
}) => (
	<div
		role="tooltip"
		className={`pointer-events-none absolute left-full ml-2 ${bottomClass} opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2`}
	>
		<span className={`font-semibold ${titleColor}`}>{title}</span>
		{subtitle && <span className="text-[var(--muted,#a1a1aa)] text-[11px]">{subtitle}</span>}
		{shortcut && (
			<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
				{shortcut}
			</kbd>
		)}
	</div>
);

export const getToolBtnClass = (
	isActive: boolean,
	activeStyle = "bg-sky-500/20 text-sky-400 border border-sky-500/60 shadow-xs shadow-cyan-950/40",
) =>
	`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center transition-all duration-150 ${
		isActive
			? activeStyle
			: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
	}`;
