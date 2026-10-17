/**
 * BeforeAfterViewport.tsx
 * Interactive Comparison Viewport with Clip-Path and drag handle.
 */

import React from "react";
import { MoveHorizontal } from "lucide-react";
import { calculateSplitClipPath } from "../photography/photoProtocolMath";

interface BeforeAfterViewportProps {
	containerRef: React.RefObject<HTMLDivElement | null>;
	splitPercent: number;
	isFullscreen: boolean;
	activeBeforeUrl: string;
	activeAfterUrl: string;
	beforeLabel: string;
	afterLabel: string;
	onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
	onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
	onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export const BeforeAfterViewport: React.FC<BeforeAfterViewportProps> = ({
	containerRef, splitPercent, isFullscreen, activeBeforeUrl, activeAfterUrl,
	beforeLabel, afterLabel, onPointerDown, onPointerMove, onPointerUp, onWheel, onKeyDown,
}) => {
	const clipPathStyle = calculateSplitClipPath(splitPercent, "vertical");

	return (
		<div
			ref={containerRef}
			tabIndex={0}
			role="slider"
			aria-valuenow={splitPercent}
			aria-valuemin={0}
			aria-valuemax={100}
			aria-label="Шторка сравнения До и После"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onWheel={onWheel}
			onKeyDown={onKeyDown}
			className={`relative bg-black cursor-ew-resize overflow-hidden flex items-center justify-center focus:outline-hidden focus:ring-1 focus:ring-[var(--accent)] ${
				isFullscreen ? "flex-1 w-full h-full" : "h-[380px] sm:h-[460px]"
			}`}
		>
			{!activeBeforeUrl && !activeAfterUrl ? (
				<div className="text-center text-white/70 p-6 space-y-1">
					<p className="text-sm">Нет снимков для сравнения</p>
					<p className="text-xs text-white/50">Загрузите снимки в приём через буфер обмена (Ctrl+V) или камеру</p>
				</div>
			) : (
				<>
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
						{activeBeforeUrl ? (
							<img src={activeBeforeUrl} alt="Состояние До" className="w-full h-full object-contain pointer-events-none" draggable={false} />
						) : <div className="text-white/50 text-xs">Нет снимка «ДО»</div>}
					</div>

					<div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ clipPath: clipPathStyle }}>
						{activeAfterUrl ? (
							<img src={activeAfterUrl} alt="Состояние После" className="w-full h-full object-contain pointer-events-none" draggable={false} />
						) : <div className="text-white/50 text-xs">Нет снимка «ПОСЛЕ»</div>}
					</div>

					<div className="absolute top-0 bottom-0 pointer-events-none z-10" style={{ left: `${splitPercent}%` }}>
						<div className="w-[2px] h-full -ml-[1px] bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]" />
						<div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-black shadow-xl flex items-center justify-center font-bold text-xs border border-black/20 pointer-events-auto cursor-ew-resize">
							<MoveHorizontal className="w-4 h-4 text-black" />
						</div>
					</div>

					<div className="absolute top-3 left-3 z-10 pointer-events-none">
						<span className="px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider bg-black/75 text-white border border-white/20 backdrop-blur-xs shadow-md">
							{beforeLabel}
						</span>
					</div>

					<div className="absolute top-3 right-3 z-10 pointer-events-none">
						<span className="px-2.5 py-1 rounded-md text-[11px] font-bold font-mono tracking-wider bg-[var(--accent)] text-white border border-white/20 backdrop-blur-xs shadow-md">
							{afterLabel}
						</span>
					</div>
				</>
			)}
		</div>
	);
};
