/**
 * CbctLeftToolDock.tsx — Вертикальная панель инструментов КЛКТ (Мандат 8b <= 120 строк).
 */

import React, { useState } from "react";
import {
	CbctColormapFlyout,
	type CbctLeftToolDockProps,
	getNextSharpenAmount,
} from "./CbctColormapFlyout";
import { CbctLeftDockNavGroup } from "./leftDock/CbctLeftDockNavGroup";
import { CbctLeftDockMeasureGroup } from "./leftDock/CbctLeftDockMeasureGroup";
import { CbctLeftDockFilterGroup } from "./leftDock/CbctLeftDockFilterGroup";
import { CbctLeftDockActionsGroup } from "./leftDock/CbctLeftDockActionsGroup";
import { CbctSlabFlyout } from "./CbctSlabFlyout";

export * from "./CbctColormapFlyout";

export const CbctLeftToolDock: React.FC<CbctLeftToolDockProps> = ({
	activeTool, onSelectTool, slabMode = "single", onSelectSlabMode,
	slabThicknessMm = 1.0, onChangeSlabThicknessMm, colorMap, onSelectColorMap,
	sharpenAmount = 0, onChangeSharpenAmount, onResetView, invertColors,
	onToggleInvertColors, showDentalArch, onToggleDentalArch, onOpenDicomFolder,
	className = "",
}) => {
	const [openMenu, setOpenMenu] = useState<"none" | "slab" | "colormap">("none");

	return (
		<aside className={`w-12 bg-[var(--paper-strong)] border-r border-[var(--line)] flex flex-col items-center py-2 gap-3 select-none flex-shrink-0 z-20 relative ${className}`}>
			<CbctLeftDockNavGroup activeTool={activeTool} onSelectTool={onSelectTool} />
			<div className="w-6 h-px bg-[var(--line)]" />
			<CbctLeftDockMeasureGroup activeTool={activeTool} onSelectTool={onSelectTool} />
			<div className="w-6 h-px bg-[var(--line)]" />
			<CbctLeftDockFilterGroup
				onToggleColormapMenu={() => setOpenMenu((p) => (p === "colormap" ? "none" : "colormap"))}
				isColormapOpen={openMenu === "colormap"}
				colorMap={colorMap}
				onToggleSlabMenu={() => setOpenMenu((p) => (p === "slab" ? "none" : "slab"))}
				isSlabOpen={openMenu === "slab"}
				sharpenAmount={sharpenAmount}
				onCycleSharpen={() => onChangeSharpenAmount?.(getNextSharpenAmount(sharpenAmount))}
				invertColors={invertColors}
				onToggleInvertColors={onToggleInvertColors}
			/>
			<div className="w-6 h-px bg-[var(--line)]" />
			<CbctLeftDockActionsGroup
				showDentalArch={showDentalArch} onToggleDentalArch={onToggleDentalArch}
				onOpenDicomFolder={onOpenDicomFolder} onResetView={onResetView}
			/>

			{openMenu === "colormap" && onSelectColorMap && (
				<div className="absolute left-14 top-40 z-50">
					<CbctColormapFlyout
						activeColorMap={typeof colorMap === "number" ? (CBCT_COLORMAP_PRESETS[colorMap]?.id ?? "grayscale") : (colorMap ?? "grayscale")}
						onSelectColorMap={(cm) => { onSelectColorMap(cm); setOpenMenu("none"); }}
						onClose={() => setOpenMenu("none")}
					/>
				</div>
			)}

			{openMenu === "slab" && onSelectSlabMode && onChangeSlabThicknessMm && (
				<div className="absolute left-14 top-48 z-50">
					<CbctSlabFlyout
						normalizedSlabMode={(slabMode === "mip" || slabMode === "average" || slabMode === "minip") ? slabMode : "single"}
						onSelectSlabMode={onSelectSlabMode}
						slabThicknessMm={slabThicknessMm}
						onChangeSlabThicknessMm={onChangeSlabThicknessMm}
						onClose={() => setOpenMenu("none")}
					/>
				</div>
			)}
		</aside>
	);
};
