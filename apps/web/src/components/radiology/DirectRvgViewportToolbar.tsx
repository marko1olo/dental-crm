import React from "react";
import { Eye, FlipHorizontal, FlipVertical, Maximize2, Minus, Plus, RotateCcw, RotateCw } from "lucide-react";

export interface DirectRvgViewportToolbarProps {
	zoom: number;
	flipH: boolean;
	flipV?: boolean;
	isSplitCompare: boolean;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onRotate: () => void;
	onRotateCcw?: () => void;
	onToggleFlipH: () => void;
	onToggleFlipV?: () => void;
	onResetTransform: () => void;
	extraSlot?: React.ReactNode;
}

export const DirectRvgViewportToolbar: React.FC<DirectRvgViewportToolbarProps> = ({
	zoom,
	flipH,
	flipV = false,
	isSplitCompare,
	onZoomIn,
	onZoomOut,
	onRotate,
	onRotateCcw,
	onToggleFlipH,
	onToggleFlipV,
	onResetTransform,
	extraSlot,
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
					onClick={onRotateCcw ?? onRotate}
					className="rvg-tool-btn"
					title="Повернуть на 90° против часовой (CCW)"
					data-testid="rvg-rotate-ccw-btn"
				>
					<RotateCcw className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={onRotate}
					className="rvg-tool-btn"
					title="Повернуть на 90° по часовой (CW / R)"
					data-testid="rvg-rotate-btn"
				>
					<RotateCw className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={onToggleFlipH}
					className={`rvg-tool-btn ${flipH ? "active" : ""}`}
					title="Отразить по горизонтали (Mirror X)"
					data-testid="rvg-flip-btn"
				>
					<FlipHorizontal className="w-4 h-4" />
				</button>
				{onToggleFlipV && (
					<button
						type="button"
						onClick={onToggleFlipV}
						className={`rvg-tool-btn ${flipV ? "active" : ""}`}
						title="Отразить по вертикали (Mirror Y)"
						data-testid="rvg-flip-v-btn"
					>
						<FlipVertical className="w-4 h-4" />
					</button>
				)}
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

			{/* Center / Right: 1-Row Hick's Law Filters Toolbar Slot */}
			{extraSlot && (
				<div className="pointer-events-auto flex items-center">
					{extraSlot}
				</div>
			)}

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

