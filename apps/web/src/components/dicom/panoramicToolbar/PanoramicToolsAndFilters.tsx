/**
 * PanoramicToolsAndFilters.tsx — Инструменты разметки и фильтры панорамного тулбара
 * Mandate 8b: строго <= 120 строк.
 */

import React from "react";
import { Compass, Contrast, MousePointer, RotateCcw, Ruler, Sparkles } from "lucide-react";

interface Props {
	activeTool?: "select" | "ruler" | "angle" | undefined;
	onSelectTool?: ((tool: "select" | "ruler" | "angle") => void) | undefined;
	isSharpenActive?: boolean | undefined;
	onToggleSharpen?: (() => void) | undefined;
	isInvertColors?: boolean | undefined;
	onToggleInvertColors?: (() => void) | undefined;
	onReset?: (() => void) | undefined;
}

export const PanoramicToolsAndFilters: React.FC<Props> = ({
	activeTool = "select", onSelectTool,
	isSharpenActive = false, onToggleSharpen,
	isInvertColors = false, onToggleInvertColors, onReset,
}) => {
	const getToolBtnClass = (tool: "select" | "ruler" | "angle") =>
		`secondary-button px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] ${
			activeTool === tool
				? "bg-[var(--teal,#0d9488)] text-white shadow-xs border-[var(--teal,#0d9488)]"
				: "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60"
		}`;

	return (
		<div className="flex items-center gap-1.5 shrink-0">
			<div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-neutral-800">
				<button type="button" onClick={() => onSelectTool?.("select")} className={getToolBtnClass("select")} title="Навигация и денситометрия HU" data-testid="btn-tool-select">
					<MousePointer className="w-3.5 h-3.5" /><span className="hidden sm:inline">Курсор</span>
				</button>
				<button type="button" onClick={() => onSelectTool?.("ruler")} className={getToolBtnClass("ruler")} title="Метрическая линейка 1:1 в мм" data-testid="btn-tool-ruler">
					<Ruler className="w-3.5 h-3.5" /><span className="hidden sm:inline">Линейка</span>
				</button>
				<button type="button" onClick={() => onSelectTool?.("angle")} className={getToolBtnClass("angle")} title="Угломер оси наклона (°)" data-testid="btn-tool-angle">
					<Compass className="w-3.5 h-3.5" /><span className="hidden sm:inline">Угол</span>
				</button>
			</div>

			<div className="w-[1px] h-5 bg-neutral-800 shrink-0" />

			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={onToggleSharpen}
					className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] border ${
						isSharpenActive ? "bg-teal-600/30 text-teal-300 border-teal-500/50 shadow-xs" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
					}`}
					title="Резкость трабекул (Sharpen Filter)"
					data-testid="btn-filter-sharpen"
				>
					<Sparkles className="w-3.5 h-3.5 text-teal-400" /><span className="hidden md:inline">Резкость</span>
				</button>

				<button
					type="button"
					onClick={onToggleInvertColors}
					className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] border ${
						isInvertColors ? "bg-amber-600/30 text-amber-300 border-amber-500/50 shadow-xs" : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
					}`}
					title="Инверсия цветов (Негатив/Позитив)"
					data-testid="btn-filter-invert"
				>
					<Contrast className="w-3.5 h-3.5 text-amber-400" /><span className="hidden md:inline">Инверсия</span>
				</button>

				<button
					type="button"
					onClick={onReset}
					className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all min-h-[30px] bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-300 hover:bg-neutral-800"
					title="Сброс масштаба, фильтров и инструментов"
					data-testid="btn-tool-reset"
				>
					<RotateCcw className="w-3.5 h-3.5" /><span className="hidden lg:inline">Сброс</span>
				</button>
			</div>
		</div>
	);
};
