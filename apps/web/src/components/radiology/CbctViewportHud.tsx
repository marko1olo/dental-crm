/**
 * DENTE CRM — Planmeca Romexis 6.x & Vatech Ez3D-i CBCT Viewport HUD & Overlay
 * Standards: DICOM Part 3 / PS 3.3, ITI Consensus, Mandate 8b (<= 120 lines).
 */

import React, { useMemo } from "react";
import { type CbctViewportType, getViewportOrientationLabels } from "./cbctMprMath";
import { OrientationCube3D } from "./hud/OrientationCube3D";
import { ViewportTopRightControls } from "./hud/ViewportTopRightControls";

export interface CbctViewportHudProps {
	readonly viewportType: CbctViewportType;
	readonly coordinateMm?: { readonly x?: number; readonly y?: number; readonly z?: number } | undefined;
	readonly slabMode?: string | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly pixelSpacingMm?: number | undefined;
	readonly toothFdi?: string | undefined;
	readonly sliceIndex?: number | undefined;
	readonly totalSlices?: number | undefined;
	readonly className?: string | undefined;
	readonly isMaximized?: boolean | undefined;
	readonly onToggleMaximize?: (() => void) | undefined;
	readonly obliqueAngleDeg?: number | undefined;
	readonly onResetAngle?: (() => void) | undefined;
	readonly onResetView?: (() => void) | undefined;
	readonly isRotating?: boolean | undefined;
	readonly isHandleHovered?: boolean | undefined;
	readonly zoomFactor?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly toolsSlot?: React.ReactNode | undefined;
	readonly children?: React.ReactNode | undefined;
}

export const CbctViewportHud: React.FC<CbctViewportHudProps> = ({
	viewportType, coordinateMm, slabMode = "single", slabThicknessMm = 1.0, pixelSpacingMm = 0.25,
	sliceIndex, totalSlices, className = "", isMaximized = false, onToggleMaximize,
	obliqueAngleDeg, onResetAngle, onResetView, isRotating = false, isHandleHovered = false,
	zoomFactor, toolsSlot, children,
}) => {
	const labels = useMemo(() => getViewportOrientationLabels(viewportType), [viewportType]);

	const coordText = useMemo(() => {
		switch (viewportType) {
			case "axial": return coordinateMm?.z !== undefined ? `Z = ${coordinateMm.z.toFixed(1)} мм` : null;
			case "coronal": return coordinateMm?.y !== undefined ? `Y = ${coordinateMm.y.toFixed(1)} мм` : null;
			case "sagittal": return coordinateMm?.x !== undefined ? `X = ${coordinateMm.x.toFixed(1)} мм` : null;
			case "panoramic": return slabThicknessMm !== undefined && slabThicknessMm > 1.0 ? `Сляб ${slabThicknessMm.toFixed(1)} мм` : "Срез 1.0 мм";
			case "cross_section": return null;
		}
	}, [viewportType, coordinateMm, slabThicknessMm]);

	return (
		<div className={`absolute inset-0 pointer-events-none overflow-hidden z-20 select-none ${className}`} data-testid={`cbct-viewport-hud-${viewportType}`}>
			{children}

			{/* 1. TOP-LEFT CLINICAL HEADER */}
			<div className="absolute top-2 left-2 z-20 pointer-events-none select-none max-w-[calc(100%-80px)] flex items-center gap-1 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap min-w-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
					<span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: labels.planeColor }} />
					<span className="text-zinc-200 font-semibold text-[11px]">{labels.planeNameRu}</span>
					{coordText && <span className="font-mono text-zinc-400 text-[10px] whitespace-nowrap">({coordText})</span>}
					{sliceIndex !== undefined && totalSlices !== undefined && (
						<span className="font-mono text-zinc-400 text-[10px] whitespace-nowrap pl-0.5">{sliceIndex + 1}/{totalSlices}</span>
					)}
					{zoomFactor !== undefined && Math.abs(zoomFactor - 1.0) > 0.01 && (
						<span className="text-cyan-400 text-[10px] font-mono font-semibold pl-0.5" title={`Масштаб зума: ${(zoomFactor * 100).toFixed(0)}%`}>
							{zoomFactor.toFixed(1)}x
						</span>
					)}
					{viewportType !== "panoramic" && slabMode !== "single" && slabThicknessMm > 1 && (
						<span className="text-[10px] font-mono font-semibold pl-0.5" style={{ color: labels.planeColor }}>MIP {slabThicknessMm} мм</span>
					)}
				</div>
			</div>

			{/* 2. TOP-RIGHT CLINICAL TOOLS BAR */}
			<ViewportTopRightControls
				viewportType={viewportType} isMaximized={isMaximized} onToggleMaximize={onToggleMaximize}
				onResetView={onResetView} obliqueAngleDeg={obliqueAngleDeg} onResetAngle={onResetAngle}
				isRotating={isRotating} isHandleHovered={isHandleHovered} toolsSlot={toolsSlot}
			/>

			{/* 3. FOUR ANATOMICAL DIRECTION INDICATORS */}
			<div className="absolute top-2 left-1/2 -translate-x-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none" title={labels.topTooltipRu}>{labels.top}</div>
			<div className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none" title={labels.bottomTooltipRu}>{labels.bottom}</div>
			<div className={`absolute ${viewportType === "panoramic" ? "left-8" : "left-2"} top-1/2 -translate-y-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none`} title={labels.leftTooltipRu}>{labels.left}</div>
			<div className="absolute right-2 top-1/2 -translate-y-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none" title={labels.rightTooltipRu}>{labels.right}</div>

			{/* 4. BOTTOM-RIGHT 3D ORIENTATION COMPASS & TELEMETRY */}
			<div className="absolute bottom-2 right-2 pointer-events-none z-20 flex items-end gap-1.5 select-none">
				{sliceIndex !== undefined && totalSlices !== undefined && (
					<div className="flex flex-col items-end gap-0 text-[9px] font-mono leading-tight text-zinc-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none" data-testid={`cbct-bottom-telemetry-${viewportType}`}>
						<div className="flex items-center gap-1 opacity-80">
							<span className="text-zinc-500">TH</span>
							<span className="text-zinc-300 font-bold">{slabThicknessMm !== undefined ? slabThicknessMm.toFixed(1) : "0.0"}mm</span>
							<span className="text-zinc-500 ml-0.5">INT</span>
							<span className="text-zinc-300 font-bold">{(pixelSpacingMm ?? 0.5).toFixed(1)}mm</span>
						</div>
						<div className="text-zinc-500 text-[8.5px] opacity-75">{sliceIndex + 1} / {totalSlices}</div>
					</div>
				)}
				<OrientationCube3D viewportType={viewportType} size={isMaximized ? 32 : 22} />
			</div>
		</div>
	);
};

export default CbctViewportHud;
