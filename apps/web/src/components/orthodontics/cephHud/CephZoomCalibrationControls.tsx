import React from "react";
import { RotateCcw, Ruler, ZoomIn, ZoomOut } from "lucide-react";

export interface CephZoomCalibrationControlsProps {
	readonly zoom: number;
	readonly onZoomIn: () => void;
	readonly onZoomOut: () => void;
	readonly onResetView: () => void;
	readonly isCalibrating: boolean;
	readonly onToggleCalibrating: () => void;
}

export const CephZoomCalibrationControls: React.FC<CephZoomCalibrationControlsProps> = ({
	zoom,
	onZoomIn,
	onZoomOut,
	onResetView,
	isCalibrating,
	onToggleCalibrating,
}) => {
	return (
		<div className="flex items-center gap-0.5 sm:gap-1 bg-[var(--paper-soft)] p-0.5 rounded-lg border border-[var(--line)] shrink-0 flex-nowrap">
			<button
				type="button"
				onClick={onZoomOut}
				className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] transition-colors cursor-pointer shrink-0"
				title="Отдалить (Масштаб -)"
				aria-label="Отдалить масштаб"
			>
				<ZoomOut size={14} />
			</button>
			<span className="text-[12px] font-mono font-bold text-[var(--primary)] px-1 min-w-[36px] text-center">
				{Math.round(zoom * 100)}%
			</span>
			<button
				type="button"
				onClick={onZoomIn}
				className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] transition-colors cursor-pointer shrink-0"
				title="Приблизить (Масштаб +)"
				aria-label="Приблизить масштаб"
			>
				<ZoomIn size={14} />
			</button>
			<button
				type="button"
				onClick={onResetView}
				className="w-7 h-7 rounded-md flex items-center justify-center bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] transition-colors cursor-pointer shrink-0"
				title="Сбросить масштаб и положение (0)"
				aria-label="Сбросить масштаб"
			>
				<RotateCcw size={13} />
			</button>
			<button
				type="button"
				onClick={onToggleCalibrating}
				className={`h-7 px-2.5 rounded-md flex items-center gap-1.5 text-[12.5px] font-semibold shrink-0 whitespace-nowrap transition-colors cursor-pointer ${
					isCalibrating
						? "bg-amber-500 text-slate-950 font-black border border-amber-300 shadow-sm"
						: "bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-[var(--line)] shadow-sm"
				}`}
				title="Калибровка масштаба по линейке (мм/px)"
				aria-label="Калибровка масштаба"
			>
				<Ruler size={13} className="shrink-0 text-teal-400" />
				<span style={{ whiteSpace: "nowrap", flexShrink: 0 }}>Линейка</span>
			</button>
		</div>
	);
};
