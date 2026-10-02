/**
 * DENTE CRM — CBCT 4-Quadrant Viewport UI/UX, Caliper Ruler HUD & Anti-Clutter Module
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8k (Compact Clinical Density 28–32px, Zero-Bloat) & Mandate 8b
 *
 * Capabilities:
 * 1. 1-click Caliper Ruler tool on any viewport toolbar / HUD (hotkey 'M' / Measure).
 * 2. Click-drag on slice: thin contrast measurement line with exact distance in mm («11.4 мм») without obscuring bone.
 * 3. Multi-measurement support (ridge height, cortical bone thickness) with quick 1-click clear button.
 * 4. Fast 1-click W/L contrast presets (re-exported from CbctQuickWlPresets.tsx).
 * 5. Strictly 28–32px compact desktop buttons (no 44x44px desktop bloat).
 */

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Check, Compass, Copy, Ruler, Sparkles, Spline, Trash2 } from "lucide-react";
import type { CbctAngleMeasurement, CbctMeasurementRuler, CbctViewportType, Point3D } from "../cbctMprMath";
import {
	type EndoCanalMeasurement,
	formatEndoCanalHudText,
	formatEndoCanalProtocolEntry,
} from "../cbctCaliperNerveMath";
import {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
	getSharedCbctGlContext,
} from "./webgl/CbctVolumeGlContext";
import {
	CBCT_QUICK_COLORMAP_PRESETS,
	type CbctQuickColormapPreset,
	getNextSharpenAmount,
	CBCT_QUICK_WL_PRESETS,
	type CbctQuickWlPreset,
	CbctQuickWlBar,
	type CbctQuickWlBarProps,
	CbctQuickColormapBar,
	type CbctQuickColormapBarProps,
} from "./CbctQuickWlPresets";

// Re-exports for zero-downtime backwards compatibility per Mandate 8b
export {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
	CBCT_QUICK_COLORMAP_PRESETS,
	type CbctQuickColormapPreset,
	getNextSharpenAmount,
	CBCT_QUICK_WL_PRESETS,
	type CbctQuickWlPreset,
	CbctQuickWlBar,
	type CbctQuickWlBarProps,
	CbctQuickColormapBar,
	type CbctQuickColormapBarProps,
};

/**
 * Formats physical measurement distance in millimeters with exact precision.
 * e.g., formatRulerDistanceMm(11.42) -> "11.4 мм"
 */
export function formatRulerDistanceMm(distanceMm: number): string {
	if (!Number.isFinite(distanceMm) || distanceMm < 0) return "0.0 мм";
	return `${distanceMm.toFixed(1)} мм`;
}

/**
 * Calculates Euclidean distance between 3D points in physical millimeters.
 */
export function calculateRulerDistanceMm(startMm: Point3D, endMm: Point3D): number {
	const dx = endMm.x - startMm.x;
	const dy = endMm.y - startMm.y;
	const dz = endMm.z - startMm.z;
	return Number(Math.hypot(dx, dy, dz).toFixed(1));
}

/**
 * Filters active rulers belonging to a specific viewport projection plane.
 */
export function filterRulersByViewport(
	rulers: readonly CbctMeasurementRuler[],
	viewport: CbctViewportType,
): CbctMeasurementRuler[] {
	return rulers.filter((r) => r.plane === viewport);
}

/**
 * Summary metrics of measurements placed on a slice.
 */
export function getRulerSummary(
	rulers: readonly CbctMeasurementRuler[],
	viewport?: CbctViewportType,
): { count: number; totalMm: number; maxMm: number; minMm: number; latestMm: number | null } {
	const filtered = viewport ? filterRulersByViewport(rulers, viewport) : rulers;
	if (filtered.length === 0) {
		return { count: 0, totalMm: 0, maxMm: 0, minMm: 0, latestMm: null };
	}
	let total = 0;
	let max = -Infinity;
	let min = Infinity;
	for (const r of filtered) {
		total += r.distanceMm;
		if (r.distanceMm > max) max = r.distanceMm;
		if (r.distanceMm < min) min = r.distanceMm;
	}
	const latest = filtered[filtered.length - 1]?.distanceMm ?? null;
	return {
		count: filtered.length,
		totalMm: Number(total.toFixed(1)),
		maxMm: Number(max.toFixed(1)),
		minMm: Number(min.toFixed(1)),
		latestMm: latest !== null ? Number(latest.toFixed(1)) : null,
	};
}

/**
 * Filters active angles belonging to a specific viewport projection plane.
 */
export function filterAnglesByViewport(
	angles: readonly CbctAngleMeasurement[],
	viewport: CbctViewportType,
): CbctAngleMeasurement[] {
	return angles.filter((a) => a.plane === viewport);
}

/**
 * Summary metrics of angle measurements placed on a slice.
 */
export function getAngleSummary(
	angles: readonly CbctAngleMeasurement[],
	viewport?: CbctViewportType,
): { count: number; latestDeg: number | null } {
	const filtered = viewport ? filterAnglesByViewport(angles, viewport) : angles;
	if (filtered.length === 0) {
		return { count: 0, latestDeg: null };
	}
	const latest = filtered[filtered.length - 1]?.angleDeg ?? null;
	return {
		count: filtered.length,
		latestDeg: latest !== null ? Number(latest.toFixed(1)) : null,
	};
}

/**
 * Props for Viewport Ruler Toolbar
 */
export interface CbctViewportRulerToolbarProps {
	readonly viewportType: CbctViewportType;
	readonly activeTool?: string | undefined;
	readonly onSelectTool?: ((tool: "ruler" | "crosshair" | "angle") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined;
	readonly onClearRulers?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly angles?: readonly CbctAngleMeasurement[] | undefined;
	readonly onClearAngles?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly className?: string | undefined;
	readonly colorMap?: CbctColorMapMode | number | undefined;
	readonly onSelectColorMap?: ((mode: CbctColorMapMode) => void) | undefined;
	readonly sharpenAmount?: number | undefined;
	readonly onChangeSharpenAmount?: ((amount: number) => void) | undefined;
	readonly showSharpenControl?: boolean | undefined;
	readonly showEndoCanalControl?: boolean | undefined;
	readonly onToggleEndoCanal?: (() => void) | undefined;
	readonly isEndoCanalActive?: boolean | undefined;
	readonly endoCanalCount?: number | undefined;
	readonly onClearEndoCanals?: ((viewport?: CbctViewportType) => void) | undefined;
}

/**
 * 1-Click Viewport Caliper Ruler Toolbar (Strict 28–32px height per Mandate 8k)
 */
export const CbctViewportRulerToolbar: React.FC<CbctViewportRulerToolbarProps> = ({
	viewportType,
	activeTool,
	onSelectTool,
	rulers = [],
	onClearRulers,
	angles = [],
	onClearAngles,
	className = "",
	sharpenAmount,
	onChangeSharpenAmount,
	showSharpenControl = false,
	showEndoCanalControl = false,
	onToggleEndoCanal,
	isEndoCanalActive = false,
	endoCanalCount = 0,
	onClearEndoCanals,
}) => {
	const isRulerActive = activeTool === "ruler";
	const isAngleActive = activeTool === "angle";
	const isEndoActive = activeTool === "endo_canal" || isEndoCanalActive;
	const viewportRulers = useMemo(
		() => filterRulersByViewport(rulers, viewportType),
		[rulers, viewportType],
	);
	const summary = useMemo(() => getRulerSummary(viewportRulers), [viewportRulers]);

	const viewportAngles = useMemo(
		() => filterAnglesByViewport(angles, viewportType),
		[angles, viewportType],
	);
	const angleSummary = useMemo(() => getAngleSummary(viewportAngles), [viewportAngles]);

	const [localSharpen, setLocalSharpen] = useState<number>(() => {
		if (sharpenAmount !== undefined) return sharpenAmount;
		try {
			return getSharedCbctGlContext().getSharpenAmount();
		} catch {
			return 0.0;
		}
	});

	useEffect(() => {
		if (sharpenAmount !== undefined) {
			setLocalSharpen(sharpenAmount);
		}
	}, [sharpenAmount]);

	const activeSharpen = sharpenAmount !== undefined ? sharpenAmount : localSharpen;

	const handleToggleSharpen = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			const next = getNextSharpenAmount(activeSharpen);
			setLocalSharpen(next);
			try {
				getSharedCbctGlContext().setSharpenAmount(next);
			} catch {
				/* safe in non-gl environment */
			}
			onChangeSharpenAmount?.(next);
		},
		[activeSharpen, onChangeSharpenAmount],
	);

	const handleToggleRuler = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (!onSelectTool) return;
			onSelectTool(isRulerActive ? "crosshair" : "ruler");
		},
		[isRulerActive, onSelectTool],
	);

	const handleToggleAngle = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			if (!onSelectTool) return;
			onSelectTool(isAngleActive ? "crosshair" : "angle");
		},
		[isAngleActive, onSelectTool],
	);

	const handleClear = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onClearRulers?.(viewportType);
		},
		[onClearRulers, viewportType],
	);

	const handleClearAngles = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onClearAngles?.(viewportType);
		},
		[onClearAngles, viewportType],
	);

	return (
		<div
			className={`inline-flex items-center gap-1 pointer-events-auto select-none ${className}`}
			data-testid={`cbct-ruler-toolbar-${viewportType}`}
		>
			{/* 1. Ruler Tool Toggle Button (Strictly 28px height, 1-click active) */}
			<button
				type="button"
				onClick={handleToggleRuler}
				className={`h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-xs ${
					isRulerActive
						? "bg-amber-500/25 text-amber-200 border border-amber-400/80 shadow-amber-950/40 ring-1 ring-amber-400/50"
						: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-400/60"
				}`}
				title="Экранная линейка: замер расстояния на срезе клик-драгом [M]"
				aria-pressed={isRulerActive}
				aria-label="Линейка калипер"
				data-testid={`cbct-viewport-ruler-btn-${viewportType}`}
			>
				<Ruler className={`w-3.5 h-3.5 shrink-0 ${isRulerActive ? "text-amber-300" : "text-zinc-400"}`} />
				<span className="text-[11px] font-bold">Линейка</span>
				<kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-amber-300/90 border border-zinc-700 font-mono">
					M
				</kbd>
			</button>

			{/* 1b. Angle Tool Toggle Button (Strictly 28px height, 1-click active) */}
			<button
				type="button"
				onClick={handleToggleAngle}
				className={`h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-xs ${
					isAngleActive
						? "bg-amber-500/25 text-amber-200 border border-amber-400/80 shadow-amber-950/40 ring-1 ring-amber-400/50"
						: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-400/60"
				}`}
				title="Экранный угломер: замер угла в градусах кликом по 3 точкам [A]"
				aria-pressed={isAngleActive}
				aria-label="Угломер"
				data-testid={`cbct-viewport-angle-btn-${viewportType}`}
			>
				<Compass className={`w-3.5 h-3.5 shrink-0 ${isAngleActive ? "text-amber-300" : "text-zinc-400"}`} />
				<span className="text-[11px] font-bold">Угол</span>
				<kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-amber-300/90 border border-zinc-700 font-mono">
					A
				</kbd>
			</button>

			{/* 1b. Endo Root Canal Caliper Button (Strictly 28px height, Mandate 8k, 1-click toggle) */}
			{showEndoCanalControl && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						if (onToggleEndoCanal) {
							onToggleEndoCanal();
						} else if (onSelectTool) {
							(onSelectTool as (t: string) => void)(isEndoActive ? "crosshair" : "endo_canal");
						}
					}}
					className={`h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-xs ${
						isEndoActive
							? "bg-teal-500/25 text-teal-200 border border-teal-400/80 shadow-teal-950/40 ring-1 ring-teal-400/50"
							: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/80 hover:border-teal-400/60"
					}`}
					title="Эндо-калипер: замер длины и кривизны корневого канала (по Шнайдеру) [E]"
					aria-pressed={isEndoActive}
					aria-label="Эндо-калипер канала"
					data-testid={`cbct-viewport-endo-canal-btn-${viewportType}`}
				>
					<Spline className={`w-3.5 h-3.5 shrink-0 ${isEndoActive ? "text-teal-300" : "text-zinc-400"}`} />
					<span className="text-[11px] font-bold">Канал</span>
					<kbd className="hidden sm:inline-block text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-teal-300/90 border border-zinc-700 font-mono">
						E
					</kbd>
				</button>
			)}

			{/* Endo Canal Measurements Count Badge */}
			{endoCanalCount !== undefined && endoCanalCount > 0 && (
				<div
					className="h-7 min-h-[28px] max-h-[28px] px-2 py-0.5 rounded-md bg-zinc-900/90 border border-teal-700/80 backdrop-blur-sm text-xs font-mono flex items-center gap-1.5 shadow-xs"
					data-testid={`cbct-endo-count-${viewportType}`}
					title={`${endoCanalCount} замер(ов) канала на проекции ${viewportType}`}
				>
					<span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
					<span className="text-teal-300 text-[10px] font-bold">
						{endoCanalCount} кан.
					</span>
				</div>
			)}

			{/* Quick Clear Endo Canals Button */}
			{endoCanalCount !== undefined && endoCanalCount > 0 && onClearEndoCanals && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onClearEndoCanals(viewportType);
					}}
					className="h-7 min-h-[28px] max-h-[28px] w-7 min-w-[28px] max-w-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md bg-zinc-900/90 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-200 border border-zinc-700/80 hover:border-rose-500/60 backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer shadow-xs"
					title="Очистить замеры каналов на этом срезе"
					aria-label="Очистить замеры каналов"
					data-testid={`cbct-clear-endo-btn-${viewportType}`}
				>
					<Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-rose-400" />
				</button>
			)}

			{/* Quick Trabecular Sharpening Toggle (Strictly 28px height, Mandate 8k) */}
			{showSharpenControl && (
				<button
					type="button"
					onClick={handleToggleSharpen}
					className={`h-7 min-h-[28px] max-h-[28px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-h-[44px] px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-sm shadow-xs ${
						activeSharpen > 0
							? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/80 shadow-emerald-950/40 ring-1 ring-emerald-400/50"
							: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-700/80 hover:border-emerald-400/60"
					}`}
					title={`Резкость балочек кости (Лапласиан): ${activeSharpen <= 0.05 ? "Выкл" : activeSharpen <= 0.55 ? "50%" : "100%"}`}
					aria-label="Резкость балочек"
					data-testid={`cbct-viewport-sharpen-btn-${viewportType}`}
				>
					<Sparkles className={`w-3.5 h-3.5 shrink-0 ${activeSharpen > 0 ? "text-emerald-300" : "text-zinc-400"}`} />
					<span className="text-[11px] font-bold">
						Резкость {activeSharpen <= 0.05 ? "0%" : activeSharpen <= 0.55 ? "50%" : "100%"}
					</span>
				</button>
			)}

			{/* 2. Live Measurements Badge (When measurements exist) */}
			{summary.count > 0 && (
				<div
					className="h-7 min-h-[28px] max-h-[28px] px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-sm text-xs font-mono flex items-center gap-1.5 shadow-xs"
					data-testid={`cbct-ruler-count-${viewportType}`}
					title={`${summary.count} замер(ов) на проекции ${viewportType}. Последний: ${summary.latestMm ?? 0} мм`}
				>
					<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
					<span className="text-zinc-300 text-[10px] font-bold">
						{summary.count} зам.
					</span>
					{summary.latestMm !== null && (
						<span className="text-amber-300 font-bold text-[11px]">
							{formatRulerDistanceMm(summary.latestMm)}
						</span>
					)}
				</div>
			)}

			{/* 3. Quick Clear Button (1-click to wipe measurements on this viewport) */}
			{summary.count > 0 && onClearRulers && (
				<button
					type="button"
					onClick={handleClear}
					className="h-7 min-h-[28px] max-h-[28px] w-7 min-w-[28px] max-w-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md bg-zinc-900/90 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-200 border border-zinc-700/80 hover:border-rose-500/60 backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer shadow-xs"
					title="Очистить все замеры линейки на этом срезе"
					aria-label="Очистить замеры"
					data-testid={`cbct-clear-rulers-btn-${viewportType}`}
				>
					<Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-rose-400" />
				</button>
			)}

			{/* 2b. Angle Live Measurements Badge */}
			{angleSummary.count > 0 && (
				<div
					className="h-7 min-h-[28px] max-h-[28px] px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-700/80 backdrop-blur-sm text-xs font-mono flex items-center gap-1.5 shadow-xs"
					data-testid={`cbct-angle-count-${viewportType}`}
					title={`${angleSummary.count} замер(ов) угла на проекции ${viewportType}. Последний: ${angleSummary.latestDeg ?? 0}°`}
				>
					<span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
					<span className="text-zinc-300 text-[10px] font-bold">
						{angleSummary.count} угл.
					</span>
					{angleSummary.latestDeg !== null && (
						<span className="text-amber-300 font-bold text-[11px]">
							{angleSummary.latestDeg}°
						</span>
					)}
				</div>
			)}

			{/* 3b. Angle Quick Clear Button */}
			{angleSummary.count > 0 && onClearAngles && (
				<button
					type="button"
					onClick={handleClearAngles}
					className="h-7 min-h-[28px] max-h-[28px] w-7 min-w-[28px] max-w-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md bg-zinc-900/90 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-200 border border-zinc-700/80 hover:border-rose-500/60 backdrop-blur-sm flex items-center justify-center transition-colors cursor-pointer shadow-xs"
					title="Очистить все замеры углов на этом срезе"
					aria-label="Очистить углы"
					data-testid={`cbct-clear-angles-btn-${viewportType}`}
				>
					<Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-rose-400" />
				</button>
			)}
		</div>
	);
};

/**
 * Props for Endo Canal Result HUD Chip
 */
export interface CbctEndoCanalHudProps {
	readonly canal: EndoCanalMeasurement;
	readonly onCopyToProtocol?: ((text: string) => void) | undefined;
	readonly onClear?: (() => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * Спокойный неблокирующий HUD эндодонтического калипера (Директива 3 / Мандат 8e / Мандат 8k):
 * - Плашка с результатом: «Канал: 21.2 мм, изгиб 18°»
 * - Кнопка «В дневник» (1 кликом копирует замер в протокол эндодонтии)
 * - Строго иконки Lucide, ноль эмодзи (Мандат 8d)
 */
export const CbctEndoCanalHud: React.FC<CbctEndoCanalHudProps> = ({
	canal,
	onCopyToProtocol,
	onClear,
	className = "",
}) => {
	const [copied, setCopied] = useState(false);

	const hudText = useMemo(
		() => formatEndoCanalHudText(canal.lengthMm, canal.schneiderAngleDeg),
		[canal.lengthMm, canal.schneiderAngleDeg],
	);

	const protocolText = useMemo(
		() => formatEndoCanalProtocolEntry(canal),
		[canal],
	);

	const handleCopyToProtocol = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			try {
				if (typeof navigator !== "undefined" && navigator.clipboard) {
					navigator.clipboard.writeText(protocolText).catch(() => {});
				}
			} catch {
				/* safe in non-browser/test env */
			}
			onCopyToProtocol?.(protocolText);
			setCopied(true);
			const timer = setTimeout(() => setCopied(false), 2200);
			return () => clearTimeout(timer);
		},
		[protocolText, onCopyToProtocol],
	);

	const gradeBadgeClass =
		canal.curvatureGrade === "severe"
			? "bg-rose-500/20 text-rose-300 border-rose-500/50"
			: canal.curvatureGrade === "moderate"
				? "bg-amber-500/20 text-amber-300 border-amber-500/50"
				: "bg-teal-500/20 text-teal-300 border-teal-500/50";

	return (
		<div
			role="status"
			aria-label="Результат замера канала"
			data-testid="cbct-endo-canal-hud"
			className={`inline-flex items-center gap-2 pointer-events-auto select-none bg-zinc-950/92 border border-teal-500/60 shadow-xl backdrop-blur-md px-2.5 py-1 rounded-md text-xs text-zinc-300 ${className}`}
		>
			{/* 1. Icon & Core Result Text: «Канал: 21.2 мм, изгиб 18°» */}
			<div className="flex items-center gap-1.5 font-mono">
				<Spline className="w-3.5 h-3.5 text-teal-400 shrink-0" />
				<span className="font-bold text-zinc-200 whitespace-nowrap text-[12px]" data-testid="cbct-endo-hud-text">
					{hudText}
				</span>
			</div>

			{/* 2. Curvature Grade Chip */}
			<span
				className={`text-[10px] font-sans px-1.5 py-0.2 rounded border font-medium whitespace-nowrap ${gradeBadgeClass}`}
				data-testid="cbct-endo-grade-badge"
			>
				{canal.curvatureGradeRu}
			</span>

			{/* 3. 1-Click Action «В дневник» */}
			<button
				type="button"
				onClick={handleCopyToProtocol}
				className={`h-6 min-h-[24px] max-h-[24px] px-2 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
					copied
						? "bg-emerald-950/70 text-emerald-200 font-medium border border-emerald-500/50 shadow-xs"
						: "bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 hover:text-teal-200 border border-teal-500/50 shadow-xs"
				}`}
				title="Скопировать замер в протокол эндодонтии (Форма 043/у)"
				aria-label="В дневник"
				data-testid="cbct-endo-copy-protocol-btn"
			>
				{copied ? (
					<>
						<Check className="w-3 h-3 text-emerald-200 shrink-0" />
						<span>Скопировано</span>
					</>
				) : (
					<>
						<Copy className="w-3 h-3 text-teal-300 shrink-0" />
						<span>В дневник</span>
					</>
				)}
			</button>

			{/* 4. Optional 1-Click Clear / Close */}
			{onClear && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						onClear();
					}}
					className="h-6 w-6 min-w-[24px] max-w-[24px] rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
					title="Очистить замер канала"
					aria-label="Очистить замер"
					data-testid="cbct-endo-clear-btn"
				>
					<Trash2 className="w-3 h-3 text-zinc-400 hover:text-rose-400" />
				</button>
			)}
		</div>
	);
};

/**
 * Props for Combined HUD Bar for Viewport
 */
export interface CbctViewportsRulerOverlayProps {
	readonly viewportType: CbctViewportType;
	readonly activeTool?: string | undefined;
	readonly onSelectTool?: ((tool: "ruler" | "crosshair" | "angle") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined;
	readonly onClearRulers?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly angles?: readonly CbctAngleMeasurement[] | undefined;
	readonly onClearAngles?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly onSelectQuickWlPreset?: ((preset: { windowWidth: number; windowLevel: number }) => void) | undefined;
	readonly colorMap?: CbctColorMapMode | number | undefined;
	readonly onSelectColorMap?: ((mode: CbctColorMapMode) => void) | undefined;
	readonly sharpenAmount?: number | undefined;
	readonly onChangeSharpenAmount?: ((amount: number) => void) | undefined;
	readonly showQuickColormapBar?: boolean | undefined;
	readonly showSharpenControl?: boolean | undefined;
	readonly showEndoCanalControl?: boolean | undefined;
	readonly onToggleEndoCanal?: (() => void) | undefined;
	readonly isEndoCanalActive?: boolean | undefined;
	readonly activeEndoCanal?: EndoCanalMeasurement | null | undefined;
	readonly endoCanals?: readonly EndoCanalMeasurement[] | undefined;
	readonly onClearEndoCanals?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly onCopyToProtocol?: ((text: string) => void) | undefined;
}

/**
 * Combined HUD Bar for Viewport: displays 1-click Ruler button, Measurement counters, Clear button, W/L Presets & Colormaps.
 */
export const CbctViewportsRulerOverlay: React.FC<CbctViewportsRulerOverlayProps> = ({
	viewportType,
	activeTool,
	onSelectTool,
	rulers = [],
	onClearRulers,
	angles = [],
	onClearAngles,
	windowWidth,
	windowLevel,
	onSelectQuickWlPreset,
	colorMap,
	onSelectColorMap,
	sharpenAmount,
	onChangeSharpenAmount,
	showQuickColormapBar,
	showSharpenControl,
	showEndoCanalControl,
	onToggleEndoCanal,
	isEndoCanalActive,
	activeEndoCanal,
	endoCanals = [],
	onClearEndoCanals,
	onCopyToProtocol,
}) => {
	const shouldShowColormapBar =
		showQuickColormapBar ?? Boolean(onSelectColorMap || onChangeSharpenAmount);

	const displayCanal =
		activeEndoCanal ?? (endoCanals.length > 0 ? endoCanals[endoCanals.length - 1] : null);

	return (
		<>
			{/* Top-Right Ruler & Endo Canal Tool & Count Bar (Fixed left of minimize/reset buttons) */}
			<div className="absolute top-1.5 right-28 pointer-events-auto flex items-center gap-1 z-30">
				<CbctViewportRulerToolbar
					viewportType={viewportType}
					activeTool={activeTool}
					onSelectTool={onSelectTool}
					rulers={rulers}
					onClearRulers={onClearRulers}
					angles={angles}
					onClearAngles={onClearAngles}
					colorMap={colorMap}
					onSelectColorMap={onSelectColorMap}
					sharpenAmount={sharpenAmount}
					onChangeSharpenAmount={onChangeSharpenAmount}
					showSharpenControl={showSharpenControl}
					showEndoCanalControl={showEndoCanalControl}
					onToggleEndoCanal={onToggleEndoCanal}
					isEndoCanalActive={isEndoCanalActive}
					endoCanalCount={endoCanals.length}
					onClearEndoCanals={onClearEndoCanals}
				/>
			</div>

			{/* Top-Left Calm Non-Blocking Endo Canal Result HUD Chip (Directive 3 / Mandate 8e) */}
			{displayCanal && (
				<div className="absolute top-1.5 left-28 pointer-events-auto z-30">
					<CbctEndoCanalHud
						canal={displayCanal}
						onCopyToProtocol={onCopyToProtocol}
						onClear={() => onClearEndoCanals?.(viewportType)}
					/>
				</div>
			)}

			{/* Bottom-Left Quick W/L & Colormap Presets Bar */}
			<div className="absolute bottom-1.5 left-28 pointer-events-auto flex items-center gap-2 z-20 flex-wrap">
				{onSelectQuickWlPreset && (
					<CbctQuickWlBar
						windowWidth={windowWidth}
						windowLevel={windowLevel}
						onSelectPreset={onSelectQuickWlPreset}
					/>
				)}

				{shouldShowColormapBar && (
					<CbctQuickColormapBar
						colorMap={colorMap}
						onSelectColorMap={onSelectColorMap}
						sharpenAmount={sharpenAmount}
						onChangeSharpenAmount={onChangeSharpenAmount}
					/>
				)}
			</div>
		</>
	);
};

export default CbctViewportRulerToolbar;
