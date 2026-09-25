import React from "react";
import { Eye, FlipHorizontal, Maximize2, Minus, Plus, RotateCw } from "lucide-react";

export interface DirectRvgViewportToolbarProps {
	zoom: number;
	flipH: boolean;
	isSplitCompare: boolean;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onRotate: () => void;
	onToggleFlipH: () => void;
	onResetTransform: () => void;
}

export const DirectRvgViewportToolbar: React.FC<DirectRvgViewportToolbarProps> = ({
	zoom,
	flipH,
	isSplitCompare,
	onZoomIn,
	onZoomOut,
	onRotate,
	onToggleFlipH,
	onResetTransform,
}) => {
	return (
		<div className="rvg-viewport-top-toolbar">
			<div className="rvg-toolbar-glass-cluster">
				<button
					type="button"
					onClick={onZoomIn}
					className="rvg-tool-btn"
					title="Увеличить (+)"
					data-testid="rvg-zoom-in-btn"
				>
					<Plus className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={onZoomOut}
					className="rvg-tool-btn"
					title="Уменьшить (-)"
					data-testid="rvg-zoom-out-btn"
				>
					<Minus className="w-4 h-4" />
				</button>
				<span className="text-[11px] font-mono font-bold text-slate-300 px-1">
					{Math.round(zoom * 100)}%
				</span>
				<div className="w-[1px] h-4 bg-slate-700 mx-0.5" />
				<button
					type="button"
					onClick={onRotate}
					className="rvg-tool-btn"
					title="Повернуть на 90° (R)"
					data-testid="rvg-rotate-btn"
				>
					<RotateCw className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={onToggleFlipH}
					className={`rvg-tool-btn ${flipH ? "active" : ""}`}
					title="Отразить по горизонтали"
					data-testid="rvg-flip-btn"
				>
					<FlipHorizontal className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={onResetTransform}
					className="rvg-tool-btn"
					title="Сбросить масштаб и положение (0)"
					data-testid="rvg-reset-transform-btn"
				>
					<Maximize2 className="w-4 h-4" />
				</button>
			</div>

			{/* Split compare indicator */}
			{isSplitCompare && (
				<div className="rvg-toolbar-glass-cluster text-xs font-semibold text-cyan-300">
					<Eye className="w-3.5 h-3.5" />
					<span>Режим сравнения (Оригинал / Фильтр)</span>
				</div>
			)}
		</div>
	);
};
