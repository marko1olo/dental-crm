/**
 * DENTE CRM — CBCT 3D Canvases & Airway HUD Subcomponent (Layer 4 Presentation)
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x
 */

import { Wind } from "lucide-react";
import type React from "react";
import type { AirwayAnalysisResult } from "../../cbctAirwayAnalysisMath";

export interface CbctVolume3DCanvasesProps {
	readonly containerRef: React.RefObject<HTMLDivElement | null>;
	readonly canvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly canvas2dRef: React.RefObject<HTMLCanvasElement | null>;
	readonly overlayCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	readonly isGpuActive: boolean;
	readonly airwayResult: AirwayAnalysisResult | null;
	readonly onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	readonly onMouseUp: () => void;
	readonly onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void;
	readonly onTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void;
	readonly onTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void;
	readonly onTouchEnd: () => void;
}

export const CbctVolume3DCanvases: React.FC<CbctVolume3DCanvasesProps> = ({
	containerRef,
	canvasRef,
	canvas2dRef,
	overlayCanvasRef,
	isGpuActive,
	airwayResult,
	onMouseDown,
	onMouseMove,
	onMouseUp,
	onWheel,
	onTouchStart,
	onTouchMove,
	onTouchEnd,
}) => {
	return (
		<>
			{/* CLINICAL AIRWAY ANALYSIS HUD BADGE */}
			{airwayResult && (
				<div
					className="absolute top-10 left-2 z-30 bg-zinc-950/90 backdrop-blur-md px-3 py-2 rounded-md border border-cyan-500/50 shadow-2xl flex flex-col gap-1 text-[11px] pointer-events-auto max-w-[280px]"
					data-testid="cbct-airway-analysis-hud"
				>
					<div className="flex items-center justify-between font-bold text-cyan-300">
						<span className="flex items-center gap-1">
							<Wind className="w-3.5 h-3.5 text-cyan-400" />
							<span>Дыхательные пути (Airway)</span>
						</span>
						<span className="font-mono text-xs">
							{airwayResult.totalVolumeCm3.toFixed(1)} см³
						</span>
					</div>
					<div className="flex items-center justify-between text-zinc-300 text-[10px]">
						<span>Мин. просвет (Constriction):</span>
						<span className="font-mono font-bold text-amber-300">
							{airwayResult.minAreaMm2.toFixed(0)} мм²
						</span>
					</div>
					<div className="text-[9.5px] leading-tight text-zinc-400 border-t border-zinc-800/80 pt-1">
						{airwayResult.clinicalSummary}
					</div>
				</div>
			)}

			{/* INTERACTIVE 3D SKULL CANVASES */}
			<div
				ref={containerRef}
				className="flex-1 flex items-center justify-center min-h-0 relative w-full h-full"
				style={{ backgroundColor: "#000000" }}
			>
				{/* 1. Hardware WebGL2 Raymarching Canvas */}
				<canvas
					ref={canvasRef}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={onMouseUp}
					onMouseLeave={onMouseUp}
					onWheel={onWheel}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					onTouchCancel={onTouchEnd}
					onContextMenu={(e) => e.preventDefault()}
					style={{
						backgroundColor: "#000000",
						display: isGpuActive ? "block" : "none",
					}}
					className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0"
					data-testid="cbct-volume-3d-canvas"
				/>
				{/* 2. Isolated Canvas2D Fallback */}
				<canvas
					ref={canvas2dRef}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={onMouseUp}
					onMouseLeave={onMouseUp}
					onWheel={onWheel}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
					onTouchCancel={onTouchEnd}
					onContextMenu={(e) => e.preventDefault()}
					style={{
						backgroundColor: "#000000",
						display: isGpuActive ? "none" : "block",
					}}
					className="absolute inset-0 w-full h-full object-contain cursor-grab active:cursor-grabbing z-0"
					data-testid="cbct-volume-3d-canvas-2d"
				/>
				{/* 3. 3D Vector Overlay Canvas */}
				<canvas
					ref={overlayCanvasRef}
					style={{ backgroundColor: "transparent" }}
					className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
					data-testid="cbct-volume-3d-overlay-canvas"
				/>
			</div>
		</>
	);
};
