/**
 * DENTE CRM — Planmeca Romexis 6.x & Vatech Ez3D-i CBCT Viewport HUD & Overlay
 * Standards: DICOM Part 3 / PS 3.3, ITI Consensus
 *
 * Industrial Dark Architecture:
 * - Palette: Matte Graphite (#0c0e12, #14171e, #242a35, #e2e8f0, #94a3b8)
 * - 3D Orientation Compass / Cube in corner with A, P, L, R, S, I labels & colored axes.
 * - 4-Edge Anatomical Direction Indicators (Strict Radiological Rule: Patient's Right on Left).
 * - Top-Left Clinical Metadata Badge (Plane, Coordinates, Slab Mode, Thickness).
 * - Top-Right Maximization Toggle Button [ ⛶ ] / [ 🗗 ] & Double-click maximize trigger.
 * - True 10 mm Millimeter Physical Scale Calibration Bar.
 */

import { Maximize2, Minimize2 } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
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
	readonly zoomFactor?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
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
			className="relative flex flex-col items-center justify-center p-0.5 rounded bg-[#14171e]/90 backdrop-blur-sm border border-[#242a35] select-none pointer-events-auto shadow-xs"
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
					fill={viewportType === "axial" ? activeColor : "#1e2430"}
					fillOpacity={viewportType === "axial" ? 0.85 : 0.5}
					stroke={viewportType === "axial" ? activeColor : "#242a35"}
					strokeWidth="1.2"
				/>
				<text
					x="0"
					y="-10"
					textAnchor="middle"
					dominantBaseline="middle"
					fill={viewportType === "axial" ? "#ffffff" : "#94a3b8"}
					fontSize="8"
					fontWeight="bold"
					fontFamily="monospace"
				>
					{viewportType === "axial" ? "A" : "S"}
				</text>

				{/* Left / Anterior Face */}
				<polygon
					points="-20,-11 0,0 0,22 -20,11"
					fill={viewportType === "coronal" ? activeColor : viewportType === "sagittal" ? activeColor : "#0f131a"}
					fillOpacity={viewportType === "coronal" || viewportType === "sagittal" ? 0.85 : 0.5}
					stroke={viewportType === "coronal" || viewportType === "sagittal" ? activeColor : "#242a35"}
					strokeWidth="1.2"
				/>
				<text
					x="-10"
					y="6"
					textAnchor="middle"
					dominantBaseline="middle"
					fill={viewportType === "coronal" || viewportType === "sagittal" ? "#ffffff" : "#64748b"}
					fontSize="8"
					fontWeight="bold"
					fontFamily="monospace"
				>
					{viewportType === "axial" ? "R" : viewportType === "coronal" ? "R" : "A"}
				</text>

				{/* Right / Lateral Face */}
				<polygon
					points="0,0 20,-11 20,11 0,22"
					fill={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#1e2430"}
					fillOpacity={viewportType === "panoramic" || viewportType === "cross_section" ? 0.85 : 0.5}
					stroke={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#242a35"}
					strokeWidth="1.2"
				/>
				<text
					x="10"
					y="6"
					textAnchor="middle"
					dominantBaseline="middle"
					fill={viewportType === "panoramic" || viewportType === "cross_section" ? "#ffffff" : "#64748b"}
					fontSize="8"
					fontWeight="bold"
					fontFamily="monospace"
				>
					{viewportType === "sagittal" ? "P" : "L"}
				</text>

				{/* Coordinate Axes: Z=Cyan, Y=Amber, X=Emerald */}
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
	zoomFactor,
	windowWidth,
	windowLevel,
}) => {
	const labels = useMemo(() => getViewportOrientationLabels(viewportType), [viewportType]);

	const scaleBarWidthPx = useMemo(() => {
		if (!pixelSpacingMm || pixelSpacingMm <= 0) return 40;
		return Math.round(10.0 / pixelSpacingMm);
	}, [pixelSpacingMm]);

	const coordText = useMemo(() => {
		if (!coordinateMm) return null;
		switch (viewportType) {
			case "axial":
				return coordinateMm.z !== undefined ? `Z = ${coordinateMm.z.toFixed(1)} мм` : null;
			case "coronal":
				return coordinateMm.y !== undefined ? `Y = ${coordinateMm.y.toFixed(1)} мм` : null;
			case "sagittal":
				return coordinateMm.x !== undefined ? `X = ${coordinateMm.x.toFixed(1)} мм` : null;
			case "panoramic":
				return coordinateMm.z !== undefined ? `Z = ${coordinateMm.z.toFixed(1)} мм` : null;
			case "cross_section":
				return toothFdi ? `FDI #${toothFdi}` : null;
		}
	}, [viewportType, coordinateMm, toothFdi]);

	return (
		<div
			className={`absolute inset-0 pointer-events-none overflow-hidden z-20 select-none ${className}`}
			data-testid={`cbct-viewport-hud-${viewportType}`}
		>
			{/* 1. TOP-LEFT CLINICAL HEADER BADGE */}
			<div
				className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-auto flex-wrap max-w-[calc(100%-56px)]"
				onDoubleClick={(e) => {
					e.stopPropagation();
					onToggleMaximize?.();
				}}
			>
				<div
					className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#14171e]/90 backdrop-blur-sm border border-[#242a35] shadow-xs text-xs font-semibold"
					style={{ borderLeftColor: labels.planeColor, borderLeftWidth: 3 }}
				>
					<span
						className="w-1.5 h-1.5 rounded-full"
						style={{ backgroundColor: labels.planeColor }}
					/>
					<span className="text-[#e2e8f0] tracking-wide font-medium">{labels.planeNameEn}</span>
					{coordText && (
						<span className="font-mono text-[#94a3b8] text-[10px] font-normal ml-0.5">
							({coordText})
						</span>
					)}
				</div>

				{obliqueAngleDeg !== undefined && Math.abs(obliqueAngleDeg) > 0.05 && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onResetAngle?.();
						}}
						className="px-1.5 py-0.5 rounded bg-[#14171e]/90 hover:bg-[#1e2430] backdrop-blur-sm text-[10px] font-mono font-semibold border border-cyan-500/40 hover:border-cyan-500 text-cyan-400 hover:text-cyan-300 shadow-xs flex items-center gap-1 cursor-pointer transition-all"
						title={`Угол наклона: ${obliqueAngleDeg > 0 ? "+" : ""}${obliqueAngleDeg.toFixed(1)}° (Нажмите для сброса в 0.0°)`}
						data-testid={`cbct-reset-angle-badge-${viewportType}`}
					>
						<span>∡ {obliqueAngleDeg > 0 ? "+" : ""}{obliqueAngleDeg.toFixed(1)}°</span>
						<span className="text-[9px] text-[#94a3b8] hover:text-white font-bold ml-0.5">↺ 0°</span>
					</button>
				)}

				{zoomFactor !== undefined && Math.abs(zoomFactor - 1.0) > 0.01 && (
					<span
						className="px-1.5 py-0.5 rounded bg-[#14171e]/90 backdrop-blur-sm text-cyan-400 text-[10px] font-mono font-semibold border border-[#242a35] shadow-xs"
						title={`Масштаб зума: ${(zoomFactor * 100).toFixed(0)}%`}
					>
						{zoomFactor.toFixed(1)}x
					</span>
				)}

				{slabMode !== "single" && slabThicknessMm > 1 && (
					<span
						className="px-1.5 py-0.5 rounded bg-[#14171e]/90 backdrop-blur-sm text-[10px] font-mono font-semibold border border-[#242a35] shadow-xs"
						style={{ color: labels.planeColor }}
					>
						MIP {slabThicknessMm} мм
					</span>
				)}

				{sliceIndex !== undefined && totalSlices !== undefined && (
					<span className="px-1.5 py-0.5 rounded bg-[#14171e]/90 backdrop-blur-sm text-[#94a3b8] text-[10px] font-mono border border-[#242a35] shadow-xs">
						{sliceIndex + 1}/{totalSlices}
					</span>
				)}
			</div>

			{/* 2. TOP-RIGHT VIEWPORT MAXIMIZE / RESTORE BUTTON (24x24px compact) */}
			{onToggleMaximize && (
				<div className="absolute top-1.5 right-1.5 pointer-events-auto flex items-center">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onToggleMaximize();
						}}
						className="w-6 h-6 rounded bg-[#14171e]/90 backdrop-blur-sm hover:bg-[#1e2430] text-[#94a3b8] hover:text-[#e2e8f0] border border-[#242a35] shadow-xs transition-colors flex items-center justify-center"
						title={isMaximized ? "Свернуть в сетку (двойной клик)" : "Развернуть на 100% (двойной клик)"}
						data-testid={`cbct-maximize-${viewportType}-btn`}
						aria-label={isMaximized ? "Свернуть окно" : "Развернуть окно"}
					>
						{isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
					</button>
				</div>
			)}

			{/* 3. FOUR ANATOMICAL DIRECTION INDICATORS (Calm, semi-transparent) */}
			<div
				className="absolute top-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#14171e]/80 backdrop-blur-xs text-[#94a3b8] border border-[#242a35]/60 font-mono font-bold text-[10px]"
				title={labels.topTooltipRu}
			>
				{labels.top}
			</div>

			<div
				className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-[#14171e]/80 backdrop-blur-xs text-[#94a3b8] border border-[#242a35]/60 font-mono font-bold text-[10px]"
				title={labels.bottomTooltipRu}
			>
				{labels.bottom}
			</div>

			<div
				className="absolute left-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#14171e]/80 backdrop-blur-xs text-[#94a3b8] border border-[#242a35]/60 font-mono font-bold text-[10px]"
				title={labels.leftTooltipRu}
			>
				{labels.left}
			</div>

			<div
				className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-[#14171e]/80 backdrop-blur-xs text-[#94a3b8] border border-[#242a35]/60 font-mono font-bold text-[10px]"
				title={labels.rightTooltipRu}
			>
				{labels.right}
			</div>

			{/* 4. BOTTOM-LEFT 10 MM CALIBRATION SCALE BAR & W/L BADGE */}
			<div className="absolute bottom-1.5 left-1.5 pointer-events-auto flex items-center gap-1.5">
				<div className="px-1.5 py-0.5 rounded bg-[#14171e]/90 backdrop-blur-sm border border-[#242a35] shadow-xs flex flex-col items-center">
					<div
						className="h-1 border-b-2 border-l border-r border-[#94a3b8]"
						style={{ width: `${Math.max(16, Math.min(100, scaleBarWidthPx))}px` }}
					/>
					<span className="text-[8px] font-mono font-bold text-[#94a3b8] mt-0.5">
						10 мм
					</span>
				</div>

				{windowWidth !== undefined && windowLevel !== undefined && (
					<div className="px-1.5 py-0.5 rounded bg-[#14171e]/90 backdrop-blur-sm border border-[#242a35] shadow-xs text-[9px] font-mono text-[#94a3b8]">
						W: <span className="text-[#e2e8f0] font-bold">{windowWidth}</span> L: <span className="text-[#e2e8f0] font-bold">{windowLevel}</span>
					</div>
				)}
			</div>

			{/* 5. BOTTOM-RIGHT 3D ORIENTATION COMPASS CUBE */}
			<div className="absolute bottom-1.5 right-1.5 pointer-events-auto">
				<OrientationCube3D viewportType={viewportType} size={36} />
			</div>
		</div>
	);
};

export default CbctViewportHud;
