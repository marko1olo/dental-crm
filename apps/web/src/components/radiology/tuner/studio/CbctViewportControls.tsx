/**
 * DENTE CRM — CBCT Tuner Viewport Controls (Axial 2D & OPG CPR Panorama)
 * High performance Canvas rendering, Z-depth wheel & touch scrubbing, HU live hover inspector.
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x. Mandate 8b (< 800 lines).
 */

import React from "react";
import type { TunerParams } from "../cbctTunerTypes";

export interface CbctViewportControlsProps {
	readonly params: TunerParams;
	readonly onSetParams: React.Dispatch<React.SetStateAction<TunerParams>>;
	readonly viewLayout: "stacked" | "columns";
	readonly currentZMm: string;
	readonly maxDepth: number;
	readonly cursorHU: number | null;
	readonly axialCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly panoCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly onAxialWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly onAxialMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onAxialMouseLeave: () => void;
	readonly onAxialTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
	readonly onAxialTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
	readonly onAxialTouchEnd: () => void;
}

export const CbctViewportControls: React.FC<CbctViewportControlsProps> = ({
	params,
	onSetParams,
	viewLayout,
	currentZMm,
	maxDepth,
	cursorHU,
	axialCanvasRef,
	panoCanvasRef,
	onAxialWheel,
	onAxialMouseMove,
	onAxialMouseLeave,
	onAxialTouchStart,
	onAxialTouchMove,
	onAxialTouchEnd,
}) => {
	return (
		<div
			className={`flex-1 flex ${
				viewLayout === "stacked" ? "flex-col" : "flex-col sm:flex-row"
			} gap-1.5 p-1.5 bg-black overflow-hidden min-h-0`}
		>
			{/* Left Viewport: 2D Axial Slice */}
			<div
				className={`${
					viewLayout === "stacked"
						? "flex-[4] min-h-[170px] sm:min-h-[230px]"
						: "flex-1"
				} flex flex-col bg-zinc-950 rounded-lg border border-zinc-900 overflow-hidden relative group min-h-0 shadow-inner`}
			>
				{/* Axial Metadata Overlay */}
				<div className="absolute top-2 left-2 z-10 flex flex-wrap items-center gap-1.5 bg-black/85 px-2.5 py-1 rounded-md border border-zinc-800 text-[10px] sm:text-[11px] font-mono text-cyan-300 backdrop-blur-md pointer-events-none shadow-md">
					<span className="font-bold text-zinc-100">АКСИАЛ (2D)</span>
					<span>• Z: {params.sliceZIndex} ({currentZMm} мм)</span>
					{params.sliceThicknessMm > 0 && (
						<span className="hidden sm:inline text-amber-400 font-semibold">
							• {params.sliceThicknessMm.toFixed(1)} мм ({params.projectionMode})
						</span>
					)}
					{cursorHU !== null && (
						<span className="text-emerald-400 font-bold">• HU: {cursorHU}</span>
					)}
				</div>

				{/* Canvas Container */}
				<div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black min-h-0">
					<canvas
						ref={axialCanvasRef}
						onWheel={onAxialWheel}
						onMouseMove={onAxialMouseMove}
						onMouseLeave={onAxialMouseLeave}
						onTouchStart={onAxialTouchStart}
						onTouchMove={onAxialTouchMove}
						onTouchEnd={onAxialTouchEnd}
						className="max-w-full max-h-full object-contain cursor-crosshair shadow-2xl touch-none"
						data-testid="cbct-tuner-axial-canvas"
					/>
				</div>

				{/* Axial Z-Scrubbing Slider Bar with 44px Touch Target */}
				<div className="h-10 bg-zinc-950/95 border-t border-zinc-900 px-2 sm:px-3 flex items-center gap-2.5 shrink-0">
					<span className="text-[11px] font-mono text-zinc-400 shrink-0 font-medium">Z-срез:</span>
					<div className="flex-1 flex items-center min-h-[44px] py-1 touch-none">
						<input
							type="range"
							aria-label="Высота среза Z"
							min={0}
							max={maxDepth}
							value={params.sliceZIndex}
							onChange={(e) =>
								onSetParams((p) => ({ ...p, sliceZIndex: Number(e.target.value) }))
							}
							className="w-full cbct-slider cbct-slider--cyan"
							data-testid="cbct-tuner-z-slider"
						/>
					</div>
					<span className="text-[11px] font-mono text-cyan-300 w-14 text-right shrink-0 font-semibold">
						{params.sliceZIndex}/{maxDepth}
					</span>
				</div>
			</div>

			{/* Right Viewport: OPG Panoramic View */}
			<div
				className={`${
					viewLayout === "stacked"
						? "flex-[5] min-h-[190px] sm:min-h-[250px]"
						: "flex-1"
				} flex flex-col bg-zinc-950 rounded-lg border border-zinc-900 overflow-hidden relative min-h-0 shadow-inner`}
			>
				{/* Panorama Metadata Overlay */}
				<div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/85 px-2.5 py-1 rounded-md border border-zinc-800 text-[10px] sm:text-[11px] font-mono text-emerald-300 backdrop-blur-md pointer-events-none shadow-md">
					<span className="font-bold text-zinc-100">ОПТГ ПАНОРАМА</span>
					<span>• Слой: {params.sliceThicknessMm > 0 ? params.sliceThicknessMm.toFixed(1) : "1.0"} мм</span>
					<span className="text-zinc-400 hidden sm:inline">• Горизонт: {currentZMm} мм</span>
				</div>

				{/* Panorama Canvas Container */}
				<div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black p-1 min-h-0">
					<canvas
						ref={panoCanvasRef}
						className="max-w-full max-h-full object-contain shadow-2xl touch-none"
						data-testid="cbct-tuner-pano-canvas"
					/>
				</div>
			</div>
		</div>
	);
};
