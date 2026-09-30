/**
 * DENTE CRM — CBCT 4-Quadrant Viewport UI/UX, Caliper Ruler HUD & Anti-Clutter Module
 * Standards: DICOM Part 3 / PS 3.3, Planmeca Romexis 6.x, Vatech Ez3D-i
 * Mandate 8k (Compact Clinical Density 28–32px, Zero-Bloat) & Mandate 8b
 *
 * Capabilities:
 * 1. 1-click Caliper Ruler tool on any viewport toolbar / HUD (hotkey 'M' / Measure).
 * 2. Click-drag on slice: thin contrast measurement line with exact distance in mm («11.4 мм») without obscuring bone.
 * 3. Multi-measurement support (ridge height, cortical bone thickness) with quick 1-click clear button.
 * 4. Fast 1-click W/L contrast presets:
 *    - «Кость (W2500/L500)»
 *    - «Эмаль/Дентин (W4000/L1200)»
 *    - «Мягкие ткани (W400/L40)»
 * 5. Strictly 28–32px compact desktop buttons (no 44x44px desktop bloat).
 */

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { Check, Copy, Eraser, Palette, Ruler, Sparkles, Spline, Trash2 } from "lucide-react";
import type { CbctMeasurementRuler, CbctViewportType, Point3D } from "../cbctMprMath";
import {
	type EndoCanalMeasurement,
	formatEndoCanalHudText,
	formatEndoCanalProtocolEntry,
} from "../cbctCaliperNerveMath";
import {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
	getSharedCbctGlContext,
	resolveColorMapCode,
} from "./webgl/CbctVolumeGlContext";

export { CBCT_COLORMAP_MODES, type CbctColorMapMode };

/** Quick WebGL2 Colormap Presets */
export interface CbctQuickColormapPreset {
	readonly id: CbctColorMapMode;
	readonly code: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly descriptionRu: string;
	readonly testId: string;
}

export const CBCT_QUICK_COLORMAP_PRESETS: readonly CbctQuickColormapPreset[] = [
	{
		id: "grayscale",
		code: 0,
		label: "Серый (DICOM)",
		shortLabel: "Серый",
		descriptionRu: "Стандартный монохромный рентген DICOM PS 3.3",
		testId: "cbct-quick-colormap-grayscale",
	},
	{
		id: "bone_density",
		code: 1,
		label: "Плотность кости (Миш D1-D4)",
		shortLabel: "Миш D1-D4",
		descriptionRu: "Клиническая карта плотности кости Misch D1-D4",
		testId: "cbct-quick-colormap-bone-density",
	},
	{
		id: "endo",
		code: 2,
		label: "Эндо (Микротрещины)",
		shortLabel: "Эндо",
		descriptionRu: "Высококонтрастный режим для поиска скрытых каналов (MB2) и микротрещин",
		testId: "cbct-quick-colormap-endo",
	},
	{
		id: "inverted",
		code: 3,
		label: "Белая бумага (Печать)",
		shortLabel: "Печать",
		descriptionRu: "Инвертированный рентген (негатив) для качественной печати",
		testId: "cbct-quick-colormap-inverted",
	},
] as const;

/** Cycles sharpness amount in 1-click: Off (0.0) -> 50% (0.5) -> 100% (1.0) -> Off (0.0) */
export function getNextSharpenAmount(current: number): number {
	if (current < 0.25) return 0.5;
	if (current < 0.75) return 1.0;
	return 0.0;
}

/** Quick W/L Contrast Presets according to Clinical Protocol */
export interface CbctQuickWlPreset {
	readonly id: string;
	readonly label: string;
	readonly shortLabel: string;
	readonly windowWidth: number;
	readonly windowLevel: number;
	readonly descriptionRu: string;
	readonly testId: string;
}

export const CBCT_QUICK_WL_PRESETS: readonly CbctQuickWlPreset[] = [
	{
		id: "bone",
		label: "Кость (W2500/L500)",
		shortLabel: "Кость",
		windowWidth: 2500,
		windowLevel: 500,
		descriptionRu: "Костная ткань челюстей и альвеолярного гребня (W2500 / L500)",
		testId: "cbct-quick-wl-bone",
	},
	{
		id: "enamel_dentin",
		label: "Эмаль/Дентин (W4000/L1200)",
		shortLabel: "Эмаль/Дентин",
		windowWidth: 4000,
		windowLevel: 1200,
		descriptionRu: "Зубные ряды, эмаль, дентин и эндодонтические каналы (W4000 / L1200)",
		testId: "cbct-quick-wl-enamel",
	},
	{
		id: "soft_tissue",
		label: "Мягкие ткани (W400/L40)",
		shortLabel: "Мягкие ткани",
		windowWidth: 400,
		windowLevel: 40,
		descriptionRu: "Слизистая оболочка, десна и мягкотканные структуры (W400 / L40)",
		testId: "cbct-quick-wl-soft",
	},
] as const;

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
 * Props for Viewport Ruler Toolbar
 */
export interface CbctViewportRulerToolbarProps {
	readonly viewportType: CbctViewportType;
	readonly activeTool?: string | undefined;
	readonly onSelectTool?: ((tool: "ruler" | "crosshair") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined;
	readonly onClearRulers?: ((viewport?: CbctViewportType) => void) | undefined;
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
	className = "",
	colorMap,
	onSelectColorMap,
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
	const isEndoActive = activeTool === "endo_canal" || isEndoCanalActive;
	const viewportRulers = useMemo(
		() => filterRulersByViewport(rulers, viewportType),
		[rulers, viewportType],
	);
	const summary = useMemo(() => getRulerSummary(viewportRulers), [viewportRulers]);

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

	const handleClear = useCallback(
		(e: React.MouseEvent) => {
			e.stopPropagation();
			onClearRulers?.(viewportType);
		},
		[onClearRulers, viewportType],
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
						: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-400/60"
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
							: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700/80 hover:border-teal-400/60"
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
							: "bg-zinc-900/90 text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-700/80 hover:border-emerald-400/60"
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
			className={`inline-flex items-center gap-2 pointer-events-auto select-none bg-zinc-950/92 border border-teal-500/60 shadow-xl backdrop-blur-md px-2.5 py-1 rounded-md text-xs text-zinc-100 ${className}`}
		>
			{/* 1. Icon & Core Result Text: «Канал: 21.2 мм, изгиб 18°» */}
			<div className="flex items-center gap-1.5 font-mono">
				<Spline className="w-3.5 h-3.5 text-teal-400 shrink-0" />
				<span className="font-bold text-zinc-100 whitespace-nowrap text-[12px]" data-testid="cbct-endo-hud-text">
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
						? "bg-emerald-600 text-white font-bold border border-emerald-400 shadow-xs"
						: "bg-teal-600/80 hover:bg-teal-600 text-white border border-teal-400/80 hover:border-teal-300 shadow-xs"
				}`}
				title="Скопировать замер в протокол эндодонтии (Форма 043/у)"
				aria-label="В дневник"
				data-testid="cbct-endo-copy-protocol-btn"
			>
				{copied ? (
					<>
						<Check className="w-3 h-3 text-white shrink-0" />
						<span>Скопировано</span>
					</>
				) : (
					<>
						<Copy className="w-3 h-3 text-teal-100 shrink-0" />
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
 * Props for Quick W/L Contrast Presets Bar
 */
export interface CbctQuickWlBarProps {
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly onSelectPreset?: ((preset: { windowWidth: number; windowLevel: number }) => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * 1-Click W/L Contrast Presets Bar (Strict 28px height, 0-clutter)
 * «Кость (W2500/L500)», «Эмаль/Дентин (W4000/L1200)», «Мягкие ткани (W400/L40)»
 */
export const CbctQuickWlBar: React.FC<CbctQuickWlBarProps> = ({
	windowWidth = 4400,
	windowLevel = 1300,
	onSelectPreset,
	className = "",
}) => {
	return (
		<div
			className={`inline-flex items-center gap-1 pointer-events-auto select-none bg-zinc-950/85 backdrop-blur-md p-0.5 rounded-md border border-zinc-800 shadow-md ${className}`}
			role="group"
			aria-label="Быстрые пресеты W/L контрастности"
			data-testid="cbct-quick-wl-bar"
		>
			{CBCT_QUICK_WL_PRESETS.map((preset) => {
				const isCurrent =
					Math.abs(windowWidth - preset.windowWidth) <= 50 &&
					Math.abs(windowLevel - preset.windowLevel) <= 25;

				return (
					<button
						key={preset.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onSelectPreset?.({
								windowWidth: preset.windowWidth,
								windowLevel: preset.windowLevel,
							});
						}}
						className={`h-6 min-h-[24px] max-h-[24px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
							isCurrent
								? "bg-cyan-600/90 text-white font-bold border border-cyan-400 shadow-xs"
								: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent"
						}`}
						title={preset.descriptionRu}
						data-testid={preset.testId}
					>
						{isCurrent && <Check className="w-3 h-3 text-cyan-200 shrink-0" />}
						<span className="truncate">{preset.shortLabel}</span>
					</button>
				);
			})}
		</div>
	);
};

/**
 * Props for Quick Colormap & Sharpening HUD Bar
 */
export interface CbctQuickColormapBarProps {
	readonly colorMap?: CbctColorMapMode | number | undefined;
	readonly onSelectColorMap?: ((mode: CbctColorMapMode) => void) | undefined;
	readonly sharpenAmount?: number | undefined;
	readonly onChangeSharpenAmount?: ((amount: number) => void) | undefined;
	readonly className?: string | undefined;
}

/**
 * 1-Click WebGL2 Colormap & Sharpening HUD Bar (Strict 24–28px height, 0-clutter)
 * «Серый (DICOM)», «Плотность кости (Миш D1-D4)», «Эндо», «Печать», «Резкость балочек»
 */
export const CbctQuickColormapBar: React.FC<CbctQuickColormapBarProps> = ({
	colorMap,
	onSelectColorMap,
	sharpenAmount,
	onChangeSharpenAmount,
	className = "",
}) => {
	const [localColorMap, setLocalColorMap] = useState<CbctColorMapMode>(() => {
		if (colorMap !== undefined) {
			if (typeof colorMap === "number") {
				return colorMap === 1 ? "bone_density" : colorMap === 2 ? "endo" : colorMap === 3 ? "inverted" : "grayscale";
			}
			return colorMap;
		}
		try {
			const gl = getSharedCbctGlContext();
			const code = gl.getColorMap();
			return code === 1 ? "bone_density" : code === 2 ? "endo" : code === 3 ? "inverted" : "grayscale";
		} catch {
			return "grayscale";
		}
	});

	const [localSharpen, setLocalSharpen] = useState<number>(() => {
		if (sharpenAmount !== undefined) return sharpenAmount;
		try {
			return getSharedCbctGlContext().getSharpenAmount();
		} catch {
			return 0.0;
		}
	});

	useEffect(() => {
		if (colorMap !== undefined) {
			const resolved: CbctColorMapMode =
				typeof colorMap === "number"
					? colorMap === 1 ? "bone_density" : colorMap === 2 ? "endo" : colorMap === 3 ? "inverted" : "grayscale"
					: colorMap;
			setLocalColorMap(resolved);
		}
	}, [colorMap]);

	useEffect(() => {
		if (sharpenAmount !== undefined) {
			setLocalSharpen(sharpenAmount);
		}
	}, [sharpenAmount]);

	const activeColorMap: CbctColorMapMode = useMemo(() => {
		const cm = colorMap !== undefined ? colorMap : localColorMap;
		if (typeof cm === "number") {
			return cm === 1 ? "bone_density" : cm === 2 ? "endo" : cm === 3 ? "inverted" : "grayscale";
		}
		return cm;
	}, [colorMap, localColorMap]);

	const currentSharpen = sharpenAmount !== undefined ? sharpenAmount : localSharpen;

	const handleSelectColormap = useCallback(
		(mode: CbctColorMapMode) => {
			setLocalColorMap(mode);
			try {
				getSharedCbctGlContext().setColorMap(mode);
			} catch {
				/* safe */
			}
			onSelectColorMap?.(mode);
		},
		[onSelectColorMap],
	);

	const handleToggleSharpen = useCallback(() => {
		const next = getNextSharpenAmount(currentSharpen);
		setLocalSharpen(next);
		try {
			getSharedCbctGlContext().setSharpenAmount(next);
		} catch {
			/* safe */
		}
		onChangeSharpenAmount?.(next);
	}, [currentSharpen, onChangeSharpenAmount]);

	return (
		<div
			className={`inline-flex items-center gap-1 pointer-events-auto select-none bg-zinc-950/85 backdrop-blur-md p-0.5 rounded-md border border-zinc-800 shadow-md ${className}`}
			role="group"
			aria-label="Цветовые карты и резкость балочек WebGL2"
			data-testid="cbct-quick-colormap-bar"
		>
			<Palette className="w-3.5 h-3.5 text-purple-400 ml-1 mr-0.5 shrink-0 hidden sm:inline-block" />

			{CBCT_QUICK_COLORMAP_PRESETS.map((preset) => {
				const isCurrent = activeColorMap === preset.id;
				return (
					<button
						key={preset.id}
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleSelectColormap(preset.id);
						}}
						className={`h-6 min-h-[24px] max-h-[24px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
							isCurrent
								? "bg-purple-600/90 text-white font-bold border border-purple-400 shadow-xs"
								: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent"
						}`}
						title={preset.descriptionRu}
						data-testid={preset.testId}
					>
						{isCurrent && <Check className="w-3 h-3 text-purple-200 shrink-0" />}
						<span className="truncate">{preset.shortLabel}</span>
					</button>
				);
			})}

			<div className="w-px h-4 bg-zinc-700/80 mx-0.5 shrink-0" role="separator" />

			{/* 1-Click Trabecular Bone Sharpening Toggle */}
			<button
				type="button"
				onClick={(e) => {
					e.stopPropagation();
					handleToggleSharpen();
				}}
				className={`h-6 min-h-[24px] max-h-[24px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-2 py-0.5 rounded text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
					currentSharpen > 0
						? "bg-emerald-600/90 text-white font-bold border border-emerald-400 shadow-xs ring-1 ring-emerald-400/40"
						: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent"
				}`}
				title={`Резкость балочек кости (Лапласиан): ${currentSharpen <= 0.05 ? "Выкл" : currentSharpen <= 0.55 ? "50%" : "100%"}`}
				data-testid="cbct-quick-sharpen-toggle"
			>
				<Sparkles className={`w-3 h-3 shrink-0 ${currentSharpen > 0 ? "text-emerald-200" : "text-zinc-400"}`} />
				<span className="truncate">
					Резкость: {currentSharpen <= 0.05 ? "Выкл" : currentSharpen <= 0.55 ? "50%" : "100%"}
				</span>
			</button>
		</div>
	);
};

/**
 * Props for Combined HUD Bar for Viewport
 */
export interface CbctViewportsRulerOverlayProps {
	readonly viewportType: CbctViewportType;
	readonly activeTool?: string | undefined;
	readonly onSelectTool?: ((tool: "ruler" | "crosshair") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined;
	readonly onClearRulers?: ((viewport?: CbctViewportType) => void) | undefined;
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
