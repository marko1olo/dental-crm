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

import React, { useCallback, useMemo } from "react";
import { Check, Eraser, Ruler, Trash2 } from "lucide-react";
import type { CbctMeasurementRuler, CbctViewportType, Point3D } from "../cbctMprMath";

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
}) => {
	const isRulerActive = activeTool === "ruler";
	const viewportRulers = useMemo(
		() => filterRulersByViewport(rulers, viewportType),
		[rulers, viewportType],
	);
	const summary = useMemo(() => getRulerSummary(viewportRulers), [viewportRulers]);

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
 * Combined HUD Bar for Viewport: displays 1-click Ruler button, Measurement counters, and Clear button.
 */
export const CbctViewportsRulerOverlay: React.FC<{
	readonly viewportType: CbctViewportType;
	readonly activeTool?: string | undefined;
	readonly onSelectTool?: ((tool: "ruler" | "crosshair") => void) | undefined;
	readonly rulers?: readonly CbctMeasurementRuler[] | undefined;
	readonly onClearRulers?: ((viewport?: CbctViewportType) => void) | undefined;
	readonly windowWidth?: number | undefined;
	readonly windowLevel?: number | undefined;
	readonly onSelectQuickWlPreset?: ((preset: { windowWidth: number; windowLevel: number }) => void) | undefined;
}> = ({
	viewportType,
	activeTool,
	onSelectTool,
	rulers = [],
	onClearRulers,
	windowWidth,
	windowLevel,
	onSelectQuickWlPreset,
}) => {
	return (
		<>
			{/* Top-Right Ruler Tool & Count Bar (Fixed left of minimize/reset buttons) */}
			<div className="absolute top-1.5 right-28 pointer-events-auto flex items-center gap-1 z-30">
				<CbctViewportRulerToolbar
					viewportType={viewportType}
					activeTool={activeTool}
					onSelectTool={onSelectTool}
					rulers={rulers}
					onClearRulers={onClearRulers}
				/>
			</div>

			{/* Bottom-Left Quick W/L Presets Bar (Fixed right of WW/WL badge) */}
			{onSelectQuickWlPreset && (
				<div className="absolute bottom-1.5 left-28 pointer-events-auto flex items-center gap-1 z-20">
					<CbctQuickWlBar
						windowWidth={windowWidth}
						windowLevel={windowLevel}
						onSelectPreset={onSelectQuickWlPreset}
					/>
				</div>
			)}
		</>
	);
};

export default CbctViewportRulerToolbar;
