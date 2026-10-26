/**
 * CbctLeftDockNavGroup.tsx — Кнопки навигации и манипуляций левого дока (Мандат 8b).
 */

import React from "react";
import { Crosshair, Hand, Sliders, ZoomIn } from "lucide-react";
import { DockTooltip, getToolBtnClass, type CbctToolMode } from "../CbctColormapFlyout";

export interface CbctLeftDockNavGroupProps {
	readonly activeTool: CbctToolMode;
	readonly onSelectTool: (tool: CbctToolMode) => void;
}

export const CbctLeftDockNavGroup: React.FC<CbctLeftDockNavGroupProps> = ({
	activeTool,
	onSelectTool,
}) => {
	return (
		<div className="flex flex-col gap-1 items-center">
			<DockTooltip text="Перекрестие (C)">
				<button
					type="button"
					onClick={() => onSelectTool("crosshair")}
					className={getToolBtnClass(activeTool === "crosshair")}
					title="Перекрестие срезов"
				>
					<Crosshair className="w-4 h-4" />
				</button>
			</DockTooltip>

			<DockTooltip text="Яркость / Контраст (W)">
				<button
					type="button"
					onClick={() => onSelectTool("window_level")}
					className={getToolBtnClass(activeTool === "window_level")}
					title="Окно контрастности HU"
				>
					<Sliders className="w-4 h-4" />
				</button>
			</DockTooltip>

			<DockTooltip text="Панорамирование (H)">
				<button
					type="button"
					onClick={() => onSelectTool("pan")}
					className={getToolBtnClass(activeTool === "pan")}
					title="Перемещение среза"
				>
					<Hand className="w-4 h-4" />
				</button>
			</DockTooltip>

			<DockTooltip text="Масштабирование (Z)">
				<button
					type="button"
					onClick={() => onSelectTool("zoom")}
					className={getToolBtnClass(activeTool === "zoom")}
					title="Увеличение"
				>
					<ZoomIn className="w-4 h-4" />
				</button>
			</DockTooltip>
		</div>
	);
};
