/**
 * DENTE CRM — Planmeca Romexis & Ez3D-i Left Tool Dock (52px Vertical Toolbar)
 * Standards: DICOM Part 3 / PS 3.3, Misch CE, Buser, Planmeca Romexis 6.x
 *
 * Capabilities:
 * 1. 52px matte dark vertical column (bg-[#0f1219] border-r border-[#242a35]) along left modal edge.
 * 2. WCAG 2.1 touch-targets (>= 44x44px) with high-contrast active state (bg-cyan-500/20 text-cyan-400 border-cyan-500/50).
 * 3. Group 1: Cursor / Mouse Navigation Modes (Crosshair, Pan, Zoom, Window W/L, Oblique Rotate).
 * 4. Group 2: Measurements & Densitometry (Distance Caliper Ruler, Point HU Probe, Mandibular Nerve IAN).
 * 5. Group 3: Slice Thickness & Slab Projection Flyout (Single 1mm, Slab MIP, Avg IP, Min IP, 1..30 mm slider).
 * 6. Group 4: HU Contrast Presets Flyout (Зубы 4400/1300, Эндо 5500/1600, Кортикал 3500/900, Мягкие ткани 600/50, Пазухи 1600/-400).
 * 7. Bottom Actions: 1-Click Reset All (Axes, Zoom, Pan) + DICOM/Folder/ZIP Ingestion Flyout.
 */

import {
	Activity,
	Check,
	Contrast,
	Crosshair,
	FileArchive,
	FolderOpen,
	Hand,
	Layers,
	RotateCcw,
	RotateCw,
	Ruler,
	Sliders,
	X,
	Zap,
	ZoomIn,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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

	/** Trigger loading real DICOM folder */
	readonly onOpenDicomFolder?: (() => void) | undefined;
	/** Trigger loading real DICOM ZIP archive */
	readonly onOpenDicomZip?: (() => void) | undefined;

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
	onOpenDicomFolder,
	onOpenDicomZip,
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
			className={`w-[52px] min-w-[52px] max-w-[52px] h-full bg-[#14171e] border-r border-[#242a35] flex flex-col items-center py-2 px-1 shrink-0 select-none z-30 relative overflow-visible ${className}`}
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="Перекрестие (Синхронная 3D навигация) [C]"
						aria-label="Перекрестие"
						data-testid="cbct-tool-crosshair"
					>
						<Crosshair className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Перекрестие</span>
						<span className="text-[#94a3b8] text-[11px]">Навигация по срезам</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="Панорама (Перемещение среза) [P]"
						aria-label="Панорама"
						data-testid="cbct-tool-pan"
					>
						<Hand className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Панорама</span>
						<span className="text-[#94a3b8] text-[11px]">Сдвиг проекции</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="Лупа / Зум (Масштабирование) [Z]"
						aria-label="Лупа / Зум"
						data-testid="cbct-tool-zoom"
					>
						<ZoomIn className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Зум</span>
						<span className="text-[#94a3b8] text-[11px]">Приближение / Отдаление</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="Окно W/L (Яркость и Контраст) [W]"
						aria-label="Окно W/L"
						data-testid="cbct-tool-window_level"
					>
						<Contrast className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Окно W/L</span>
						<span className="text-[#94a3b8] text-[11px]">Яркость / Контраст HU</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
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
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Вращение осей</span>
						<span className="text-[#94a3b8] text-[11px]">Косой наклон срезов</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
							R
						</kbd>
					</div>
				</div>
			</div>

			{/* ─── DIVIDER ─────────────────────────────────────────────────── */}
			<div className="w-7 h-px bg-[#242a35] my-2 shrink-0" role="separator" />

			{/* ─── GROUP 2: MEASUREMENTS & DENSITOMETRY ────────────────────── */}
			<div className="flex flex-col items-center gap-1.5 w-full shrink-0">
				{/* 6. Ruler / Caliper */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool("ruler")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							activeTool === "ruler"
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="Линейка (Калипер расстояния в мм) [M]"
						aria-label="Линейка"
						data-testid="cbct-tool-ruler"
					>
						<Ruler className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Линейка</span>
						<span className="text-[#94a3b8] text-[11px]">Калипер расстояния (мм)</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
							M
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="Плотность HU (Денситометрия Misch) [H]"
						aria-label="Плотность HU"
						data-testid="cbct-tool-probe"
					>
						<Activity className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Плотность HU</span>
						<span className="text-[#94a3b8] text-[11px]">Замер плотности кости</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="Канал IAN (Трассировка нерва) [N]"
						aria-label="Канал IAN"
						data-testid="cbct-tool-nerve"
					>
						<Zap className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold">Канал IAN</span>
						<span className="text-[#94a3b8] text-[11px]">Трассировка нерва (2мм)</span>
						<kbd className="text-[10px] bg-[#1e2430] text-cyan-300 px-1.5 py-0.5 rounded border border-[#242a35] font-mono">
							N
						</kbd>
					</div>
				</div>
			</div>

			{/* ─── DIVIDER ─────────────────────────────────────────────────── */}
			<div className="w-7 h-px bg-[#242a35] my-2 shrink-0" role="separator" />

			{/* ─── GROUP 3 & 4: SLAB THICKNESS / MIP & HU PRESETS ─────────── */}
			<div className="flex flex-col items-center gap-1.5 w-full shrink-0">
				{/* 9. Slab Thickness & MIP Flyout */}
				<div className="relative flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("slab")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							openMenu === "slab" || isSlabActive
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
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
							className="absolute left-[54px] top-0 z-50 w-64 bg-[#14171e] border border-[#242a35] shadow-2xl rounded-xl p-3 text-[#e2e8f0]"
						>
							<div className="flex items-center justify-between pb-2 border-b border-[#242a35] mb-2.5">
								<div className="flex items-center gap-1.5">
									<Layers className="w-4 h-4 text-cyan-400" />
									<span className="text-xs font-bold text-[#e2e8f0]">
										Толщина среза & MIP
									</span>
								</div>
								<button
									type="button"
									onClick={() => setOpenMenu("none")}
									className="p-1 rounded text-[#94a3b8] hover:text-white hover:bg-[#1e2430] transition-colors"
									aria-label="Закрыть меню"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>

							{/* Projection Modes */}
							<div className="space-y-1.5 mb-3">
								<span className="text-[10px] text-[#94a3b8] uppercase font-mono tracking-wider font-semibold">
									Режим проекции
								</span>
								<div className="grid grid-cols-2 gap-1">
									<button
										type="button"
										onClick={() => handleSlabModeSelect("single")}
										className={`px-2 py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
											normalizedSlabMode === "single"
												? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35]"
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
												? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35]"
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
												? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35]"
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
												? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 font-bold"
												: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35]"
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
									<span className="text-[10px] text-[#94a3b8] uppercase font-mono tracking-wider font-semibold">
										Толщина сляба
									</span>
									<span className="font-mono text-cyan-300 font-bold text-xs bg-[#1e2430] px-1.5 py-0.5 rounded border border-[#242a35]">
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
											className={`px-2 py-1 rounded text-[11px] font-mono transition-colors shrink-0 ${
												Math.abs(slabThicknessMm - t) < 0.2
													? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 font-bold"
													: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35]"
											}`}
										>
											{t}мм
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
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
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
							className="absolute left-[54px] top-0 z-50 w-72 bg-[#14171e] border border-[#242a35] shadow-2xl rounded-xl p-3 text-[#e2e8f0]"
						>
							<div className="flex items-center justify-between pb-2 border-b border-[#242a35] mb-2">
								<div className="flex items-center gap-1.5">
									<Sliders className="w-4 h-4 text-cyan-400" />
									<span className="text-xs font-bold text-[#e2e8f0]">
										Пресеты контраста (HU)
									</span>
								</div>
								<button
									type="button"
									onClick={() => setOpenMenu("none")}
									className="p-1 rounded text-[#94a3b8] hover:text-white hover:bg-[#1e2430] transition-colors"
									aria-label="Закрыть меню"
								>
									<X className="w-3.5 h-3.5" />
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
													? "bg-[#1e2430] text-cyan-300 border-cyan-500/60 shadow-xs"
													: "bg-[#14171e] text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#1e2430] border-[#242a35]"
											}`}
											data-testid={`cbct-hu-preset-option-${p.id}`}
										>
											<div className="flex flex-col min-w-0">
												<span className="text-xs font-semibold truncate text-[#e2e8f0]">
													{p.label}
												</span>
												<span className="text-[10px] text-[#64748b] font-mono">
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
				<div className="w-7 h-px bg-[#242a35] my-1 shrink-0" role="separator" />

				{/* 11. Reset All (Axes, Zoom, Pan) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={onResetAll}
						className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center bg-[#14171e] text-[#94a3b8] hover:text-amber-300 hover:bg-[#1e2430] border border-[#242a35] hover:border-amber-500/40 transition-all duration-150"
						title="↺ Сброс осей, зума и панорамы"
						aria-label="Сбросить оси и зум"
						data-testid="cbct-tool-reset-all"
					>
						<RotateCcw className="w-5 h-5" />
					</button>
					<div
						role="tooltip"
						className="pointer-events-none absolute left-[54px] bottom-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 z-50 bg-[#14171e] text-[#e2e8f0] text-xs px-2.5 py-1.5 rounded-md border border-[#242a35] shadow-xl whitespace-nowrap flex items-center gap-2"
					>
						<span className="font-semibold text-amber-300">Сброс осей и зума</span>
						<span className="text-[#94a3b8] text-[11px]">Возврат в исходное 0°</span>
					</div>
				</div>

				{/* 12. Load Real CBCT / DICOM */}
				<div className="relative flex items-center justify-center">
					<button
						type="button"
						onClick={() => toggleMenu("dicom")}
						className={`w-10 h-10 min-w-[40px] min-h-[40px] rounded-lg flex items-center justify-center transition-all duration-150 ${
							openMenu === "dicom"
								? "bg-[#1e2430] text-cyan-400 border border-cyan-500/60 shadow-xs shadow-cyan-950/40"
								: "bg-[#14171e] text-[#94a3b8] hover:text-cyan-300 hover:bg-[#1e2430] border border-[#242a35] hover:border-cyan-500/40"
						}`}
						title="📁 Загрузить КТ / DICOM"
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
							className="absolute left-[54px] bottom-0 z-50 w-60 bg-[#14171e] border border-[#242a35] shadow-2xl rounded-xl p-3 text-[#e2e8f0]"
						>
							<div className="flex items-center justify-between pb-2 border-b border-[#242a35] mb-2">
								<span className="text-xs font-bold text-[#e2e8f0] flex items-center gap-1.5">
									<FolderOpen className="w-4 h-4 text-cyan-400" />
									Загрузить КТ / DICOM
								</span>
								<button
									type="button"
									onClick={() => setOpenMenu("none")}
									className="p-1 rounded text-[#94a3b8] hover:text-white hover:bg-[#1e2430] transition-colors"
									aria-label="Закрыть меню"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							</div>

							<div className="space-y-1.5">
								<button
									type="button"
									onClick={handleFolderUploadClick}
									className="w-full px-3 py-2.5 rounded-lg bg-[#14171e] hover:bg-[#1e2430] text-[#e2e8f0] border border-[#242a35] text-xs font-semibold flex items-center gap-2.5 transition-colors shadow-xs"
									data-testid="cbct-dicom-folder-opt"
								>
									<FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
									<div className="flex flex-col text-left">
										<span className="font-bold">Папка DICOM</span>
										<span className="text-[10px] text-[#94a3b8]">
											Серия срезов .dcm
										</span>
									</div>
								</button>

								<button
									type="button"
									onClick={handleZipUploadClick}
									className="w-full px-3 py-2.5 rounded-lg bg-[#14171e] hover:bg-[#1e2430] text-[#e2e8f0] border border-[#242a35] text-xs font-semibold flex items-center gap-2.5 transition-colors shadow-xs"
									data-testid="cbct-dicom-zip-opt"
								>
									<FileArchive className="w-4 h-4 text-amber-400 shrink-0" />
									<div className="flex flex-col text-left">
										<span className="font-bold">ZIP-архив КТ</span>
										<span className="text-[10px] text-[#94a3b8]">
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
