/**
 * DENTE CRM — Viewport Ruler Toolbar
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8k (Compact Clinical Density 28–32px) & Mandate 8b (<= 300 lines).
 */

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Compass, Ruler, Sparkles, Spline, Trash2 } from "lucide-react";
import type {
	CbctAngleMeasurement,
	CbctMeasurementRuler,
	CbctViewportType,
} from "../cbctMprMath";
import {
	type CbctColorMapMode,
	getSharedCbctGlContext,
} from "./webgl/CbctVolumeGlContext";
import { getNextSharpenAmount } from "./CbctQuickWlPresets";
import {
	filterAnglesByViewport,
	filterRulersByViewport,
	formatRulerDistanceMm,
	getAngleSummary,
	getRulerSummary,
} from "./rulerMeasurementMath";

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
			className={`flex flex-col items-end gap-1 pointer-events-auto select-none ${className}`}
			data-testid={`cbct-ruler-toolbar-${viewportType}`}
		>
			<button
				type="button"
				onClick={handleToggleRuler}
				className={`w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-w-[44px] [@media(pointer:coarse)]:max-h-[44px] rounded-md transition-all cursor-pointer backdrop-blur-sm flex items-center justify-center shadow-xs ${
					isRulerActive
						? "bg-cyan-500/20 text-cyan-300 border border-cyan-400 ring-1 ring-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
						: "bg-zinc-900/90 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 border border-zinc-700/80 hover:border-cyan-500/50"
				}`}
				title="Линейка [M]: измерение расстояния на срезе (клик и протяжка)"
				aria-pressed={isRulerActive}
				aria-label="Линейка [M]"
				data-testid={`cbct-viewport-ruler-btn-${viewportType}`}
			>
				<Ruler className={`w-3.5 h-3.5 shrink-0 transition-colors ${isRulerActive ? "text-cyan-300 drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" : "text-zinc-400"}`} />
			</button>

			<button
				type="button"
				onClick={handleToggleAngle}
				className={`w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-w-[44px] [@media(pointer:coarse)]:max-h-[44px] rounded-md transition-all cursor-pointer backdrop-blur-sm flex items-center justify-center shadow-xs ${
					isAngleActive
						? "bg-cyan-500/20 text-cyan-300 border border-cyan-400 ring-1 ring-cyan-400/60 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
						: "bg-zinc-900/90 text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 border border-zinc-700/80 hover:border-cyan-500/50"
				}`}
				title="Угломер [A]: измерение угла по 3 точкам"
				aria-pressed={isAngleActive}
				aria-label="Угломер [A]"
				data-testid={`cbct-viewport-angle-btn-${viewportType}`}
			>
				<Compass className={`w-3.5 h-3.5 shrink-0 transition-colors ${isAngleActive ? "text-cyan-300 drop-shadow-[0_0_4px_rgba(6,182,212,0.6)]" : "text-zinc-400"}`} />
			</button>

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
					className={`w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-w-[44px] [@media(pointer:coarse)]:max-h-[44px] rounded-md transition-all cursor-pointer backdrop-blur-sm flex items-center justify-center shadow-xs ${
						isEndoActive
							? "bg-teal-500/20 text-teal-300 border border-teal-400 ring-1 ring-teal-400/60 shadow-[0_0_10px_rgba(20,184,166,0.4)]"
							: "bg-zinc-900/90 text-zinc-400 hover:text-teal-300 hover:bg-zinc-800 border border-zinc-700/80 hover:border-teal-400/60"
					}`}
					title="Эндо-калипер [E]: замер длины и кривизны корневого канала (по Шнайдеру)"
					aria-pressed={isEndoActive}
					aria-label="Эндо-калипер канала [E]"
					data-testid={`cbct-viewport-endo-canal-btn-${viewportType}`}
				>
					<Spline className={`w-3.5 h-3.5 shrink-0 transition-colors ${isEndoActive ? "text-teal-300 drop-shadow-[0_0_4px_rgba(20,184,166,0.6)]" : "text-zinc-400"}`} />
				</button>
			)}

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

			{showSharpenControl && (
				<button
					type="button"
					onClick={handleToggleSharpen}
					className={`w-7 h-7 min-w-[28px] min-h-[28px] max-w-[28px] max-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:max-w-[44px] [@media(pointer:coarse)]:max-h-[44px] rounded-md transition-all cursor-pointer backdrop-blur-sm flex items-center justify-center shadow-xs ${
						activeSharpen > 0
							? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/80 shadow-[0_0_10px_rgba(16,185,129,0.4)] ring-1 ring-emerald-400/50"
							: "bg-zinc-900/90 text-zinc-400 hover:text-emerald-300 hover:bg-zinc-800 border border-zinc-700/80 hover:border-emerald-400/60"
					}`}
					title={`Резкость балочек кости (Лапласиан): ${activeSharpen <= 0.05 ? "0%" : activeSharpen <= 0.55 ? "50%" : "100%"}`}
					aria-label="Резкость балочек"
					data-testid={`cbct-viewport-sharpen-btn-${viewportType}`}
				>
					<Sparkles className={`w-3.5 h-3.5 shrink-0 ${activeSharpen > 0 ? "text-emerald-300" : "text-zinc-400"}`} />
					<span className="sr-only">
						Резкость {activeSharpen <= 0.05 ? "0%" : activeSharpen <= 0.55 ? "50%" : "100%"}
					</span>
				</button>
			)}

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

export default CbctViewportRulerToolbar;
