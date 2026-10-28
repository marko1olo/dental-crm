import React from "react";
import { Maximize2, Minimize2, RotateCcw } from "lucide-react";
import type { CbctViewportType } from "../cbctMprMath";

export interface ViewportTopRightControlsProps {
	readonly viewportType: CbctViewportType;
	readonly isMaximized?: boolean | undefined;
	readonly onToggleMaximize?: (() => void) | undefined;
	readonly onResetView?: (() => void) | undefined;
	readonly obliqueAngleDeg?: number | undefined;
	readonly onResetAngle?: (() => void) | undefined;
	readonly isRotating?: boolean | undefined;
	readonly isHandleHovered?: boolean | undefined;
	readonly toolsSlot?: React.ReactNode | undefined;
}

export const ViewportTopRightControls: React.FC<ViewportTopRightControlsProps> = ({
	viewportType, isMaximized = false, onToggleMaximize, onResetView,
	obliqueAngleDeg, onResetAngle, isRotating = false, isHandleHovered = false, toolsSlot,
}) => {
	return (
		<div className="absolute top-2 right-2 pointer-events-auto flex flex-col items-end gap-1 z-30 select-none">
			{onToggleMaximize && (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onToggleMaximize(); }}
					className="w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 rounded-md bg-zinc-900/90 backdrop-blur-sm hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/50 border border-zinc-700/80 shadow-xs transition-all flex items-center justify-center cursor-pointer"
					title={isMaximized ? "Свернуть квадрант в сетку (двойной клик)" : "Развернуть квадрант на весь экран (двойной клик)"}
					data-testid={isMaximized ? `btn-viewport-collapse-${viewportType}` : `btn-viewport-expand-${viewportType}`}
					data-legacy-testid={`cbct-maximize-${viewportType}-btn`}
					data-expand-testid={`btn-viewport-expand-${viewportType}`}
					data-collapse-testid={`btn-viewport-collapse-${viewportType}`}
					aria-label={isMaximized ? "Свернуть окно" : "Развернуть окно"}
				>
					{isMaximized ? (
						<Minimize2 size={13} className="text-zinc-400 hover:text-cyan-300 transition-colors [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4" />
					) : (
						<Maximize2 size={13} className="text-zinc-400 hover:text-cyan-300 transition-colors [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4" />
					)}
				</button>
			)}

			{onResetView && (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onResetView(); }}
					className="w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 rounded-md bg-zinc-900/90 backdrop-blur-sm hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/50 border border-zinc-700/80 shadow-xs transition-all flex items-center justify-center cursor-pointer"
					title="Сбросить позицию среза: поворот 0.0°, масштаб 1.0x, перекрестие по центру"
					data-testid={`cbct-reset-view-${viewportType}-btn`}
					aria-label="Сбросить позицию среза"
				>
					<RotateCcw size={13} className="text-zinc-400 hover:text-cyan-300 transition-colors [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4" />
				</button>
			)}

			{obliqueAngleDeg !== undefined && (Math.abs(obliqueAngleDeg) > 0.05 || isHandleHovered || isRotating) && (
				<button
					type="button"
					onClick={(e) => { e.stopPropagation(); onResetAngle?.(); }}
					className={`h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 px-2 py-0.5 rounded-md bg-zinc-900/95 hover:bg-zinc-800 backdrop-blur-sm text-xs font-mono font-bold border ${
						isRotating
							? "border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/50 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.4)]"
							: isHandleHovered
								? "border-cyan-400 text-cyan-400 shadow-cyan-950/40"
								: "border-cyan-500/50 hover:border-cyan-400 text-cyan-400 hover:text-cyan-200"
					} shadow-md flex items-center gap-1 cursor-pointer transition-all`}
					title={`Угол поворота: ${obliqueAngleDeg > 0 ? "+" : ""}${obliqueAngleDeg.toFixed(1)}° (Нажмите для сброса в 0.0°)`}
					data-testid={`cbct-reset-angle-badge-${viewportType}`}
				>
					<span>∡ {obliqueAngleDeg > 0 ? "+" : ""}{obliqueAngleDeg.toFixed(1)}°</span>
					<RotateCcw size={10} className="inline text-slate-400 hover:text-zinc-200 shrink-0 ml-0.5" />
					<span className="text-[10px] text-slate-400 hover:text-zinc-200 font-bold">0°</span>
				</button>
			)}

			{toolsSlot}
		</div>
	);
};
