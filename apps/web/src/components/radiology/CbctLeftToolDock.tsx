/**
 * DENTE CRM — Planmeca Romexis & Ez3D-i Left Tool Dock (Compact Vertical Dock)
 * Standards: DICOM Part 3 / PS 3.3, Misch CE, Buser, Planmeca Romexis 6.x
 *
 * Capabilities:
 * 1. Compact matte dark vertical column along left modal edge with dense 32px desktop buttons.
 * 2. WCAG 2.1 touch-targets on coarse pointers with high-contrast active state.
 * 3. Group 1: Cursor / Mouse Navigation Modes (Crosshair, Pan, Zoom, Window W/L, Oblique Rotate).
 * 4. Group 2: Measurements & Densitometry (Distance Caliper Ruler, Point HU Probe, Mandibular Nerve IAN).
 * 5. Group 3: Slice Thickness & Slab Projection Flyout (Single 1mm, Slab MIP, Avg IP, Min IP, 1..30 mm slider).
 * 6. Group 4: HU Contrast Presets Flyout (Зубы 4400/1300, Эндо 5500/1600, Кортикал 3500/900, Мягкие ткани 600/50, Пазухи 1600/-400).
 * 7. Bottom Actions: 1-Click Reset All (Axes, Zoom, Pan) + DICOM/Folder/ZIP Ingestion Flyout.
 */

import {
	Activity,
	CircleDot,
	Compass,
	Contrast,
	Crosshair,
	Eye,
	EyeOff,
	FolderOpen,
	Hand,
	Check,
	Layers,
	Palette,
	RotateCcw,
	RotateCw,
	Ruler,
	Sliders,
	Sparkles,
	Spline,
	SunMoon,
	X,
	ZoomIn,
} from "lucide-react";
import {
	NerveCanal,
	EndoFileCanal,
	DentalPanoramicArch,
} from "../icons/DentalIcons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlabProjectionMode } from "./cbctMprMath";
import { CbctSlabFlyout } from "./CbctSlabFlyout";
import { CbctHuFlyout } from "./CbctHuFlyout";
import { CbctDicomFlyout } from "./CbctDicomFlyout";
import {
	CBCT_COLORMAP_MODES,
	type CbctColorMapMode,
	getSharedCbctGlContext,
	resolveColorMapCode,
} from "./mpr/webgl/CbctVolumeGlContext";

export { CBCT_COLORMAP_MODES, type CbctColorMapMode };

/** Clinical Colormap Presets (DICOM Grayscale, Misch D1-D4 Bone Density, Endo Microcracks, Inverted Paper) */
export interface CbctColormapPreset {
	readonly id: CbctColorMapMode;
	readonly code: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly descriptionRu: string;
	readonly testId: string;
}

export const CBCT_COLORMAP_PRESETS: readonly CbctColormapPreset[] = [
	{
		id: "grayscale",
		code: 0,
		label: "Серый (DICOM)",
		shortLabel: "Серый",
		descriptionRu: "Стандартный монохромный рентген DICOM PS 3.3",
		testId: "cbct-colormap-grayscale",
	},
	{
		id: "bone_density",
		code: 1,
		label: "Плотность кости (Миш D1-D4)",
		shortLabel: "Миш D1-D4",
		descriptionRu: "Клиническая карта плотности кости Misch D1-D4 (D1-D4)",
		testId: "cbct-colormap-bone-density",
	},
	{
		id: "endo",
		code: 2,
		label: "Эндо (Микротрещины)",
		shortLabel: "Эндо",
		descriptionRu: "Высококонтрастный режим для поиска скрытых каналов (MB2) и микротрещин",
		testId: "cbct-colormap-endo",
	},
	{
		id: "inverted",
		code: 3,
		label: "Белая бумага (Печать)",
		shortLabel: "Печать",
		descriptionRu: "Инвертированный рентген (негатив) для качественной печати на бумаге",
		testId: "cbct-colormap-inverted",
	},
] as const;

/** Cycles sharpness amount in 1-click: Off (0.0) -> 50% (0.5) -> 100% (1.0) -> Off (0.0) */
export function getNextSharpenAmount(current: number): number {
	if (current < 0.25) return 0.5;
	if (current < 0.75) return 1.0;
	return 0.0;
}

export interface CbctColormapFlyoutProps {
	readonly activeColorMap: CbctColorMapMode;
	readonly onSelectColorMap: (mode: CbctColorMapMode) => void;
	readonly onClose: () => void;
}

export const CbctColormapFlyout: React.FC<CbctColormapFlyoutProps> = ({
	activeColorMap,
	onSelectColorMap,
	onClose,
}) => {
	return (
		<div
			role="dialog"
			aria-label="Цветовые карты WebGL2"
			data-testid="cbct-colormap-flyout"
			className="absolute left-full ml-2 top-0 max-sm:top-auto max-sm:bottom-0 z-50 w-72 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100 max-sm:max-h-[calc(100vh-120px)] max-sm:overflow-y-auto"
		>
			<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
				<div className="flex items-center gap-1.5">
					<Palette className="w-4 h-4 text-purple-400" />
					<span className="text-xs font-bold text-zinc-100">
						Цветовые карты WebGL2
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-7 h-7 min-w-[28px] min-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
					aria-label="Закрыть меню"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			<div className="space-y-1">
				{CBCT_COLORMAP_PRESETS.map((p) => {
					const isActive = activeColorMap === p.id;
					return (
						<button
							key={p.id}
							type="button"
							onClick={() => onSelectColorMap(p.id)}
							className={`w-full px-2.5 py-1.5 [@media(pointer:coarse)]:py-2 rounded-lg text-left transition-colors flex items-center justify-between gap-2 border ${
								isActive
									? "bg-zinc-800 text-purple-300 border-purple-500/60 shadow-xs"
									: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-zinc-800"
							}`}
							data-testid={p.testId}
						>
							<div className="flex flex-col min-w-0">
								<div className="flex items-center gap-2">
									<span
										className={`w-2.5 h-2.5 rounded-full shrink-0 ${
											p.id === "bone_density"
												? "bg-gradient-to-r from-orange-500 to-emerald-400"
												: p.id === "endo"
													? "bg-sky-400"
													: p.id === "inverted"
														? "bg-zinc-100"
														: "bg-zinc-500"
										}`}
									/>
									<span className="text-xs font-semibold truncate text-zinc-100">
										{p.label}
									</span>
								</div>
								<span className="text-[10px] text-zinc-400 font-sans truncate pl-4.5">
									{p.descriptionRu}
								</span>
							</div>
							{isActive && (
								<Check className="w-4 h-4 text-purple-400 shrink-0" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};

/** Active Cursor / Mouse Tool Modes */
export type CbctToolMode =
	| "crosshair"
	| "pan"
	| "zoom"
	| "window_level"
	| "rotate"
	| "ruler"
	| "angle"
	| "probe"
	| "nerve"
	| "endo_canal";

export interface CbctLeftToolDockProps {
	/** Active cursor / mouse tool */
	readonly activeTool: CbctToolMode;
	/** Callback when tool is selected */
	readonly onSelectTool: (tool: CbctToolMode) => void;

	/** Current slab projection mode ('single' | 'mip' | 'average' | 'minip') */
	readonly slabMode?: SlabProjectionMode | string | undefined;
	/** Callback when slab projection mode is selected */
	readonly onSelectSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;

	/** Current slab thickness in physical millimeters (1..30 mm) */
	readonly slabThicknessMm?: number | undefined;
	/** Callback when slab thickness changes */
	readonly onChangeSlabThicknessMm?: ((thicknessMm: number) => void) | undefined;

	/** Active HU preset ID (e.g. 'bone_dense', 'enamel_dentin', 'soft_tissue') */
	readonly activePresetId?: string | undefined;
	/** Callback when HU preset is selected */
	readonly onSelectPreset?: ((presetId: string) => void) | undefined;

	/** WebGL2 Colormap Mode ('grayscale' | 'bone_density' | 'endo' | 'inverted' or 0..3) */
	readonly colorMap?: CbctColorMapMode | number | undefined;
	/** Callback when Colormap Mode changes */
	readonly onSelectColorMap?: ((mode: CbctColorMapMode) => void) | undefined;

	/** Hardware Trabecular Sharpening Amount (0.0 .. 1.0) */
	readonly sharpenAmount?: number | undefined;
	/** Callback when Sharpening Amount changes */
	readonly onChangeSharpenAmount?: ((amount: number) => void) | undefined;

	/** 1-Click Reset all axes rotation, zoom, and pan */
	readonly onResetAll?: (() => void) | undefined;
	/** 1-Click Reset view (zoom, pan, rotation) */
	readonly onResetView?: (() => void) | undefined;

	/** Invert Grayscale LUT (Negative/Positive toggle) */
	readonly invertColors?: boolean | undefined;
	/** Callback to toggle LUT inversion */
	readonly onToggleInvertColors?: (() => void) | undefined;

	/** Show / Hide Dental Arch (OPTT Spline) */
	readonly showDentalArch?: boolean | undefined;
	/** Callback to toggle Dental Arch visibility */
	readonly onToggleDentalArch?: (() => void) | undefined;
	/** Callback to trigger automatic dental arch detection */
	readonly onAutoDetectArch?: (() => void) | undefined;

	/** Active Studio Mode ('diagnostic' | 'implant' | 'endo' | 'tmj') */
	readonly studioMode?: string | undefined;
	/** Callback to switch Studio Mode */
	readonly onSelectStudioMode?: ((mode: "implant" | "diagnostic") => void) | undefined;

	/** Trigger loading real DICOM folder */
	readonly onOpenDicomFolder?: (() => void) | undefined;
	/** Trigger loading real DICOM ZIP archive */
	readonly onOpenDicomZip?: (() => void) | undefined;
	/** Clear View mode: temporarily hide all overlays and grids for fine bone crack inspection */
	readonly isClearView?: boolean | undefined;
	/** Callback to toggle Clear View mode */
	readonly onToggleClearView?: (() => void) | undefined;

	/** Optional container class name */
	readonly className?: string | undefined;
}

type FlyoutMenuType = "none" | "slab" | "hu" | "dicom" | "colormap";

interface DockTooltipProps {
	readonly title: string;
	readonly subtitle?: string | undefined;
	readonly shortcut?: string | undefined;
	readonly titleColor?: string | undefined;
	readonly bottomClass?: string | undefined;
}

const DockTooltip: React.FC<DockTooltipProps> = ({
	title,
	subtitle,
	shortcut,
	titleColor = "",
	bottomClass = "top-1/2 -translate-y-1/2",
}) => (
	<div
		role="tooltip"
		className={`pointer-events-none absolute left-full ml-2 ${bottomClass} opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2`}
	>
		<span className={`font-semibold ${titleColor}`}>{title}</span>
		{subtitle && <span className="text-[var(--muted,#a1a1aa)] text-[11px]">{subtitle}</span>}
		{shortcut && (
			<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
				{shortcut}
			</kbd>
		)}
	</div>
);

const getToolBtnClass = (isActive: boolean, activeStyle = "bg-sky-500/20 text-sky-400 border border-sky-500/60 shadow-xs shadow-cyan-950/40") =>
	`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center transition-all duration-150 ${
		isActive ? activeStyle : "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
	}`;

export const CbctLeftToolDock: React.FC<CbctLeftToolDockProps> = ({
	activeTool,
	onSelectTool,
	slabMode = "single",
	onSelectSlabMode,
	slabThicknessMm = 1.0,
	onChangeSlabThicknessMm,
	activePresetId = "bone_dense",
	onSelectPreset,
	colorMap,
	onSelectColorMap,
	sharpenAmount,
	onChangeSharpenAmount,
	onResetAll,
	onResetView,
	invertColors = false,
	onToggleInvertColors,
	showDentalArch = true,
	onToggleDentalArch,
	onAutoDetectArch,
	studioMode,
	onSelectStudioMode,
	onOpenDicomFolder,
	onOpenDicomZip,
	isClearView = false,
	onToggleClearView,
	className = "",
}) => {
	const [openMenu, setOpenMenu] = useState<FlyoutMenuType>("none");
	const dockRef = useRef<HTMLElement | null>(null);

	const folderInputRef = useRef<HTMLInputElement | null>(null);
	const zipInputRef = useRef<HTMLInputElement | null>(null);

	// Synchronized Colormap & Sharpening State with WebGL2 Context
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

	const [localSharpenAmount, setLocalSharpenAmount] = useState<number>(() => {
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
			setLocalSharpenAmount(sharpenAmount);
		}
	}, [sharpenAmount]);

	const activeColorMapMode: CbctColorMapMode = useMemo(() => {
		const cm = colorMap !== undefined ? colorMap : localColorMap;
		if (typeof cm === "number") {
			return cm === 1 ? "bone_density" : cm === 2 ? "endo" : cm === 3 ? "inverted" : "grayscale";
		}
		return cm;
	}, [colorMap, localColorMap]);

	const activeSharpen = sharpenAmount !== undefined ? sharpenAmount : localSharpenAmount;

	const handleColorMapSelect = useCallback(
		(mode: CbctColorMapMode) => {
			setLocalColorMap(mode);
			try {
				getSharedCbctGlContext().setColorMap(mode);
			} catch {
				/* safe in non-gl env */
			}
			onSelectColorMap?.(mode);
			setOpenMenu("none");
		},
		[onSelectColorMap],
	);

	const handleToggleSharpen = useCallback(() => {
		const next = getNextSharpenAmount(activeSharpen);
		setLocalSharpenAmount(next);
		try {
			getSharedCbctGlContext().setSharpenAmount(next);
		} catch {
			/* safe in non-gl env */
		}
		onChangeSharpenAmount?.(next);
	}, [activeSharpen, onChangeSharpenAmount]);

	// Close flyout menus when clicking outside
	useEffect(() => {
		const handlePointerDownOutside = (event: PointerEvent) => {
			if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
				setOpenMenu("none");
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setOpenMenu("none");
			}
		};

		document.addEventListener("pointerdown", handlePointerDownOutside);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDownOutside);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const toggleMenu = useCallback((menu: FlyoutMenuType) => {
		setOpenMenu((prev) => (prev === menu ? "none" : menu));
	}, []);

	const handleSlabModeSelect = useCallback(
		(mode: SlabProjectionMode) => {
			onSelectSlabMode?.(mode);
		},
		[onSelectSlabMode],
	);

	const handlePresetSelect = useCallback(
		(presetId: string) => {
			onSelectPreset?.(presetId);
			setOpenMenu("none");
		},
		[onSelectPreset],
	);

	const handleFolderUploadClick = useCallback(() => {
		setOpenMenu("none");
		if (onOpenDicomFolder) {
			onOpenDicomFolder();
		} else {
			folderInputRef.current?.click();
		}
	}, [onOpenDicomFolder]);

	const handleZipUploadClick = useCallback(() => {
		setOpenMenu("none");
		if (onOpenDicomZip) {
			onOpenDicomZip();
		} else {
			zipInputRef.current?.click();
		}
	}, [onOpenDicomZip]);

	const normalizedSlabMode =
		slabMode === "avg_ip" ? "average" : (slabMode as SlabProjectionMode);

	const isSlabActive =
		normalizedSlabMode !== "single" || (slabThicknessMm && slabThicknessMm > 1.0);

	return (
		<aside
			ref={dockRef}
			role="toolbar"
			aria-label="Панель инструментов Romexis"
			data-testid="cbct-left-tool-dock"
			className={`w-full md:w-10 md:min-w-[40px] md:max-w-[40px] h-11 md:h-full bg-zinc-950 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-row md:flex-col items-center py-1 md:py-1.5 px-2 md:px-1 shrink-0 select-none z-30 relative overflow-x-auto md:overflow-visible overflow-y-hidden md:overflow-y-visible gap-1.5 md:gap-0 ${className}`}
		>
			{/* Hidden file inputs as fallback triggers */}
			<input
				type="file"
				multiple
				ref={folderInputRef}
				data-testid="cbct-left-dock-folder-fallback"
				className="hidden"
				aria-hidden="true"
			/>
			<input
				type="file"
				accept=".zip"
				ref={zipInputRef}
				data-testid="cbct-left-dock-zip-fallback"
				className="hidden"
				aria-hidden="true"
			/>

			{/* ─── GROUP 1: MOUSE / CURSOR MODES ───────────────────────────── */}
			<div className="flex flex-row md:flex-col items-center gap-1.5 shrink-0">
				{/* 1. Crosshair */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("crosshair")}
						className={getToolBtnClass(activeTool === "crosshair")}
						title="Перекрестие (3D навигация) [C]"
						aria-label="Перекрестие"
						data-testid="cbct-tool-crosshair"
					>
						<Crosshair className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Перекрестие" subtitle="3D навигация по срезам" shortcut="C / ЛКМ" titleColor="text-cyan-300" />
				</div>

				{/* 2. Pan */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("pan")}
						className={getToolBtnClass(activeTool === "pan")}
						title="Панорамирование (H / СКМ)"
						aria-label="Панорамирование"
						data-testid="cbct-tool-pan"
					>
						<Hand className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Панорамирование" subtitle="Сдвиг проекции" shortcut="H / СКМ" titleColor="text-cyan-300" />
				</div>

				{/* 3. Zoom */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("zoom")}
						className={getToolBtnClass(activeTool === "zoom")}
						title="Зум (Z / Ctrl+Колесо)"
						aria-label="Зум"
						data-testid="cbct-tool-zoom"
					>
						<ZoomIn className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Зум" subtitle="Масштабирование" shortcut="Z / Ctrl+Колесо" titleColor="text-cyan-300" />
				</div>

				{/* 4. Window Level (W/L) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("window_level")}
						className={getToolBtnClass(activeTool === "window_level")}
						title="Контраст W/L (W / ПКМ)"
						aria-label="Окно W/L"
						data-testid="cbct-tool-window_level"
					>
						<Contrast className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Контраст W/L" subtitle="Яркость / Контраст HU" shortcut="W / ПКМ" titleColor="text-cyan-300" />
				</div>

				{/* 5. Rotate Oblique Axes */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("rotate")}
						className={getToolBtnClass(activeTool === "rotate")}
						title="Вращение осей (Oblique MPR) [R]"
						aria-label="Вращение осей"
						data-testid="cbct-tool-rotate"
						data-testid-oblique="cbct-toggle-oblique-btn"
						id="cbct-toggle-oblique-btn"
					>
						<RotateCw className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Вращение осей" subtitle="Косой наклон срезов" shortcut="R" />
				</div>
			</div>

			{/* ─── DIVIDER ─────────────────────────────────────────────────── */}
			<div className="h-5 md:h-px w-px md:w-5 bg-[var(--line,#27272a)] my-0 md:my-1.5 mx-1 md:mx-0 shrink-0" role="separator" />

			{/* ─── GROUP 2: MEASUREMENTS & DENSITOMETRY ────────────────────── */}
			<div className="flex flex-row md:flex-col items-center gap-1.5 shrink-0">
				{/* 6. Ruler / Caliper */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("ruler")}
						className={getToolBtnClass(activeTool === "ruler")}
						title="Линейка (Калипер расстояния в мм) [M]"
						aria-label="Линейка"
						data-testid="cbct-tool-ruler"
					>
						<Ruler className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Линейка" subtitle="Калипер расстояния (мм)" shortcut="M" />
				</div>

				{/* 6b. Angle / Protractor */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("angle")}
						className={getToolBtnClass(activeTool === "angle")}
						title="Угломер (Замер угла в градусах) [A]"
						aria-label="Угломер"
						data-testid="cbct-tool-angle"
					>
						<Compass className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Угломер" subtitle="Измерение угла (°)" shortcut="A" />
				</div>

				{/* 7. HU Tissue Density Probe */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("probe")}
						className={getToolBtnClass(activeTool === "probe")}
						title="Плотность HU (Денситометрия Misch) [H]"
						aria-label="Плотность HU"
						data-testid="cbct-tool-probe"
					>
						<Activity className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Плотность HU" subtitle="Замер плотности кости" shortcut="H" />
				</div>

				{/* 8. Mandibular Canal / Nerve Tracer */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("nerve")}
						className={getToolBtnClass(activeTool === "nerve")}
						title="Канал IAN (Трассировка нерва) [N]"
						aria-label="Канал IAN"
						data-testid="cbct-tool-nerve"
					>
						<NerveCanal className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip title="Канал IAN" subtitle="Трассировка нерва (2мм)" shortcut="N" />
				</div>

				{/* 8e. Endo Root Canal Caliper (Schneider Curvature & Length) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool(activeTool === "endo_canal" ? "crosshair" : "endo_canal")}
						className={getToolBtnClass(
							activeTool === "endo_canal",
							"bg-teal-500/20 text-teal-300 border border-teal-500/60 shadow-xs shadow-teal-950/40",
						)}
						title="Канал / Эндо-калипер (длина и кривизна по Шнайдеру) [E]"
						aria-label="Эндо-калипер канала"
						data-testid="cbct-tool-endo-canal"
					>
						<EndoFileCanal className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 text-teal-400 shrink-0" />
					</button>
					<DockTooltip
						title="Канал (Эндо-калипер)"
						subtitle="Измерить длину и кривизну канала (по Шнайдеру)"
						shortcut="E"
						titleColor="text-teal-300"
					/>
				</div>

				{/* 8b. Dental Arch Toggle */}
				{onToggleDentalArch && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onToggleDentalArch}
							className={getToolBtnClass(showDentalArch, "bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-xs shadow-purple-950/40")}
							title="Дуга ОПТГ (Отображение зубной дуги)"
							aria-label="Дуга ОПТГ"
							data-testid="cbct-left-dock-toggle-arch"
						>
							<DentalPanoramicArch className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 text-purple-400 shrink-0" />
						</button>
						<DockTooltip title="Дуга ОПТГ" subtitle={showDentalArch ? "Включена" : "Выключена"} />
					</div>
				)}

				{/* 8c. Auto-Generate Dental Arch Button */}
				{onAutoDetectArch && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onAutoDetectArch}
							className="w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center transition-all duration-150 bg-zinc-900 text-purple-300 hover:text-white hover:bg-purple-950/40 border border-[var(--line,#27272a)] hover:border-purple-500/80 shadow-xs"
							title="Сгенерировать дугу автоматически (по плотности эмали/кости)"
							aria-label="Сгенерировать дугу автоматически"
							data-testid="cbct-tool-auto-arch"
						>
							<Sliders className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 text-purple-400 shrink-0" />
						</button>
						<DockTooltip title="Авто-дуга" subtitle="Сгенерировать автоматически" titleColor="text-purple-300" />
					</div>
				)}

				{/* 8d. Implant Planning Mode Tool Button */}
				{onSelectStudioMode && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={() => onSelectStudioMode(studioMode === "implant" ? "diagnostic" : "implant")}
							className={getToolBtnClass(studioMode === "implant", "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs shadow-amber-950/40")}
							title="Имплантация (Планирование имплантата) [I]"
							aria-label="Имплантация"
							data-testid="cbct-left-dock-toggle-implant"
						>
							<CircleDot className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 text-amber-400 shrink-0" />
						</button>
						<DockTooltip title="Имплантация" subtitle={studioMode === "implant" ? "Режим активен" : "Планирование"} titleColor="text-amber-300" />
					</div>
				)}
			</div>

			{/* ─── DIVIDER ─────────────────────────────────────────────────── */}
			<div className="h-5 md:h-px w-px md:w-5 bg-[var(--line,#27272a)] my-0 md:my-1.5 mx-1 md:mx-0 shrink-0" role="separator" />

			{/* ─── GROUP 3 & 4: SLAB THICKNESS / MIP & HU PRESETS ─────────── */}
			<div className="flex flex-row md:flex-col items-center gap-1.5 shrink-0">
				{/* 9. Slab Thickness & MIP Flyout */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("slab")}
						className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							openMenu === "slab" || isSlabActive
								? "bg-sky-500/20 text-sky-400 border border-sky-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
						}`}
						title="Толщина среза & Режимы MIP [L]"
						aria-label="Толщина среза и MIP"
						aria-expanded={openMenu === "slab"}
						data-testid="cbct-tool-slab"
					>
						<Layers className="w-3.5 h-3.5 [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4 shrink-0" />
						<span className="text-[7.5px] [@media(pointer:coarse)]:text-[8px] font-mono font-bold leading-none mt-0.5">
							{normalizedSlabMode === "single"
								? `${slabThicknessMm.toFixed(0)}мм`
								: normalizedSlabMode === "mip"
									? "MIP"
									: normalizedSlabMode === "minip"
										? "MinIP"
										: "Avg"}
						</span>
					</button>

					{openMenu === "none" && (
						<div
							role="tooltip"
							className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold text-cyan-300">Толщина среза</span>
							<span className="text-[var(--muted,#a1a1aa)] text-[11px]">Сляб MIP / MinIP / Avg</span>
							<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
								L
							</kbd>
						</div>
					)}

					{/* Flyout Popover for Slab Thickness & Projection Mode */}
					{openMenu === "slab" && (
						<CbctSlabFlyout
							normalizedSlabMode={normalizedSlabMode}
							slabThicknessMm={slabThicknessMm}
							onSelectSlabMode={handleSlabModeSelect}
							onChangeSlabThicknessMm={onChangeSlabThicknessMm}
							onClose={() => setOpenMenu("none")}
						/>
					)}
				</div>

				{/* 10. HU Window/Level Presets Flyout */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("hu")}
						className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							openMenu === "hu"
								? "bg-sky-500/20 text-sky-400 border border-sky-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
						}`}
						title="Пресеты контраста HU [F]"
						aria-label="HU Пресеты контраста"
						aria-expanded={openMenu === "hu"}
						data-testid="cbct-tool-hu-presets"
					>
						<Sliders className="w-3.5 h-3.5 [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4 shrink-0" />
						<span className="text-[7.5px] [@media(pointer:coarse)]:text-[8px] font-mono font-bold leading-none mt-0.5">
							HU
						</span>
					</button>

					{openMenu === "none" && (
						<div
							role="tooltip"
							className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold text-cyan-300">Пресеты HU</span>
							<span className="text-[var(--muted,#a1a1aa)] text-[11px]">Кость / Эндо / Ткани</span>
							<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
								F
							</kbd>
						</div>
					)}

					{/* Flyout Popover for HU Window/Level Presets */}
					{openMenu === "hu" && (
						<CbctHuFlyout
							activePresetId={activePresetId}
							onSelectPreset={handlePresetSelect}
							onClose={() => setOpenMenu("none")}
						/>
					)}
				</div>

				{/* 11. Colormap Modes Flyout (Misch D1-D4 / Endo / Inverted / Grayscale) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("colormap")}
						className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							openMenu === "colormap" || activeColorMapMode !== "grayscale"
								? "bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-xs shadow-purple-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-purple-500/40"
						}`}
						title="Цветовые карты WebGL2 (Миш D1-D4 / Эндо / DICOM)"
						aria-label="Цветовые карты WebGL2"
						aria-expanded={openMenu === "colormap"}
						data-testid="cbct-tool-colormap"
					>
						<Palette className="w-3.5 h-3.5 [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4 shrink-0 text-purple-400" />
						<span className="text-[7.5px] [@media(pointer:coarse)]:text-[8px] font-mono font-bold leading-none mt-0.5 text-purple-300">
							{activeColorMapMode === "bone_density"
								? "МИШ"
								: activeColorMapMode === "endo"
									? "ЭНД"
									: activeColorMapMode === "inverted"
										? "ИНВ"
										: "LUT"}
						</span>
					</button>

					{openMenu === "none" && (
						<div
							role="tooltip"
							className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold text-purple-300">Цветовая карта</span>
							<span className="text-[var(--muted,#a1a1aa)] text-[11px]">
								{activeColorMapMode === "bone_density"
									? "Плотность кости (Миш D1-D4)"
									: activeColorMapMode === "endo"
										? "Эндо (Микротрещины)"
										: activeColorMapMode === "inverted"
											? "Белая бумага (Печать)"
											: "Серый (DICOM)"}
							</span>
						</div>
					)}

					{/* Flyout Popover for Colormaps */}
					{openMenu === "colormap" && (
						<CbctColormapFlyout
							activeColorMap={activeColorMapMode}
							onSelectColorMap={handleColorMapSelect}
							onClose={() => setOpenMenu("none")}
						/>
					)}
				</div>

				{/* 12. Bone Trabecular Hardware Sharpening Quick 1-Click Toggle */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={handleToggleSharpen}
						className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							activeSharpen > 0
								? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 shadow-xs shadow-emerald-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-emerald-500/40"
						}`}
						title="Резкость балочек кости (Лапласиан) [Клик: 0% / 50% / 100%]"
						aria-label="Резкость балочек кости"
						data-testid="cbct-tool-sharpen"
					>
						<Sparkles className={`w-3.5 h-3.5 [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4 shrink-0 ${activeSharpen > 0 ? "text-emerald-300" : "text-zinc-400"}`} />
						<span className={`text-[7.5px] [@media(pointer:coarse)]:text-[8px] font-mono font-bold leading-none mt-0.5 ${activeSharpen > 0 ? "text-emerald-300" : "text-zinc-400"}`}>
							{activeSharpen <= 0.05 ? "0%" : activeSharpen <= 0.55 ? "50%" : "100%"}
						</span>
					</button>

					<div
						role="tooltip"
						className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold text-emerald-300">Резкость балочек</span>
						<span className="text-[var(--muted,#a1a1aa)] text-[11px]">
							{activeSharpen <= 0.05 ? "Выкл (0%)" : activeSharpen <= 0.55 ? "Умеренная (50%)" : "Максимум (100%)"}
						</span>
					</div>
				</div>
			</div>

			{/* ─── BOTTOM ACTIONS (PINNED TO BOTTOM) ───────────────────────── */}
			<div className="mt-auto flex flex-col items-center gap-1.5 w-full shrink-0">
				<div className="w-5 [@media(pointer:coarse)]:w-7 h-px bg-[var(--line,#27272a)] my-1 shrink-0" role="separator" />

				{/* 10. Clear View (Hide Overlays for Fracture Inspection) */}
				{onToggleClearView && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onToggleClearView}
							className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center transition-all duration-150 ${
								isClearView
									? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs shadow-amber-950/40"
									: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-white hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
							}`}
							title="Режим «Clear View» (Скрыть все оверлеи) [H]"
							aria-label="Режим Clear View"
							data-testid="cbct-tool-clear-view"
						>
							{isClearView ? <EyeOff className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 text-amber-400 shrink-0" /> : <Eye className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />}
						</button>
						<div
							role="tooltip"
							className="pointer-events-none absolute left-full ml-2 bottom-16 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold">Clear View</span>
							<span className="text-[var(--muted,#a1a1aa)] text-[11px]">{isClearView ? "Оверлеи скрыты" : "Осмотр трещин"}</span>
							<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
								H
							</kbd>
						</div>
					</div>
				)}

				{/* 11. Invert LUT (Negative/Positive toggle) */}
				{onToggleInvertColors && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onToggleInvertColors}
							className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center transition-all duration-150 ${
								invertColors
									? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs shadow-amber-950/40"
									: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-white hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
							}`}
							title="Инвертировать цвета (Негатив/Позитив) [I]"
							aria-label="Инвертировать цвета"
							data-testid="cbct-tool-invert-lut"
						>
							<SunMoon className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
						</button>
						<div
							role="tooltip"
							className="pointer-events-none absolute left-full ml-2 bottom-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold">Инверсия LUT</span>
							<span className="text-[var(--muted,#a1a1aa)] text-[11px]">{invertColors ? "Негатив активен" : "Позитив (Romexis)"}</span>
							<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
								I
							</kbd>
						</div>
					</div>
				)}
			</div>

			{/* ─── DIVIDER ─────────────────────────────────────────────────── */}
			<div className="h-5 md:h-px w-px md:w-5 bg-[var(--line,#27272a)] my-0 md:my-1.5 mx-1 md:mx-0 shrink-0" role="separator" />

			{/* ─── GROUP 5: BOTTOM ACTIONS (RESET ALL + REAL DICOM INGESTION) ─ */}
			<div className="mt-0 md:mt-auto flex flex-row md:flex-col items-center gap-1.5 shrink-0">
				{/* 12. Reset All (Axes, Zoom, Pan) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={onResetView ?? onResetAll}
						className="w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-amber-300 hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-amber-500/40 transition-all duration-150"
						title="Сброс вида (оси, зум и панорама) [Home]"
						aria-label="Сброс вида"
						data-testid="cbct-tool-reset-all"
						data-testid-view="cbct-tool-reset-view"
					>
						<RotateCcw className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-full ml-2 bottom-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold text-amber-300">Сброс осей и зума</span>
						<span className="text-[var(--muted,#a1a1aa)] text-[11px]">Возврат в исходное 0°</span>
						<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
							Home
						</kbd>
					</div>
				</div>

				{/* 13. Load Real CBCT / DICOM */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("dicom")}
						className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center transition-all duration-150 ${
							openMenu === "dicom"
								? "bg-sky-500/20 text-sky-400 border border-sky-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-cyan-300 hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
						}`}
						title="Загрузить КТ / DICOM [O]"
						aria-label="Загрузить КТ / DICOM"
						aria-expanded={openMenu === "dicom"}
						data-testid="cbct-tool-dicom"
					>
						<FolderOpen className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>

					{openMenu === "none" && (
						<div
							role="tooltip"
							className="pointer-events-none absolute left-full ml-2 bottom-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-zinc-900 text-[var(--ink,#f4f4f5)] text-xs px-2.5 py-1.5 rounded-md border border-[var(--line,#27272a)] shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold text-cyan-300">Загрузить DICOM</span>
							<span className="text-[var(--muted,#a1a1aa)] text-[11px]">Открыть папку или ZIP</span>
							<kbd className="text-[10px] bg-zinc-800 text-cyan-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
								O
							</kbd>
						</div>
					)}

					{/* DICOM Ingestion Flyout Menu */}
					{openMenu === "dicom" && (
						<CbctDicomFlyout
							onFolderUploadClick={handleFolderUploadClick}
							onZipUploadClick={handleZipUploadClick}
							onClose={() => setOpenMenu("none")}
						/>
					)}
				</div>
			</div>
		</aside>
	);
};

export default CbctLeftToolDock;
