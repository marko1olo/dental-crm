/**
 * DENTE CRM — Planmeca Romexis 6.x & Vatech Ez3D-i CBCT Viewport HUD & Overlay
 * Standards: DICOM Part 3 / PS 3.3, ITI Consensus
 *
 * Implements:
 * 1. 3D Orientation Compass / Cube in corner with A, P, L, R, S, I labels & colored axes.
 * 2. 4-Edge Anatomical Direction Indicators (Strict Radiological Rule: Patient's Right on Left).
 * 3. Top-Left Clinical Metadata Badge (Plane, Coordinates, Slab Mode, Thickness).
 * 4. True 10 mm Millimeter Physical Scale Calibration Bar.
 */

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
}

const OrientationCube3D: React.FC<{
	viewportType: CbctViewportType;
	size?: number;
}> = ({ viewportType, size = 52 }) => {
	const labels = useMemo(() => getViewportOrientationLabels(viewportType), [viewportType]);
	const activeColor = labels.planeColor;

	return (
		<div
			className="relative flex flex-col items-center justify-center p-1 rounded-lg bg-slate-950/80 border border-slate-800/80 shadow-md backdrop-blur-xs select-none pointer-events-auto"
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
					fill={viewportType === "axial" ? activeColor : "#1e293b"}
					fillOpacity={viewportType === "axial" ? 0.75 : 0.45}
					stroke={viewportType === "axial" ? activeColor : "#475569"}
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
					fill={viewportType === "coronal" ? activeColor : viewportType === "sagittal" ? activeColor : "#0f172a"}
					fillOpacity={viewportType === "coronal" || viewportType === "sagittal" ? 0.75 : 0.45}
					stroke={viewportType === "coronal" || viewportType === "sagittal" ? activeColor : "#334155"}
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
					fill={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#1e293b"}
					fillOpacity={viewportType === "panoramic" || viewportType === "cross_section" ? 0.75 : 0.45}
					stroke={viewportType === "panoramic" || viewportType === "cross_section" ? activeColor : "#334155"}
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
			className={`absolute inset-0 pointer-events-none overflow-hidden z-20 ${className}`}
			data-testid={`cbct-viewport-hud-${viewportType}`}
		>
			{/* 1. TOP-LEFT CLINICAL HEADER BADGE */}
			<div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-auto">
				<div
					className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/85 border shadow-sm backdrop-blur-xs text-xs font-bold"
					style={{ borderColor: `${labels.planeColor}60` }}
				>
					<span
						className="w-2.5 h-2.5 rounded-full shadow-xs"
						style={{ backgroundColor: labels.planeColor }}
					/>
					<span className="text-white tracking-wide">{labels.planeNameEn}</span>
					{coordText && (
						<span className="font-mono text-slate-300 ml-1 text-[11px] font-semibold">
							({coordText})
						</span>
					)}
				</div>

				{slabMode !== "single" && slabThicknessMm > 1 && (
					<span
						className="px-2 py-0.5 rounded-md bg-slate-900/90 text-[10px] font-mono font-bold border shadow-xs"
						style={{ color: labels.planeColor, borderColor: `${labels.planeColor}40` }}
					>
						MIP {slabThicknessMm} мм
					</span>
				)}

				{sliceIndex !== undefined && totalSlices !== undefined && (
					<span className="px-1.5 py-0.5 rounded bg-slate-900/80 text-slate-400 text-[10px] font-mono border border-slate-800">
						{sliceIndex + 1}/{totalSlices}
					</span>
				)}
			</div>

			{/* 2. FOUR ANATOMICAL DIRECTION INDICATORS */}
			<div
				className="absolute top-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700/80 text-white font-mono font-extrabold text-xs shadow-md backdrop-blur-xs"
				title={labels.topTooltipRu}
			>
				{labels.top}
			</div>

			<div
				className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-slate-950/85 border border-slate-700/80 text-white font-mono font-extrabold text-xs shadow-md backdrop-blur-xs"
				title={labels.bottomTooltipRu}
			>
				{labels.bottom}
			</div>

			<div
				className="absolute left-1 top-1/2 -translate-y-1/2 px-1.5 py-1 rounded bg-slate-950/85 border border-slate-700/80 text-white font-mono font-extrabold text-xs shadow-md backdrop-blur-xs"
				title={labels.leftTooltipRu}
			>
				{labels.left}
			</div>

			<div
				className="absolute right-1 top-1/2 -translate-y-1/2 px-1.5 py-1 rounded bg-slate-950/85 border border-slate-700/80 text-white font-mono font-extrabold text-xs shadow-md backdrop-blur-xs"
				title={labels.rightTooltipRu}
			>
				{labels.right}
			</div>

			{/* 3. BOTTOM-LEFT 10 MM CALIBRATION SCALE BAR */}
			<div className="absolute bottom-2 left-2 pointer-events-auto flex flex-col items-center">
				<div className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800/80 shadow-md backdrop-blur-xs flex flex-col items-center">
					<div
						className="h-1.5 border-b-2 border-l-2 border-r-2 border-slate-200"
						style={{ width: `${Math.max(20, Math.min(120, scaleBarWidthPx))}px` }}
					/>
					<span className="text-[9px] font-mono font-bold text-slate-300 mt-0.5">
						10 мм
					</span>
				</div>
			</div>

			{/* 4. BOTTOM-RIGHT 3D ORIENTATION COMPASS CUBE */}
			<div className="absolute bottom-2 right-2 pointer-events-auto">
				<OrientationCube3D viewportType={viewportType} size={48} />
			</div>
		</div>
	);
};

export default CbctViewportHud;
