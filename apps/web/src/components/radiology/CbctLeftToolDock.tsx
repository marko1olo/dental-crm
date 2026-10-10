/**
 * DENTE CRM — Planmeca Romexis & Ez3D-i Left Tool Dock (Compact Vertical Dock)
 * Standards: DICOM Part 3 / PS 3.3, Misch CE, Buser, Planmeca Romexis 6.x
 */

import {
	Activity,
	CircleDot,
	Compass,
	Contrast,
	Crosshair,
	Eye,
	EyeOff,
	Focus,
	FolderOpen,
	Hand,
	Layers,
	Palette,
	RotateCcw,
	RotateCw,
	Ruler,
	Sliders,
	Sparkles,
	SunMoon,
	Wind,
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
	CbctColormapFlyout,
	CBCT_COLORMAP_PRESETS,
	getNextSharpenAmount,
	DockTooltip,
	getToolBtnClass,
	type CbctColorMapMode,
	type CbctToolMode,
	type CbctLeftToolDockProps,
} from "./CbctColormapFlyout";
import { getSharedCbctGlContext } from "./mpr/webgl/CbctVolumeGlContext";

export * from "./CbctColormapFlyout";

type FlyoutMenuType = "none" | "slab" | "hu" | "dicom" | "colormap";

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
						<EndoFileCanal className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip
						title="Канал (Эндо-калипер)"
						subtitle="Измерить длину и кривизну канала (по Шнайдеру)"
						shortcut="E"
						titleColor="text-teal-300"
					/>
				</div>

				{/* 8f. Airway Analysis Tool (Ez3D-i Volumetric Airway & Obstruction Risk) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={() => onSelectTool(activeTool === "airway" ? "crosshair" : "airway")}
						className={getToolBtnClass(
							activeTool === "airway",
							"bg-teal-500/20 text-teal-300 border border-teal-500/60 shadow-xs shadow-teal-950/40",
						)}
						title="Дыхательные пути (Анализ объема и сужения по Ez3D-i)"
						aria-label="Анализ дыхательных путей"
						data-testid="cbct-tool-airway"
					>
						<Wind className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
					</button>
					<DockTooltip
						title="Дыхательные пути"
						subtitle="Объем воздуха и сужение (Ez3D-i)"
						titleColor="text-teal-300"
					/>
				</div>

				{/* 8b. Dental Arch Toggle */}
				{onToggleDentalArch && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={onToggleDentalArch}
							className={getToolBtnClass(showDentalArch, "bg-teal-500/20 text-teal-300 border border-teal-500/60 shadow-xs shadow-teal-950/40")}
							title="Дуга ОПТГ (Отображение зубной дуги)"
							aria-label="Дуга ОПТГ"
							data-testid="cbct-left-dock-toggle-arch"
						>
							<DentalPanoramicArch className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
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
							className="w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex items-center justify-center transition-all duration-150 bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-teal-300 hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-teal-500/60 shadow-xs"
							title="Сгенерировать дугу автоматически (по плотности эмали/кости)"
							aria-label="Сгенерировать дугу автоматически"
							data-testid="cbct-tool-auto-arch"
						>
							<Sliders className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
						</button>
						<DockTooltip title="Авто-дуга" subtitle="Сгенерировать автоматически" titleColor="text-teal-300" />
					</div>
				)}

				{/* 8d. Implant Planning Mode Tool Button */}
				{onSelectStudioMode && (
					<div className="relative group flex items-center justify-center">
						<button
							type="button"
							onClick={() => onSelectStudioMode(studioMode === "implant" ? "diagnostic" : "implant")}
							className={getToolBtnClass(studioMode === "implant", "bg-teal-500/20 text-teal-300 border border-teal-500/60 shadow-xs shadow-teal-950/40")}
							title="Имплантация (Планирование имплантата) [I]"
							aria-label="Имплантация"
							data-testid="cbct-left-dock-toggle-implant"
						>
							<CircleDot className="w-4 h-4 [@media(pointer:coarse)]:w-5 [@media(pointer:coarse)]:h-5 shrink-0" />
						</button>
						<DockTooltip title="Имплантация" subtitle={studioMode === "implant" ? "Режим активен" : "Планирование"} titleColor="text-teal-300" />
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
								? "bg-teal-500/20 text-teal-400 border border-teal-500/60 shadow-xs shadow-teal-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-teal-500/40"
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
							<span className="font-semibold text-teal-300">Толщина среза</span>
							<span className="text-[var(--muted,#a1a1aa)] text-[11px]">Сляб MIP / MinIP / Avg</span>
							<kbd className="text-[10px] bg-zinc-800 text-teal-300 px-1.5 py-0.5 rounded border border-[var(--line,#27272a)] font-mono">
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
								? "bg-teal-500/20 text-teal-400 border border-teal-500/60 shadow-xs shadow-teal-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-teal-500/40"
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

					{openMenu === "none" && <DockTooltip title="Пресеты HU" subtitle="Кость / Эндо / Ткани" shortcut="F" titleColor="text-teal-300" />}

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
								? "bg-teal-500/20 text-teal-300 border border-teal-500/60 shadow-xs shadow-teal-950/40"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-teal-500/40"
						}`}
						title="Цветовые карты WebGL2 (Миш D1-D4 / Эндо / DICOM)"
						aria-label="Цветовые карты WebGL2"
						aria-expanded={openMenu === "colormap"}
						data-testid="cbct-tool-colormap"
					>
						<Palette className="w-3.5 h-3.5 [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4 shrink-0" />
						<span className="text-[7.5px] [@media(pointer:coarse)]:text-[8px] font-mono font-bold leading-none mt-0.5">
							{activeColorMapMode === "bone_density"
								? "МИШ"
								: activeColorMapMode === "endo"
									? "ЭНД"
									: activeColorMapMode === "inverted"
										? "ИНВ"
										: "LUT"}
						</span>
					</button>

					{openMenu === "none" && <DockTooltip title="Цветовая карта" subtitle={activeColorMapMode === "bone_density" ? "Плотность кости (Миш D1-D4)" : activeColorMapMode === "endo" ? "Эндо (Микротрещины)" : activeColorMapMode === "inverted" ? "Белая бумага (Печать)" : "Серый (DICOM)"} titleColor="text-teal-300" />}

					{/* Flyout Popover for Colormaps */}
					{openMenu === "colormap" && (
						<CbctColormapFlyout
							activeColorMap={activeColorMapMode}
							onSelectColorMap={handleColorMapSelect}
							onClose={() => setOpenMenu("none")}
						/>
					)}
				</div>

				{/* 12. Hardware Laplacian Sharpening Quick Toggle (09 Laplacian Sharpen) */}
				<div className="relative group flex items-center justify-center">
					<button
						type="button"
						onClick={handleToggleSharpen}
						className={`w-8 h-8 min-w-[32px] min-h-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] rounded-md [@media(pointer:coarse)]:rounded-lg flex flex-col items-center justify-center relative transition-all duration-150 ${
							activeSharpen > 0
								? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/80 shadow-xs shadow-cyan-950/50"
								: "bg-zinc-900 text-[var(--muted,#a1a1aa)] hover:text-[var(--ink,#f4f4f5)] hover:bg-zinc-800 border border-[var(--line,#27272a)] hover:border-cyan-500/40"
						}`}
						title="Лапласиан резкости (Sharpen / Эндо) [Клик: 0% / 50% / 100%]"
						aria-label="Лапласиан резкости срезов"
						data-testid="cbct-tool-sharpen"
					>
						<Focus className={`w-3.5 h-3.5 [@media(pointer:coarse)]:w-4 [@media(pointer:coarse)]:h-4 shrink-0 transition-transform ${activeSharpen > 0 ? "text-cyan-300 scale-110" : "text-zinc-400"}`} />
						<span className={`text-[7px] [@media(pointer:coarse)]:text-[7.5px] font-mono font-bold leading-none mt-0.5 tracking-tighter ${activeSharpen > 0 ? "text-cyan-300 font-extrabold" : "text-zinc-400"}`}>
							{activeSharpen <= 0.05 ? "0%" : activeSharpen <= 0.55 ? "50%" : "100%"}
						</span>
					</button>

					<DockTooltip
						title="Лапласиан резкости (Sharpen)"
						subtitle={
							activeSharpen <= 0.05
								? "Выкл (0%) — кликните для включения"
								: activeSharpen <= 0.55
									? "Стандарт (50%) — контурная резкость"
									: "Максимум ЭНДО (100%) — каналы MB1/MB2"
						}
						titleColor="text-cyan-300"
					/>
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
						<DockTooltip title="Clear View" subtitle={isClearView ? "Оверлеи скрыты" : "Осмотр трещин"} shortcut="H" bottomClass="bottom-16" />
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
						<DockTooltip title="Инверсия LUT" subtitle={invertColors ? "Негатив активен" : "Позитив (Romexis)"} shortcut="I" bottomClass="bottom-10" />
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
					<DockTooltip title="Сброс осей и зума" subtitle="Возврат в исходное 0°" shortcut="Home" titleColor="text-amber-300" bottomClass="bottom-2" />
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

					{openMenu === "none" && <DockTooltip title="Загрузить DICOM" subtitle="Открыть папку или ZIP" shortcut="O" titleColor="text-cyan-300" bottomClass="bottom-2" />}

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
