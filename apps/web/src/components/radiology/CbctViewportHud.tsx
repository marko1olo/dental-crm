/**
 * DENTE CRM — Planmeca Romexis 6.x & Vatech Ez3D-i CBCT Viewport HUD & Overlay
 * Standards: DICOM Part 3 / PS 3.3, ITI Consensus
 *
 * Industrial Dark Architecture:
 * - Palette: Matte Graphite (#0c0e12, #14171e, #242a35, #e2e8f0, #94a3b8)
 * - 3D Orientation Compass / Cube in corner with A, P, L, R, S, I labels & colored axes.
 * - 4-Edge Anatomical Direction Indicators (Strict Radiological Rule: Patient's Right on Left).
 * - Top-Left Clinical Metadata Badge (Plane, Coordinates, Slab Mode, Thickness).
 * - Top-Right Maximization Toggle Button [ Maximize ] / [ Minimize ] & Double-click maximize trigger.
 * - True 10 mm Millimeter Physical Scale Calibration Bar.
 */

import { Maximize2, Minimize2, RotateCcw } from "lucide-react";
import React, { useMemo } from "react";
import {
	type CbctViewportType,
	ROMEXIS_COLORS,
	getViewportOrientationLabels,
} from "./cbctMprMath";

export interface CbctViewportHudProps {
	readonly viewportType: CbctViewportType;
	readonly coordinateMm?: {
		readonly x?: number | undefined;
		readonly y?: number | undefined;
		readonly z?: number | undefined;
	} | undefined;
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

interface OrientationCube3DProps {
	readonly viewportType: CbctViewportType;
	readonly size?: number | undefined;
}

const OrientationCube3D: React.FC<OrientationCube3DProps> = ({ viewportType, size = 48 }) => {
	const labels = useMemo(() => getViewportOrientationLabels(viewportType), [viewportType]);
	const activeColor = labels.planeColor;

	return (
		<div
			className="relative flex flex-col items-center justify-center select-none pointer-events-auto drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] opacity-60 hover:opacity-100 transition-opacity"
			title={`3D Ориентационный компас: ${labels.planeNameRu}`}
			data-testid={`cbct-orientation-cube-${viewportType}`}
		>
			<svg
				width={size}
				height={size}
				viewBox="-30 -30 60 60"
				className="overflow-visible"
			>
				{/* Top Face (Z+ / Superior) */}
				<polygon
					points="0,-22 20,-11 0,0 -20,-11"
					fill={viewportType === "axial" ? activeColor : "#18181b"}
					fillOpacity={viewportType === "axial" ? 0.85 : 0.5}
					stroke={viewportType === "axial" ? activeColor : "#27272a"}
					strokeWidth="1.2"
				/>
				<text
					x="0"
					y="-10"
					textAnchor="middle"
					dominantBaseline="middle"
					fill={viewportType === "axial" ? "#ffffff" : "#a1a1aa"}
					fontSize="8"
					fontWeight="bold"
					fontFamily="monospace"
				>
					{viewportType === "axial" ? "A" : "S"}
				</text>

				{/* Left / Anterior Face */}
				<polygon
					points="-20,-11 0,0 0,22 -20,11"
					fill={viewportType === "coronal" ? activeColor : viewportType === "sagittal" ? activeColor : "#09090b"}
					fillOpacity={viewportType === "coronal" || viewportType === "sagittal" ? 0.85 : 0.5}
					stroke={viewportType === "coronal" || viewportType === "sagittal" ? activeColor : "#27272a"}
					strokeWidth="1.2"
				/>
				<text
					x="-10"
					y="6"
					textAnchor="middle"
					dominantBaseline="middle"
					fill={viewportType === "coronal" || viewportType === "sagittal" ? "#ffffff" : "#71717a"}
					fontSize="8"
					fontWeight="bold"
					fontFamily="monospace"
				>
					{viewportType === "axial" ? "R" : viewportType === "coronal" ? "R" : "A"}
				</text>

				{/* Right / Lateral Face */}
				<polygon
					points="0,0 20,-11 20,11 0,22"
					fill={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#18181b"}
					fillOpacity={viewportType === "panoramic" || viewportType === "cross_section" ? 0.85 : 0.5}
					stroke={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#27272a"}
					strokeWidth="1.2"
				/>
				<text
					x="10"
					y="6"
					textAnchor="middle"
					dominantBaseline="middle"
					fill={viewportType === "panoramic" || viewportType === "cross_section" ? "#ffffff" : "#71717a"}
					fontSize="8"
					fontWeight="bold"
					fontFamily="monospace"
				>
					{viewportType === "sagittal" ? "P" : "L"}
				</text>

				{/* Coordinate Axes: Z=Cyan, Y=Orange, X=Emerald */}
				<line x1="0" y1="0" x2="0" y2="-26" stroke={ROMEXIS_COLORS.axial} strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="0" cy="-26" r="1.5" fill={ROMEXIS_COLORS.axial} />

				<line x1="0" y1="0" x2="-23" y2="13" stroke={ROMEXIS_COLORS.coronal} strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="-23" cy="13" r="1.5" fill={ROMEXIS_COLORS.coronal} />

				<line x1="0" y1="0" x2="23" y2="13" stroke={ROMEXIS_COLORS.sagittal} strokeWidth="1.5" strokeLinecap="round" />
				<circle cx="23" cy="13" r="1.5" fill={ROMEXIS_COLORS.sagittal} />
			</svg>
		</div>
	);
};

export const CbctViewportHud: React.FC<CbctViewportHudProps> = ({
	viewportType,
	coordinateMm,
	slabMode = "single",
	slabThicknessMm = 1.0,
	pixelSpacingMm = 0.25,
	toothFdi,
	sliceIndex,
	totalSlices,
	className = "",
	isMaximized = false,
	onToggleMaximize,
	obliqueAngleDeg,
	onResetAngle,
	onResetView,
	isRotating = false,
	isHandleHovered = false,
	zoomFactor,
	windowWidth,
	windowLevel,
	toolsSlot,
	children,
}) => {
	const labels = useMemo(() => getViewportOrientationLabels(viewportType), [viewportType]);

	// Note: 10 mm calibration scale is rendered directly on Canvas (Zero-GC) by drawCalibratedMillimeterRulers

	const coordText = useMemo(() => {
		switch (viewportType) {
			case "axial":
				return coordinateMm?.z !== undefined ? `Z = ${coordinateMm.z.toFixed(1)} мм` : null;
			case "coronal":
				return coordinateMm?.y !== undefined ? `Y = ${coordinateMm.y.toFixed(1)} мм` : null;
			case "sagittal":
				return coordinateMm?.x !== undefined ? `X = ${coordinateMm.x.toFixed(1)} мм` : null;
			case "panoramic":
				return slabThicknessMm !== undefined && slabThicknessMm > 1.0
					? `Сляб ${slabThicknessMm.toFixed(1)} мм`
					: "Срез 1.0 мм";
			case "cross_section":
				return null;
		}
	}, [viewportType, coordinateMm, slabThicknessMm]);

	return (
		<div
			className={`absolute inset-0 pointer-events-none overflow-hidden z-20 select-none ${className}`}
			data-testid={`cbct-viewport-hud-${viewportType}`}
		>
			{/* Custom HTML/CSS Overlays (e.g. Calipers, Angles, Probes, Nerve Badges) */}
			{children}

			{/* 1. TOP-LEFT CLINICAL HEADER (Pure text overlay floating on canvas without distracting boxes) */}
			<div
				className="absolute top-2 left-2 z-20 pointer-events-none select-none max-w-[calc(100%-80px)] flex items-center gap-1 flex-wrap"
			>
				<div
					className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap min-w-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
				>
					<span
						className="w-1.5 h-1.5 rounded-full shrink-0"
						style={{ backgroundColor: labels.planeColor }}
					/>
					<span className="text-zinc-200 font-semibold text-[11px]">{labels.planeNameRu}</span>
					{coordText && (
						<span className="font-mono text-zinc-400 text-[10px] whitespace-nowrap">
							({coordText})
						</span>
					)}
					{sliceIndex !== undefined && totalSlices !== undefined && (
						<span className="font-mono text-zinc-400 text-[10px] whitespace-nowrap pl-0.5">
							{sliceIndex + 1}/{totalSlices}
						</span>
					)}
					{zoomFactor !== undefined && Math.abs(zoomFactor - 1.0) > 0.01 && (
						<span
							className="text-cyan-400 text-[10px] font-mono font-semibold pl-0.5"
							title={`Масштаб зума: ${(zoomFactor * 100).toFixed(0)}%`}
						>
							{zoomFactor.toFixed(1)}x
						</span>
					)}
					{viewportType !== "panoramic" && slabMode !== "single" && slabThicknessMm > 1 && (
						<span
							className="text-[10px] font-mono font-semibold pl-0.5"
							style={{ color: labels.planeColor }}
						>
							MIP {slabThicknessMm} мм
						</span>
					)}
				</div>
			</div>

			{/* 2. TOP-RIGHT CORNER: UNIFIED CLINICAL TOOLS BAR (Maximize, Reset, Angle, Tools descending down) */}
			<div className="absolute top-2 right-2 pointer-events-auto flex flex-col items-end gap-1 z-30 select-none">
				{onToggleMaximize && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggleMaximize();
						}}
						className="w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-w-[44px] [@media(pointer:coarse)]:max-h-[44px] rounded-md bg-zinc-900/90 backdrop-blur-sm hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/50 border border-zinc-700/80 shadow-xs transition-all flex items-center justify-center cursor-pointer"
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
						onClick={(e) => {
							e.stopPropagation();
							onResetView();
						}}
						className="w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-w-[44px] [@media(pointer:coarse)]:max-h-[44px] rounded-md bg-zinc-900/90 backdrop-blur-sm hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 hover:border-cyan-500/50 border border-zinc-700/80 shadow-xs transition-all flex items-center justify-center cursor-pointer"
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
						onClick={(e) => {
							e.stopPropagation();
							onResetAngle?.();
						}}
						className={`h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2 py-0.5 rounded-md bg-zinc-900/95 hover:bg-zinc-800 backdrop-blur-sm text-xs font-mono font-bold border ${
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

			{/* 3. FOUR ANATOMICAL DIRECTION INDICATORS (Pure floating letters with drop shadow, zero boxes) */}
			<div
				className="absolute top-2 left-1/2 -translate-x-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none"
				title={labels.topTooltipRu}
			>
				{labels.top}
			</div>

			<div
				className="absolute bottom-2 left-1/2 -translate-x-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none"
				title={labels.bottomTooltipRu}
			>
				{labels.bottom}
			</div>

			<div
				className={`absolute ${viewportType === "panoramic" ? "left-8" : "left-2"} top-1/2 -translate-y-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none`}
				title={labels.leftTooltipRu}
			>
				{labels.left}
			</div>

			<div
				className="absolute right-2 top-1/2 -translate-y-1/2 font-mono font-bold text-[11px] text-zinc-400/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none z-10 select-none"
				title={labels.rightTooltipRu}
			>
				{labels.right}
			</div>

			{/* 5. BOTTOM-RIGHT 3D ORIENTATION COMPASS CUBE & CLINICAL TELEMETRY (Clean subtle text floating on canvas) */}
			<div className="absolute bottom-2 right-2 pointer-events-none z-20 flex items-end gap-1.5 select-none">
				{sliceIndex !== undefined && totalSlices !== undefined && (
					<div
						className="flex flex-col items-end gap-0 text-[9px] font-mono leading-tight text-zinc-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] pointer-events-none"
						data-testid={`cbct-bottom-telemetry-${viewportType}`}
					>
						<div className="flex items-center gap-1 opacity-80">
							<span className="text-zinc-500">TH</span>
							<span className="text-zinc-300 font-bold">{slabThicknessMm !== undefined ? slabThicknessMm.toFixed(1) : "0.0"}mm</span>
							<span className="text-zinc-500 ml-0.5">INT</span>
							<span className="text-zinc-300 font-bold">{(pixelSpacingMm ?? 0.5).toFixed(1)}mm</span>
						</div>
						<div className="text-zinc-500 text-[8.5px] opacity-75">
							{sliceIndex + 1} / {totalSlices}
						</div>
					</div>
				)}
				<OrientationCube3D viewportType={viewportType} size={isMaximized ? 32 : 22} />
			</div>

			{children}
		</div>
	);
};

export default CbctViewportHud;
