/**
 * DENTE CRM — Planmeca Romexis & Ez3D-i Left Tool Dock (44px Vertical Toolbar)
 * Standards: DICOM Part 3 / PS 3.3, Misch CE, Buser, Planmeca Romexis 6.x
 *
 * Capabilities:
 * 1. 44px matte dark vertical column (bg-[#0f1219] border-r border-[#242a35]) along left modal edge.
 * 2. WCAG 2.1 touch-targets with high-contrast active state (bg-cyan-500/20 text-cyan-400 border-cyan-500/50).
 * 3. Group 1: Cursor / Mouse Navigation Modes (Crosshair, Pan, Zoom, Window W/L, Oblique Rotate).
 * 4. Group 2: Measurements & Densitometry (Distance Caliper Ruler, Point HU Probe, Mandibular Nerve IAN).
 * 5. Group 3: Slice Thickness & Slab Projection Flyout (Single 1mm, Slab MIP, Avg IP, Min IP, 1..30 mm slider).
 * 6. Group 4: HU Contrast Presets Flyout (Зубы 4400/1300, Эндо 5500/1600, Кортикал 3500/900, Мягкие ткани 600/50, Пазухи 1600/-400).
 * 7. Bottom Actions: 1-Click Reset All (Axes, Zoom, Pan) + DICOM/Folder/ZIP Ingestion Flyout.
 */

import {
	Activity,
	Check,
	CircleDot,
	Compass,
	Contrast,
	Crosshair,
	Eye,
	EyeOff,
	FileArchive,
	FolderOpen,
	Hand,
	Layers,
	RotateCcw,
	RotateCw,
	Ruler,
	Sliders,
	Spline,
	SunMoon,
	X,
	Zap,
	ZoomIn,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type HounsfieldPreset,
	type SlabProjectionMode,
} from "./cbctMprMath";

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
	| "nerve";

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

	/** 1-Click Reset all axes rotation, zoom, and pan */
	readonly onResetAll?: (() => void) | undefined;

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

type FlyoutMenuType = "none" | "slab" | "hu" | "dicom";

export const CbctLeftToolDock: React.FC<CbctLeftToolDockProps> = ({
	activeTool,
	onSelectTool,
	slabMode = "single",
	onSelectSlabMode,
	slabThicknessMm = 1.0,
	onChangeSlabThicknessMm,
	activePresetId = "bone_dense",
	onSelectPreset,
	onResetAll,
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
			className={`w-[44px] min-w-[44px] max-w-[44px] h-full bg-[#09090b] border-r border-zinc-800 flex flex-col items-center py-2 px-0.5 shrink-0 select-none z-30 relative overflow-visible ${className}`}
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
			<div className="flex flex-col items-center gap-1.5 w-full shrink-0">
				{/* 1. Crosshair */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("crosshair")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "crosshair"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Перекрестие (Синхронная 3D навигация) [C]"
						aria-label="Перекрестие"
						data-testid="cbct-tool-crosshair"
					>
						<Crosshair className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Перекрестие</span>
						<span className="text-zinc-400 text-[11px]">Навигация по срезам</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							C
						</kbd>
					</div>
				</div>

				{/* 2. Pan */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("pan")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "pan"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Панорама (Перемещение среза) [P]"
						aria-label="Панорама"
						data-testid="cbct-tool-pan"
					>
						<Hand className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Панорама</span>
						<span className="text-zinc-400 text-[11px]">Сдвиг проекции</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							P
						</kbd>
					</div>
				</div>

				{/* 3. Zoom */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("zoom")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "zoom"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Лупа / Зум (Масштабирование) [Z]"
						aria-label="Лупа / Зум"
						data-testid="cbct-tool-zoom"
					>
						<ZoomIn className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Зум</span>
						<span className="text-zinc-400 text-[11px]">Приближение / Отдаление</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							Z
						</kbd>
					</div>
				</div>

				{/* 4. Window Level (W/L) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("window_level")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "window_level"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Окно W/L (Яркость и Контраст) [W]"
						aria-label="Окно W/L"
						data-testid="cbct-tool-window_level"
					>
						<Contrast className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Окно W/L</span>
						<span className="text-zinc-400 text-[11px]">Яркость / Контраст HU</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							W
						</kbd>
					</div>
				</div>

				{/* 5. Rotate Oblique Axes */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("rotate")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "rotate"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Вращение осей (Oblique MPR) [R]"
						aria-label="Вращение осей"
						data-testid="cbct-tool-rotate"
						data-testid-oblique="cbct-toggle-oblique-btn"
						id="cbct-toggle-oblique-btn"
					>
						<RotateCw className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Вращение осей</span>
						<span className="text-zinc-400 text-[11px]">Косой наклон срезов</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							R
						</kbd>
					</div>
				</div>
			</div>

			{/* ─── DIVIDER ─────────────────────────────────────────────────── */}
			<div className="w-7 h-px bg-zinc-800 my-2 shrink-0" role="separator" />

			{/* ─── GROUP 2: MEASUREMENTS & DENSITOMETRY ────────────────────── */}
			<div className="flex flex-col items-center gap-1.5 w-full shrink-0">
				{/* 6. Ruler / Caliper */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("ruler")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "ruler"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Линейка (Калипер расстояния в мм) [M]"
						aria-label="Линейка"
						data-testid="cbct-tool-ruler"
					>
						<Ruler className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Линейка</span>
						<span className="text-zinc-400 text-[11px]">Калипер расстояния (мм)</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							M
						</kbd>
					</div>
				</div>

				{/* 6b. Angle / Protractor */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("angle")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "angle"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Угломер (Замер угла в градусах) [A]"
						aria-label="Угломер"
						data-testid="cbct-tool-angle"
					>
						<Compass className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Угломер</span>
						<span className="text-zinc-400 text-[11px]">Измерение угла (°)</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							A
						</kbd>
					</div>
				</div>

				{/* 7. HU Tissue Density Probe */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("probe")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "probe"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Плотность HU (Денситометрия Misch) [H]"
						aria-label="Плотность HU"
						data-testid="cbct-tool-probe"
					>
						<Activity className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Плотность HU</span>
						<span className="text-zinc-400 text-[11px]">Замер плотности кости</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							H
						</kbd>
					</div>
				</div>

				{/* 8. Mandibular Canal / Nerve Tracer */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("nerve")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "nerve"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Канал IAN (Трассировка нерва) [N]"
						aria-label="Канал IAN"
						data-testid="cbct-tool-nerve"
					>
						<Zap className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Канал IAN</span>
						<span className="text-zinc-400 text-[11px]">Трассировка нерва (2мм)</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							N
						</kbd>
					</div>
				</div>

				{/* 8b. Dental Arch Toggle (Optional shortcut) */}
				{onToggleDentalArch && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onToggleDentalArch}
							className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
								showDentalArch
									? "bg-purple-500/20 text-purple-300 border border-purple-500/60 shadow-xs shadow-purple-950/40"
									: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-purple-500/40"
							}`}
							title="Дуга ОПТГ (Отображение зубной дуги)"
							aria-label="Дуга ОПТГ"
							data-testid="cbct-left-dock-toggle-arch"
						>
							<Spline className="w-5 h-5 text-purple-400" />
						</button>
						<div
							role="tooltip"
							className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold">Дуга ОПТГ</span>
							<span className="text-zinc-400 text-[11px]">{showDentalArch ? "Включена" : "Выключена"}</span>
						</div>
					</div>
				)}

				{/* 8c. Auto-Generate Dental Arch Button */}
				{onAutoDetectArch && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onAutoDetectArch}
							className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 bg-[#09090b] text-purple-300 hover:text-white hover:bg-purple-950/40 border border-zinc-800 hover:border-purple-500/80 shadow-xs"
							title="Сгенерировать дугу автоматически (по плотности эмали/кости)"
							aria-label="Сгенерировать дугу автоматически"
							data-testid="cbct-tool-auto-arch"
						>
							<Sliders className="w-5 h-5 text-purple-400" />
						</button>
						<div
							role="tooltip"
							className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold text-purple-300">Авто-дуга</span>
							<span className="text-zinc-400 text-[11px]">Сгенерировать автоматически</span>
						</div>
					</div>
				)}

				{/* 8d. Implant Planning Mode Tool Button */}
				{onSelectStudioMode && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={() => onSelectStudioMode(studioMode === "implant" ? "diagnostic" : "implant")}
							className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
								studioMode === "implant"
									? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs shadow-amber-950/40"
									: "bg-[#09090b] text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40"
							}`}
							title="Имплантация (Планирование имплантата) [I]"
							aria-label="Имплантация"
							data-testid="cbct-left-dock-toggle-implant"
						>
							<CircleDot className="w-5 h-5 text-amber-400" />
						</button>
						<div
							role="tooltip"
							className="pointer-events-none absolute left-[48px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold text-amber-300">Имплантация</span>
							<span className="text-zinc-400 text-[11px]">{studioMode === "implant" ? "Режим активен" : "Планирование"}</span>
						</div>
					</div>
				)}
			</div>

			{/* ─── DIVIDER ─────────────────────────────────────────────────── */}
			<div className="w-7 h-px bg-zinc-800 my-2 shrink-0" role="separator" />

			{/* ─── GROUP 3 & 4: SLAB THICKNESS / MIP & HU PRESETS ─────────── */}
			<div className="flex flex-col items-center gap-1.5 w-full shrink-0">
				{/* 9. Slab Thickness & MIP Flyout */}
				<div className="relative flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("slab")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							openMenu === "slab" || isSlabActive
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Толщина среза & Режимы MIP"
						aria-label="Толщина среза и MIP"
						aria-expanded={openMenu === "slab"}
						data-testid="cbct-tool-slab"
					>
						<Layers className="w-4 h-4" />
						<span className="text-[8px] font-mono font-bold leading-none mt-0.5">
							{normalizedSlabMode === "single"
								? `${slabThicknessMm.toFixed(0)}мм`
								: normalizedSlabMode === "mip"
									? "MIP"
									: normalizedSlabMode === "minip"
										? "MinIP"
										: "Avg"}
						</span>
					</button>

					{/* Flyout Popover for Slab Thickness & Projection Mode */}
					{openMenu === "slab" && (
						<div
							role="dialog"
							aria-label="Настройки толщины среза и проекции MIP"
							data-testid="cbct-slab-flyout"
							className="absolute left-[48px] top-0 z-50 w-64 bg-[#09090b] border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100"
						>
							<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2.5">
								<div className="flex items-center gap-1.5">
									<Layers className="w-4 h-4 text-cyan-400" />
									<span className="text-xs font-bold text-zinc-100">
										Толщина среза & MIP
									</span>
								</div>
								<button
									type="button"
									onClick={() => setOpenMenu("none")}
									className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
									aria-label="Закрыть меню"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							{/* Projection Modes */}
							<div className="space-y-1.5 mb-3">
								<span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-semibold">
									Режим проекции
								</span>
								<div className="grid grid-cols-2 gap-1">
									<button
										type="button"
										onClick={() => handleSlabModeSelect("single")}
										className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
											normalizedSlabMode === "single"
												? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
										}`}
										data-testid="cbct-slab-mode-single"
									>
										Срез 1 мм
									</button>
									<button
										type="button"
										onClick={() => handleSlabModeSelect("mip")}
										className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
											normalizedSlabMode === "mip"
												? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
										}`}
										data-testid="cbct-slab-mode-mip"
									>
										Slab MIP
									</button>
									<button
										type="button"
										onClick={() => handleSlabModeSelect("average")}
										className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
											normalizedSlabMode === "average"
												? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
										}`}
										data-testid="cbct-slab-mode-average"
									>
										Avg IP
									</button>
									<button
										type="button"
										onClick={() => handleSlabModeSelect("minip")}
										className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
											normalizedSlabMode === "minip"
												? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
										}`}
										data-testid="cbct-slab-mode-minip"
									>
										Min IP
									</button>
								</div>
							</div>

							{/* Slab Thickness Presets & Continuous Range Slider */}
							<div className="space-y-2">
								<div className="flex items-center justify-between text-xs">
									<span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-semibold">
										Толщина сляба
									</span>
									<span className="font-mono text-cyan-300 font-bold text-xs bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
										{slabThicknessMm.toFixed(1)} мм
									</span>
								</div>

								{/* Quick millimeter presets */}
								<div className="flex items-center gap-1 overflow-x-auto pb-1">
									{[1, 2, 3, 5, 10, 15, 30].map((t) => (
										<button
											key={t}
											type="button"
											onClick={() => onChangeSlabThicknessMm?.(t)}
											data-testid={t === 15 ? "cbct-tool-slab-15mm" : `cbct-slab-thickness-${t}`}
											className={`px-2 py-1 rounded text-[11px] font-mono transition-colors shrink-0 ${
												Math.abs(slabThicknessMm - t) < 0.2
													? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 font-bold"
													: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
											}`}
										>
											<span data-testid={`cbct-slab-thickness-${t}`}>{t}мм</span>
										</button>
									))}
								</div>

								<input
									type="range"
									min={1.0}
									max={30.0}
									step={0.5}
									value={slabThicknessMm}
									onChange={(e) =>
										onChangeSlabThicknessMm?.(Number.parseFloat(e.target.value))
									}
									className="w-full accent-cyan-400 min-h-[32px] cursor-pointer bg-transparent"
									data-testid="cbct-slab-thickness-slider"
								/>
							</div>
						</div>
					)}
				</div>

				{/* 10. HU Window/Level Presets Flyout */}
				<div className="relative flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("hu")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							openMenu === "hu"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Пресеты контраста HU (Зубы, Эндо, Кортикал, Мягкие ткани, Пазухи)"
						aria-label="HU Пресеты контраста"
						aria-expanded={openMenu === "hu"}
						data-testid="cbct-tool-hu-presets"
					>
						<Sliders className="w-4 h-4" />
						<span className="text-[8px] font-mono font-bold leading-none mt-0.5">
							HU
						</span>
					</button>

					{/* Flyout Popover for HU Window/Level Presets */}
					{openMenu === "hu" && (
						<div
							role="dialog"
							aria-label="Клинические пресеты плотности HU"
							data-testid="cbct-hu-flyout"
							className="absolute left-[48px] top-0 z-50 w-72 bg-[#09090b] border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100"
						>
							<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
								<div className="flex items-center gap-1.5">
									<Sliders className="w-4 h-4 text-cyan-400" />
									<span className="text-xs font-bold text-zinc-100">
										Пресеты контраста (HU)
									</span>
								</div>
								<button
									type="button"
									onClick={() => setOpenMenu("none")}
									className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
									aria-label="Закрыть меню"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							<div className="space-y-1">
								{CBCT_HOUNSFIELD_PRESETS.map((p: HounsfieldPreset) => {
									const isActive = activePresetId === p.id;
									return (
										<button
											key={p.id}
											type="button"
											onClick={() => handlePresetSelect(p.id)}
											className={`w-full px-2.5 py-2 rounded-lg text-left transition-colors flex items-center justify-between gap-2 border ${
												isActive
													? "bg-zinc-900 text-cyan-300 border-cyan-500/60 shadow-xs"
													: "bg-[#09090b] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-zinc-800"
											}`}
											data-testid={`cbct-hu-preset-option-${p.id}`}
										>
											<div className="flex flex-col min-w-0">
												<span className="text-xs font-semibold truncate text-zinc-100">
													{p.label}
												</span>
												<span className="text-[10px] text-zinc-400 font-mono">
													W: {p.windowWidth} / L: {p.windowLevel}
												</span>
											</div>
											{isActive && (
												<Check className="w-4 h-4 text-cyan-400 shrink-0" />
											)}
										</button>
									);
								})}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* ─── BOTTOM ACTIONS (PINNED TO BOTTOM) ───────────────────────── */}
			<div className="mt-auto flex flex-col items-center gap-1.5 w-full shrink-0">
				<div className="w-7 h-px bg-zinc-800 my-1 shrink-0" role="separator" />

				{/* 10. Clear View (Hide Overlays for Fracture Inspection) */}
				{onToggleClearView && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onToggleClearView}
							className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
								isClearView
									? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs shadow-amber-950/40"
									: "bg-[#09090b] text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
							}`}
							title="Режим «Clear View» (Скрыть все оверлеи) [H]"
							aria-label="Режим Clear View"
							data-testid="cbct-tool-clear-view"
						>
							{isClearView ? <EyeOff className="w-5 h-5 text-amber-400" /> : <Eye className="w-5 h-5" />}
						</button>
						<div
							role="tooltip"
							className="pointer-events-none absolute left-[48px] bottom-20 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
						>
							<span className="font-semibold">Clear View</span>
							<span className="text-zinc-400 text-[11px]">{isClearView ? "Оверлеи скрыты" : "Осмотр трещин"}</span>
							<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
								H
							</kbd>
						</div>
					</div>
				)}

				{/* 11. Invert LUT (Negative/Positive toggle) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={onToggleInvertColors}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							invertColors
								? "bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-xs shadow-amber-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="◑ Инвертировать цвета (Негатив/Позитив) [I]"
						aria-label="Инвертировать цвета"
						data-testid="cbct-tool-invert-lut"
					>
						<SunMoon className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] bottom-12 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Инверсия LUT</span>
						<span className="text-zinc-400 text-[11px]">{invertColors ? "Негатив активен" : "Позитив (Romexis)"}</span>
						<kbd className="text-[10px] bg-zinc-900 text-cyan-300 px-1.5 py-0.5 rounded border border-zinc-800 font-mono">
							I
						</kbd>
					</div>
				</div>

				{/* 12. Reset All (Axes, Zoom, Pan) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={onResetAll}
						className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center bg-[#09090b] text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-all duration-150"
						title="↺ Сброс осей, зума и панорамы"
						aria-label="Сбросить оси и зум"
						data-testid="cbct-tool-reset-all"
					>
						<RotateCcw className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[48px] bottom-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#09090b] text-zinc-100 text-xs px-2.5 py-1.5 rounded-md border border-zinc-800 shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold text-amber-300">Сброс осей и зума</span>
						<span className="text-zinc-400 text-[11px]">Возврат в исходное 0°</span>
					</div>
				</div>

				{/* 12. Load Real CBCT / DICOM */}
				<div className="relative flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("dicom")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							openMenu === "dicom"
								? "bg-zinc-900 text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#09090b] text-zinc-400 hover:text-cyan-300 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/40"
						}`}
						title="Загрузить КТ / DICOM"
						aria-label="Загрузить КТ / DICOM"
						aria-expanded={openMenu === "dicom"}
						data-testid="cbct-tool-dicom"
					>
						<FolderOpen className="w-5 h-5" />
					</button>

					{/* DICOM Ingestion Flyout Menu */}
					{openMenu === "dicom" && (
						<div
							role="dialog"
							aria-label="Загрузка файлов DICOM"
							data-testid="cbct-dicom-flyout"
							className="absolute left-[48px] bottom-0 z-50 w-60 bg-[#09090b] border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100"
						>
							<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
								<span className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
									<FolderOpen className="w-4 h-4 text-cyan-400" />
									Загрузить КТ / DICOM
								</span>
								<button
									type="button"
									onClick={() => setOpenMenu("none")}
									className="min-h-[36px] min-w-[36px] sm:min-h-[44px] sm:min-w-[44px] flex items-center justify-center p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
									aria-label="Закрыть меню"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>

							<div className="space-y-1.5">
								<button
									type="button"
									onClick={handleFolderUploadClick}
									className="w-full px-3 py-2.5 rounded-lg bg-[#09090b] hover:bg-zinc-900 text-zinc-100 border border-zinc-800 text-xs font-semibold flex items-center gap-2.5 transition-colors shadow-xs"
									data-testid="cbct-dicom-folder-opt"
								>
									<FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
									<div className="flex flex-col text-left">
										<span className="font-bold">Папка DICOM</span>
										<span className="text-[10px] text-zinc-400">
											Серия срезов .dcm
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={handleZipUploadClick}
									className="w-full px-3 py-2.5 rounded-lg bg-[#09090b] hover:bg-zinc-900 text-zinc-100 border border-zinc-800 text-xs font-semibold flex items-center gap-2.5 transition-colors shadow-xs"
									data-testid="cbct-dicom-zip-opt"
								>
									<FileArchive className="w-4 h-4 text-amber-400 shrink-0" />
									<div className="flex flex-col text-left">
										<span className="font-bold">ZIP-архив КТ</span>
										<span className="text-[10px] text-zinc-400">
											Архив исследования .zip
										</span>
									</div>
								</button>
							</div>
						</div>
					)}
				</div>
			</div>
		</aside>
	);
};

export default CbctLeftToolDock;
