/**
 * PanoramicViewportArea.tsx — Область холста панорамного реформата и кросс-срезов
 * Mandate 8b: строго <= 120 строк.
 */

import type React from "react";
import { PanoramicMeasurementOverlay } from "../PanoramicMeasurementOverlay.js";
import { PanoramicImplantRecommender } from "../PanoramicImplantRecommender.js";
import { PanoramicDensityHud } from "../PanoramicDensityHud.js";

interface Props {
	loading: boolean;
	error: string | null;
	canvasRef: React.RefObject<HTMLCanvasElement | null>;
	crossSectionCanvasRef: React.RefObject<HTMLCanvasElement | null>;
	isSharpenActive: boolean;
	isInvertColors: boolean;
	activeTool: "select" | "ruler" | "angle";
	rulers: any[];
	setRulers: (r: any[]) => void;
	angles: any[];
	setAngles: (a: any[]) => void;
	activeCrossSectionIdx: number;
	activeSlice: any;
	probedHU: number | null;
	boneRecommendation: any;
	cursorPos: { x: number; y: number } | null;
	onCanvasMouseEnter: (e: React.MouseEvent<HTMLCanvasElement>) => void;
	onCanvasMouseLeave: () => void;
	onCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export const PanoramicViewportArea: React.FC<Props> = (p) => {
	return (
		<div className="flex-1 relative bg-black flex flex-col sm:flex-row items-center justify-center p-2 min-h-0 overflow-hidden">
			{p.loading && (
				<div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-20">
					<div className="w-10 h-10 border-4 border-[var(--teal)] border-t-transparent rounded-full animate-spin" />
					<span className="text-[var(--teal)] mt-4 text-sm font-bold animate-pulse">
						Построение трилинейной интерполяции и кросс-срезов...
					</span>
				</div>
			)}

			{p.error && (
				<div className="text-red-400 font-bold text-sm px-4 text-center z-20">{p.error}</div>
			)}

			<div className="flex-1 w-full h-full relative flex items-center justify-center min-w-0 min-h-[140px]">
				<canvas
					ref={p.canvasRef}
					width={800}
					height={300}
					onMouseEnter={p.onCanvasMouseEnter}
					onMouseLeave={p.onCanvasMouseLeave}
					onMouseMove={p.onCanvasMouseMove}
					className={`w-full h-full object-contain cursor-crosshair panoramic-canvas-overlay ${p.isSharpenActive ? "mpr-sharpen-active" : ""}`}
					style={{
						filter: `${p.isInvertColors ? "invert(1) hue-rotate(180deg)" : ""} ${p.isSharpenActive ? "contrast(1.25) brightness(1.05)" : ""}`.trim() || undefined,
					}}
				/>
				<PanoramicMeasurementOverlay
					activeTool={p.activeTool}
					mmPerPixel={0.25}
					width={800}
					height={300}
					rulers={p.rulers}
					onUpdateRulers={p.setRulers}
					angles={p.angles}
					onUpdateAngles={p.setAngles}
				/>
			</div>

			<div className="w-[200px] sm:w-[240px] shrink-0 sm:ml-2 mt-2 sm:mt-0 flex flex-col gap-1.5 z-10 max-h-full overflow-y-auto no-scrollbar">
				<div className="h-[170px] sm:h-[190px] relative rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden flex flex-col shadow-lg">
					<div className="bg-neutral-900/90 px-2.5 py-1 border-b border-neutral-800 flex items-center justify-between">
						<span className="text-xs font-bold text-blue-400">Кросс-срез #{p.activeCrossSectionIdx + 1}</span>
						<span className="text-[11px] font-mono font-bold text-neutral-300">{p.activeSlice?.arcLengthMm.toFixed(1)} мм</span>
					</div>
					<div className="flex-1 relative flex items-center justify-center bg-black">
						<canvas ref={p.crossSectionCanvasRef} width={240} height={240} className="w-full h-full object-contain" />
					</div>
				</div>
				<PanoramicImplantRecommender probedHU={p.probedHU} />
			</div>

			<PanoramicDensityHud boneRecommendation={p.boneRecommendation} probedHU={p.probedHU} />

			{p.cursorPos && (
				<div className="mpr-hud-overlay">
					<span>X: {p.cursorPos.x} | Y: {p.cursorPos.y}</span>
					<span className="mpr-hud-value">{p.probedHU ?? 0} HU</span>
				</div>
			)}
		</div>
	);
};
