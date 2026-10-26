/**
 * CbctLeftDockFilterGroup.tsx — Фильтры, LUT-палитры и проекции срезов (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Layers, Palette, Sparkles, SunMoon } from "lucide-react";
import { CBCT_COLORMAP_PRESETS, DockTooltip, getToolBtnClass } from "../CbctColormapFlyout";

export interface CbctLeftDockFilterGroupProps {
	readonly onToggleColormapMenu: () => void;
	readonly isColormapOpen: boolean;
	readonly colorMap?: string | number | undefined;
	readonly onToggleSlabMenu: () => void;
	readonly isSlabOpen: boolean;
	readonly sharpenAmount?: number | undefined;
	readonly onCycleSharpen: () => void;
	readonly invertColors?: boolean | undefined;
	readonly onToggleInvertColors?: (() => void) | undefined;
}

export const CbctLeftDockFilterGroup: React.FC<CbctLeftDockFilterGroupProps> = ({
	onToggleColormapMenu, isColormapOpen, colorMap, onToggleSlabMenu,
	isSlabOpen, sharpenAmount = 0, onCycleSharpen, invertColors, onToggleInvertColors,
}) => {
	const activeColorMapMode = typeof colorMap === "number" ? (CBCT_COLORMAP_PRESETS[colorMap]?.id ?? "grayscale") : (colorMap ?? "grayscale");
	const colormapBadge = activeColorMapMode === "bone_density" ? "МИШ" : activeColorMapMode === "endo" ? "ЭНД" : activeColorMapMode === "inverted" ? "ИНВ" : "LUT";
	const sharpenBadge = sharpenAmount === 1.0 ? "100%" : sharpenAmount === 0.5 ? "50%" : "0%";
	const sharpenActiveCls = sharpenAmount > 0 ? "bg-cyan-500/25 text-cyan-300 border-cyan-500/60 shadow-xs shadow-cyan-950/40" : "";

	return (
		<div className="flex flex-col gap-1 items-center">
			<DockTooltip text="Цветовые карты / LUT">
				<button
					type="button"
					onClick={onToggleColormapMenu}
					className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-md flex flex-col items-center justify-center relative transition-all duration-150 ${getToolBtnClass(isColormapOpen || activeColorMapMode !== "grayscale")}`}
					title="Цветовая палитра"
					data-testid="cbct-tool-colormap"
				>
					<Palette className="w-3.5 h-3.5 shrink-0" />
					<span className="text-[7.5px] font-mono font-bold leading-none mt-0.5">{colormapBadge}</span>
				</button>
			</DockTooltip>

			<DockTooltip text="Толщина среза / MIP / MinIP">
				<button
					type="button"
					onClick={onToggleSlabMenu}
					className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-md flex items-center justify-center transition-all duration-150 ${getToolBtnClass(isSlabOpen)}`}
					title="Толстый срез"
					data-testid="cbct-tool-slab"
				>
					<Layers className="w-4 h-4" />
				</button>
			</DockTooltip>

			<DockTooltip text={`Резкость контуров (сейчас: ${sharpenAmount > 0 ? `${sharpenAmount}x` : "выкл"})`}>
				<button
					type="button"
					onClick={onCycleSharpen}
					className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-md flex flex-col items-center justify-center relative transition-all duration-150 ${getToolBtnClass(sharpenAmount > 0)} ${sharpenActiveCls}`}
					title="Фильтр резкости"
					data-testid="cbct-tool-sharpen"
				>
					<Sparkles className="w-3.5 h-3.5 shrink-0" />
					<span className="text-[7.5px] font-mono font-bold leading-none mt-0.5">{sharpenBadge}</span>
				</button>
			</DockTooltip>

			{onToggleInvertColors && (
				<DockTooltip text="Инвертировать цвета">
					<button
						type="button"
						onClick={onToggleInvertColors}
						className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-md flex items-center justify-center transition-all duration-150 ${getToolBtnClass(Boolean(invertColors))}`}
						title="Инверсия негатив/позитив"
					>
						<SunMoon className="w-4 h-4" />
					</button>
				</DockTooltip>
			)}
		</div>
	);
};
