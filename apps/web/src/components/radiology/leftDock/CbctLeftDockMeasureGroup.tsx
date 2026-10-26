/**
 * CbctLeftDockMeasureGroup.tsx — Кнопки измерений: линейка, угломер, нерв, зонд (Мандат 8b).
 */

import React from "react";
import { CircleDot, Compass, Ruler } from "lucide-react";
import { NerveCanal } from "../../icons/DentalIcons";
import { DockTooltip, getToolBtnClass, type CbctToolMode } from "../CbctColormapFlyout";

export interface CbctLeftDockMeasureGroupProps {
	readonly activeTool: CbctToolMode;
	readonly onSelectTool: (tool: CbctToolMode) => void;
}

export const CbctLeftDockMeasureGroup: React.FC<CbctLeftDockMeasureGroupProps> = ({
	activeTool,
	onSelectTool,
}) => {
	return (
		<div className="flex flex-col gap-1 items-center">
			<DockTooltip text="Линейка (M)">
				<button
					type="button"
					onClick={() => onSelectTool("ruler")}
					className={getToolBtnClass(activeTool === "ruler")}
					title="Измерительная линейка"
				>
					<Ruler className="w-4 h-4" />
				</button>
			</DockTooltip>

			<DockTooltip text="Угломер (A)">
				<button
					type="button"
					onClick={() => onSelectTool("angle")}
					className={getToolBtnClass(activeTool === "angle")}
					title="Угломер"
				>
					<Compass className="w-4 h-4" />
				</button>
			</DockTooltip>

			<DockTooltip text="Трассировка нерва (N)">
				<button
					type="button"
					onClick={() => onSelectTool("nerve")}
					className={getToolBtnClass(activeTool === "nerve")}
					title="Нижнечелюстной канал"
				>
					<NerveCanal className="w-4 h-4" />
				</button>
			</DockTooltip>

			<DockTooltip text="Денситометр HU (P)">
				<button
					type="button"
					onClick={() => onSelectTool("probe")}
					className={getToolBtnClass(activeTool === "probe")}
					title="Замер плотности ткани HU"
				>
					<CircleDot className="w-4 h-4" />
				</button>
			</DockTooltip>
		</div>
	);
};
