import React from "react";
import {
	Camera,
	Columns2,
	Columns3,
	FileText,
	Grid2X2,
	Maximize2,
	Minimize2,
	MoreHorizontal,
	RotateCcw,
	Ruler,
	Sliders,
	Receipt,
	X,
} from "lucide-react";
import {
	DentalPanoramicArch,
	DicomCube3D,
	DentalImplant,
	DentalArticulator,
	BoneDensityMisch,
	EndoFileCanal,
} from "../../icons/DentalIcons";
import {
	CBCT_HOUNSFIELD_PRESETS,
	CLINICAL_RADIOLOGY_PRESETS,
	type ClinicalRadiologyPreset,
	type CbctVoxelVolume,
	type CbctViewportType,
	type SlabProjectionMode,
} from "../cbctMprMath";
import {
	CBCT_WORKSPACE_TABS,
	type StudioMode,
	type ViewLayoutMode,
} from "./cbctStudioTypes";

export interface CbctHeaderBarProps {
	readonly modalId: string;
	readonly patientDisplayName: string;
	readonly resolvedPatientName: string;
	readonly loadedSliceCount: number;
	readonly volume: CbctVoxelVolume | null;
	readonly studioMode: StudioMode;
	readonly handleSelectStudioMode: (mode: StudioMode) => void;
	readonly handleExportToEmr: () => void;
	readonly handleExportCbctToFinance?: (() => void) | undefined;
	readonly isSidebarOpen: boolean;
	readonly setIsSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isStudioMenuOpen: boolean;
	readonly setIsStudioMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly studioMenuRef: React.RefObject<HTMLDivElement | null>;
	readonly handleResetAll: () => void;
	readonly handleAutoDetectArch: () => void;
	readonly showDentalArch: boolean;
	readonly setShowDentalArch: React.Dispatch<React.SetStateAction<boolean>>;
	readonly showEdgeRulers?: boolean | undefined;
	readonly setShowEdgeRulers?: React.Dispatch<React.SetStateAction<boolean>> | undefined;
	readonly handleExportPdfReport: () => void;
	readonly maximizedViewport: CbctViewportType | null;
	readonly setMaximizedViewport: (viewport: CbctViewportType | null) => void;
	readonly viewLayout: ViewLayoutMode;
	readonly setViewLayout: (layout: ViewLayoutMode) => void;
	readonly isFullscreen: boolean;
	readonly handleToggleFullscreenModal: () => void;
	readonly onClose: () => void;
	readonly activePresetId?: string | undefined;
	readonly onSelectPreset?: ((presetId: string) => void) | undefined;
	readonly crossSectionStepMm?: number | undefined;
	readonly onChangeCrossSectionStepMm?: ((stepMm: number) => void) | undefined;
	readonly isUnsharpActive?: boolean | undefined;
	readonly onToggleUnsharp?: (() => void) | undefined;
	readonly sharpenAmount?: number | undefined;
	readonly windowWidth?: number | undefined;
	readonly onChangeWindowWidth?: ((w: number) => void) | undefined;
	readonly windowLevel?: number | undefined;
	readonly onChangeWindowLevel?: ((l: number) => void) | undefined;
	readonly slabThicknessMm?: number | undefined;
	readonly onChangeSlabThicknessMm?: ((th: number) => void) | undefined;
	readonly slabMode?: SlabProjectionMode | undefined;
	readonly onChangeSlabMode?: ((mode: SlabProjectionMode) => void) | undefined;
	readonly onSelectClinicalPreset?: ((presetId: string) => void) | undefined;
}

export const CbctHeaderBar: React.FC<CbctHeaderBarProps> = ({
	modalId,
	patientDisplayName,
	resolvedPatientName,
	loadedSliceCount,
	volume,
	studioMode,
	handleSelectStudioMode,
	handleExportToEmr,
	handleExportCbctToFinance,
	isSidebarOpen,
	setIsSidebarOpen,
	isStudioMenuOpen,
	setIsStudioMenuOpen,
	studioMenuRef,
	handleResetAll,
	handleAutoDetectArch,
	showDentalArch,
	setShowDentalArch,
	showEdgeRulers = false,
	setShowEdgeRulers,
	handleExportPdfReport,
	maximizedViewport,
	setMaximizedViewport,
	viewLayout,
	setViewLayout,
	isFullscreen,
	handleToggleFullscreenModal,
	onClose,
	activePresetId,
	onSelectPreset,
	crossSectionStepMm,
	onChangeCrossSectionStepMm,
	isUnsharpActive = false,
	onToggleUnsharp,
	sharpenAmount,
	windowWidth = 2200,
	onChangeWindowWidth,
	windowLevel = 450,
	onChangeWindowLevel,
	slabThicknessMm = 1.0,
	onChangeSlabThicknessMm,
	slabMode = "single",
	onChangeSlabMode,
	onSelectClinicalPreset,
}) => {
	const contrastMenuRef = React.useRef<HTMLDivElement | null>(null);
	const [isContrastMenuOpen, setIsContrastMenuOpen] = React.useState<boolean>(false);

	React.useEffect(() => {
		if (!isContrastMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (contrastMenuRef.current && !contrastMenuRef.current.contains(e.target as Node)) {
				setIsContrastMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isContrastMenuOpen]);
	return (
		<header
			data-testid="cbct-header-bar"
			className="h-10 min-h-[40px] px-2 sm:px-3 py-1 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0 gap-1.5 sm:gap-2 text-zinc-100 min-w-0 w-full max-w-full relative z-30"
		>
			{/* Left: 3D Dicom Cube Icon + Title + Quiet Study Status */}
			<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
				<div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
					<DicomCube3D className="w-4 h-4 text-cyan-400" />
				</div>
				<div className="flex flex-col min-w-0 justify-center">
					<div className="flex items-center gap-1">
						<h2
							id={`cbct-studio-title-${modalId}`}
							className="text-xs font-bold text-zinc-100 tracking-wide flex items-center gap-1.5 whitespace-nowrap leading-none"
						>
							<span className="hidden sm:inline">3D CBCT Studio</span>
							<span className="sm:hidden font-bold">CBCT</span>
							<span className="hidden lg:inline-block text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700">
								Romexis 6
							</span>
						</h2>
					</div>
					<p
						className="text-[10px] text-zinc-400 truncate leading-none min-w-0 max-w-[110px] sm:max-w-[180px] lg:max-w-[280px]"
						data-testid="cbct-patient-metadata-badge"
						id="cbct-patient-metadata-badge"
						title={`${patientDisplayName || resolvedPatientName} • ${loadedSliceCount > 0 ? `${loadedSliceCount} срезов` : "Исследование не загружено"} • ${volume ? `${volume.spacingMm.x.toFixed(1)} мм` : "—"}`}
					>
						{patientDisplayName || resolvedPatientName}
					</p>
				</div>
			</div>

			{/* Center: Clinical Radiology PACS Workspaces (Панорама и Срезы, MPR 3D, Имплантация, ВНЧС) + Physical Unsharp Masking */}
			<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
				<nav
					aria-label="Рабочие области КЛКТ"
					className="flex items-center bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800 shrink-0 gap-0.5"
				>
					{CBCT_WORKSPACE_TABS.map((tab) => {
						const isSelected =
							tab.id === "diagnostic"
								? studioMode === "diagnostic" || studioMode === "volume3d"
								: studioMode === tab.studioMode;

						const IconComponent =
							tab.id === "panoramic"
								? DentalPanoramicArch
								: tab.id === "diagnostic"
									? DicomCube3D
									: tab.id === "endo"
										? EndoFileCanal
										: tab.id === "implant"
											? DentalImplant
											: DentalArticulator;

						return (
							<button
								key={tab.id}
								type="button"
								onClick={() => handleSelectStudioMode(tab.studioMode)}
								className={`px-2 sm:px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-colors cursor-pointer border ${
									isSelected
										? `${tab.activeBorderClass} font-bold`
										: "bg-transparent border-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
								}`}
								data-testid={tab.testId}
								data-mode-testid={tab.modeTestId}
								title={tab.description}
								aria-selected={isSelected}
							>
								<IconComponent className={`w-3.5 h-3.5 shrink-0 ${isSelected ? tab.activeColorClass : "text-zinc-400"}`} />
								<span className="hidden md:inline">{tab.label}</span>
								<span className="md:hidden">{tab.shortLabel}</span>
							</button>
						);
					})}
				</nav>

				{/* Physical Button: Trabecular Unsharp Masking Filter */}
				{onToggleUnsharp && (
					<button
						type="button"
						onClick={onToggleUnsharp}
						className={`px-2 sm:px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
							isUnsharpActive
								? "bg-amber-950/40 text-amber-300 border-amber-500/70 shadow-[0_0_8px_rgba(245,158,11,0.35)]"
								: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-850"
						}`}
						data-testid="cbct-unsharp-toggle-btn"
						id="cbct-header-unsharp-mask-btn"
						title="Контурная резкость трабекул (Unsharp Masking, горячая клавиша 'U')"
						aria-pressed={isUnsharpActive}
					>
						<BoneDensityMisch className={`w-3.5 h-3.5 shrink-0 ${isUnsharpActive ? "text-amber-400" : "text-zinc-400"}`} />
						<span className="hidden sm:inline">Резкость</span>
						<span
							className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
								isUnsharpActive
									? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
									: "bg-zinc-800 text-zinc-500 border border-zinc-700"
							}`}
							data-testid="cbct-unsharp-hud-badge"
						>
							{isUnsharpActive ? "SHARP ON" : "RAW VOXEL"}
						</span>
					</button>
				)}

				{/* Interactive Contrast / Slice HUD Controller Button */}
				<div className="relative" ref={contrastMenuRef}>
					<button
						type="button"
						onClick={() => setIsContrastMenuOpen((prev) => !prev)}
						className={`px-2 sm:px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
							isContrastMenuOpen
								? "bg-cyan-950/60 text-cyan-300 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)] font-bold"
								: "bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white hover:bg-zinc-850"
						}`}
						data-testid="cbct-contrast-controls-btn"
						id="cbct-header-contrast-controls-btn"
						title="Настройка яркости, контраста (W/L), толщины среза и пресетов КЛКТ"
						aria-expanded={isContrastMenuOpen}
					>
						<Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
						<span className="hidden xl:inline">Контраст:</span>
						<span className="font-mono text-[10px] font-bold text-cyan-300">
							W:{windowWidth}/L:{windowLevel}
						</span>
						<span className="hidden sm:inline-block text-[10px] text-zinc-500 font-mono">
							• {slabThicknessMm} мм
						</span>
					</button>

					{isContrastMenuOpen && (
						<div
							className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 w-80 bg-zinc-900/98 border border-zinc-700/90 rounded-lg shadow-2xl p-2.5 z-50 flex flex-col gap-2.5 backdrop-blur-md text-zinc-100"
							data-testid="cbct-contrast-controls-popover"
						>
							<div className="flex items-center justify-between text-xs font-bold text-cyan-300 border-b border-zinc-800 pb-1.5">
								<span className="flex items-center gap-1.5">
									<Sliders className="w-3.5 h-3.5 text-cyan-400" />
									Настройка КЛКТ (Контраст и Срез)
								</span>
								<button
									type="button"
									onClick={() => {
										onSelectClinicalPreset?.("standard");
										onChangeWindowWidth?.(2200);
										onChangeWindowLevel?.(450);
										onChangeSlabThicknessMm?.(1.0);
										onChangeSlabMode?.("single");
									}}
									className="text-[10px] text-zinc-400 hover:text-cyan-300 underline cursor-pointer"
									title="Сбросить на базовый дефолт (W:2200, L:450, 1.0 мм)"
								>
									Дефолт (2200/450)
								</button>
							</div>

							{/* 1. Клинические базовые пресеты («Стандарт», «Кость», «Эндо / Каналы», «Имплант / Мягкий») */}
							<div className="flex flex-col gap-1">
								<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
									Клинические пресеты
								</span>
								<div className="grid grid-cols-2 gap-1">
									{CLINICAL_RADIOLOGY_PRESETS.map((pr) => {
										const isSelected = activePresetId === pr.id || (
											Math.abs(windowWidth - pr.windowWidth) <= 50 &&
											Math.abs(windowLevel - pr.windowLevel) <= 30
										);
										return (
											<button
												key={pr.id}
												type="button"
												onClick={() => {
													onSelectClinicalPreset?.(pr.id);
													onChangeWindowWidth?.(pr.windowWidth);
													onChangeWindowLevel?.(pr.windowLevel);
													onChangeSlabThicknessMm?.(pr.slabThicknessMm);
													onChangeSlabMode?.(pr.slabMode);
												}}
												className={`px-2 py-1 rounded text-xs font-semibold text-left transition-all border cursor-pointer ${
													isSelected
														? "bg-cyan-600 text-white border-cyan-400 shadow-xs font-bold"
														: "bg-zinc-850 text-zinc-300 border-zinc-750 hover:bg-zinc-800 hover:text-white"
												}`}
												title={pr.descriptionRu}
												data-testid={pr.testId}
											>
												<div className="truncate">{pr.label}</div>
												<div className="text-[9px] font-mono opacity-70">
													{pr.slabThicknessMm} мм • {pr.slabMode}
												</div>
											</button>
										);
									})}
								</div>
							</div>

							{/* 2. Толщина среза (1 мм, 2 мм, 3 мм, 5 мм, 10 мм) */}
							{onChangeSlabThicknessMm && (
								<div className="flex flex-col gap-1">
									<div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-zinc-400">
										<span>Толщина среза (MPR / Slab)</span>
										<span className="font-mono text-cyan-300">{slabThicknessMm} мм</span>
									</div>
									<div className="grid grid-cols-5 gap-1">
										{[1.0, 2.0, 3.0, 5.0, 10.0].map((th) => {
											const isCur = Math.abs(slabThicknessMm - th) < 0.1;
											return (
												<button
													key={th}
													type="button"
													onClick={() => onChangeSlabThicknessMm(th)}
													className={`py-1 px-1 rounded text-center text-xs font-semibold font-mono border transition-all cursor-pointer ${
														isCur
															? "bg-amber-600 text-white border-amber-400 shadow-xs font-bold"
															: "bg-zinc-850 text-zinc-300 border-zinc-750 hover:bg-zinc-800 hover:text-white"
													}`}
													data-testid={`cbct-header-slab-thickness-${th}`}
													title={`Толщина среза ${th} мм`}
												>
													{th} мм
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* 3. Режим рендеринга (Тонкий срез / Ray-Sum / Мягкий интеграл / MIP) */}
							{onChangeSlabMode && (
								<div className="flex flex-col gap-1">
									<span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
										Режим рендеринга среза
									</span>
									<div className="grid grid-cols-3 gap-1">
										{[
											{ id: "single", label: "Тонкий срез", title: "Одиночный тонкий чистый срез без наслоений" },
											{ id: "average", label: "Ray-Sum / Интеграл", title: "Рентгеновский интеграл плотностей (Average IP)" },
											{ id: "mip", label: "MIP", title: "Максимальная интенсивность (только для костных ориентиров)" },
										].map((m) => {
											const isCur = slabMode === m.id;
											return (
												<button
													key={m.id}
													type="button"
													onClick={() => onChangeSlabMode(m.id as SlabProjectionMode)}
													className={`py-1 px-1.5 rounded text-center text-xs font-semibold border transition-all cursor-pointer ${
														isCur
															? "bg-purple-600 text-white border-purple-400 shadow-xs font-bold"
															: "bg-zinc-850 text-zinc-300 border-zinc-750 hover:bg-zinc-800 hover:text-white"
													}`}
													title={m.title}
													data-testid={`cbct-header-slab-mode-${m.id}`}
												>
													{m.label}
												</button>
											);
										})}
									</div>
								</div>
							)}

							{/* 4. Интерактивные слайдеры Window Width / Window Level */}
							<div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">
								<div className="flex flex-col gap-0.5">
									<div className="flex justify-between text-xs">
										<span className="text-zinc-400">Контраст (Window Width W):</span>
										<span className="font-mono font-bold text-amber-300">{windowWidth} HU</span>
									</div>
									<input
										type="range"
										min={400}
										max={6000}
										step={50}
										value={windowWidth}
										onChange={(e) => onChangeWindowWidth?.(Number(e.target.value))}
										className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
										data-testid="cbct-header-slider-ww"
									/>
									<div className="flex justify-between text-[9px] text-zinc-500 font-mono">
										<span>Контрастный (400)</span>
										<span>Широкий (6000)</span>
									</div>
								</div>

								<div className="flex flex-col gap-0.5">
									<div className="flex justify-between text-xs">
										<span className="text-zinc-400">Яркость (Window Level L):</span>
										<span className="font-mono font-bold text-cyan-300">{windowLevel} HU</span>
									</div>
									<input
										type="range"
										min={-200}
										max={1500}
										step={25}
										value={windowLevel}
										onChange={(e) => onChangeWindowLevel?.(Number(e.target.value))}
										className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
										data-testid="cbct-header-slider-wl"
									/>
									<div className="flex justify-between text-[9px] text-zinc-500 font-mono">
										<span>Темный (-200)</span>
										<span>Светлый (+1500)</span>
									</div>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>


			{/* Right: Primary Clinical Actions (В ЭМК, Панель), More Options Menu (...), Window Controls */}
			<div className="flex items-center gap-1 sm:gap-1.5 shrink-0 sticky right-0 z-20 bg-zinc-950 pl-1.5 pr-2 sm:pr-2.5 shadow-[-6px_0_12px_rgba(9,9,11,0.9)]">
				{/* Primary Action 1: Clinical EMR Snapshot Export Button */}
				<button
					type="button"
					onClick={handleExportToEmr}
					className="px-2 sm:px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap h-7 min-h-0 flex items-center gap-1 bg-cyan-600 hover:bg-cyan-500 text-white shadow-xs transition-colors cursor-pointer"
					data-testid="cbct-btn-export-emr"
					title="Сохранить снимок и протокол планирования в медицинскую карту"
				>
					<Camera className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">В ЭМК</span>
				</button>

				{/* Primary Action 1b: 1-Click CBCT to Visit Finance & Treatment Plan */}
				{handleExportCbctToFinance && (
					<button
						type="button"
						onClick={handleExportCbctToFinance}
						className="px-2 sm:px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap h-7 min-h-0 flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-colors cursor-pointer"
						data-testid="cbct-header-add-finance-btn"
						title="В 1 клик добавить услугу КЛКТ (A06.07.012, 3 800 ₽) в финансовый акт визита и смету плана лечения"
					>
						<Receipt className="w-3.5 h-3.5" />
						<span className="hidden md:inline">+ КЛКТ в смету/акт</span>
					</button>
				)}

				{/* Primary Action 2: Sidebar Toggle Button with Colored Indicator */}
				<button
					type="button"
					onClick={() => setIsSidebarOpen((prev) => !prev)}
					className={`px-2 sm:px-2.5 py-1 rounded text-xs font-bold whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-colors border shadow-xs ${
						isSidebarOpen
							? "bg-zinc-900 text-cyan-400 border-cyan-500/60"
							: "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-900"
					}`}
					title={isSidebarOpen ? "Скрыть боковую панель" : "Показать боковую панель"}
					data-testid="cbct-toggle-sidebar-btn"
				>
					<span className={`w-1.5 h-1.5 rounded-full transition-colors ${isSidebarOpen ? "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" : "bg-zinc-500"}`} />
					<Columns2 className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">Панель</span>
				</button>

				{/* Secondary Actions: Popover Menu (Miller's Law <= 2 Primary Toolbar Actions) */}
				<div className="relative shrink-0" ref={studioMenuRef}>
					<button
						type="button"
						onClick={() => setIsStudioMenuOpen((prev) => !prev)}
						className={`px-1.5 sm:px-2 py-1 rounded text-xs font-bold whitespace-nowrap h-7 min-h-0 flex items-center gap-1 border transition-colors cursor-pointer ${
							isStudioMenuOpen
								? "bg-zinc-900 text-cyan-400 border-cyan-500/60"
								: "bg-zinc-950 hover:bg-zinc-900 text-zinc-200 border-zinc-800"
						}`}
						data-testid="cbct-more-options-btn"
						title="Дополнительные операции (Сброс, дуга, PDF, раскладка)"
						aria-haspopup="true"
						aria-expanded={isStudioMenuOpen}
					>
						<MoreHorizontal className="w-3.5 h-3.5" />
						<span className="hidden sm:inline">Опции</span>
					</button>

					{isStudioMenuOpen && (
						<div
							className="absolute right-0 top-full mt-1.5 w-60 bg-zinc-900/98 border border-zinc-700/90 rounded-lg shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md"
							data-testid="cbct-more-options-popover"
						>
							{/* 1-Click Reset View */}
							<button
								type="button"
								onClick={() => {
									handleResetAll();
									setIsStudioMenuOpen(false);
								}}
								className="w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 text-amber-300 hover:text-amber-200 hover:bg-zinc-800 transition-colors cursor-pointer"
								data-testid="cbct-btn-reset-view"
								title="Сбросить масштаб (100%), панораму (центр), наклон осей (0°) и контраст"
							>
								<RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
								<span>Сброс вида</span>
							</button>

							{/* 1-Click Auto Dental Arch Extraction */}
							<button
								type="button"
								onClick={() => {
									handleAutoDetectArch();
									setIsStudioMenuOpen(false);
								}}
								className="w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 text-purple-300 hover:text-purple-200 hover:bg-zinc-800 transition-colors cursor-pointer"
								data-testid="cbct-btn-auto-arch"
								title="Сгенерировать дугу автоматически по плотности эмали и кортикального гребня"
							>
								<Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
								<span>Автодуга зубов</span>
							</button>

							{/* 1-Click Toggle Dental Arch Spline */}
							<button
								type="button"
								onClick={() => {
									setShowDentalArch((prev) => !prev);
									setIsStudioMenuOpen(false);
								}}
								className={`w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 transition-colors cursor-pointer ${
									showDentalArch
										? "text-purple-300 bg-purple-950/40 hover:bg-purple-950/60"
										: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
								}`}
								data-testid="cbct-toggle-dental-arch"
								title="Показать / скрыть анатомическую дугу ОПТГ"
							>
								<DentalPanoramicArch className="w-3.5 h-3.5 text-purple-400 shrink-0" />
								<span>{showDentalArch ? "Скрыть дугу ОПТГ" : "Показать дугу ОПТГ"}</span>
							</button>

							{/* 1-Click Toggle Edge Millimeter Rulers */}
							{setShowEdgeRulers && (
								<button
									type="button"
									onClick={() => {
										setShowEdgeRulers((prev) => !prev);
										setIsStudioMenuOpen(false);
									}}
									className={`w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 transition-colors cursor-pointer ${
										showEdgeRulers
											? "text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/60"
											: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
									}`}
									data-testid="cbct-toggle-edge-rulers"
									title="Показать / скрыть краевые миллиметровые линейки по периметру окон"
								>
									<Ruler className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
									<span>{showEdgeRulers ? "Скрыть краевые линейки" : "Показать краевые линейки"}</span>
								</button>
							)}

							{/* 1-Click Printable PDF Report Export */}
							<button
								type="button"
								onClick={() => {
									handleExportPdfReport();
									setIsStudioMenuOpen(false);
								}}
								className="w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 text-amber-300 hover:text-amber-200 hover:bg-zinc-800 transition-colors cursor-pointer"
								data-testid="cbct-btn-export-pdf"
								title="Сформировать печатный A4 протокол планирования / PDF"
							>
								<FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
								<span>Печатный PDF протокол</span>
							</button>

							<div className="h-px bg-zinc-800 my-0.5" />

							{/* Viewport Layout Options */}
							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
								Раскладка окон
							</div>
							{maximizedViewport !== null ? (
								<button
									type="button"
									onClick={() => {
										setMaximizedViewport(null);
										setIsStudioMenuOpen(false);
									}}
									className="w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 text-cyan-400 hover:bg-zinc-800 transition-colors cursor-pointer"
									data-testid="cbct-restore-grid-btn"
									title="Восстановить сетку окон (2x2)"
								>
									<Minimize2 className="w-3.5 h-3.5 shrink-0" />
									<span>Сетка окон 2x2</span>
								</button>
							) : (
								<div className="flex flex-col gap-0.5">
									<button
										type="button"
										onClick={() => {
											setViewLayout("mpr_3_view");
											setIsStudioMenuOpen(false);
										}}
										className={`w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 transition-colors cursor-pointer ${
											viewLayout === "mpr_3_view"
												? "text-cyan-400 bg-cyan-950/30"
												: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
										}`}
										data-testid="cbct-layout-3view-btn"
										title="3 проекции MPR (Axial / Coronal / Sagittal)"
									>
										<Columns3 className="w-3.5 h-3.5 shrink-0" />
										<span>3 проекции MPR (Axial, Coronal, Sagittal)</span>
									</button>
									<button
										type="button"
										onClick={() => {
											setViewLayout("quad_view");
											setIsStudioMenuOpen(false);
										}}
										className={`w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 transition-colors cursor-pointer ${
											viewLayout === "quad_view"
												? "text-cyan-400 bg-cyan-950/30"
												: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
										}`}
										data-testid="cbct-layout-quad-btn"
										title="Сетка 4 окна (2x2)"
									>
										<Grid2X2 className="w-3.5 h-3.5 shrink-0" />
										<span>Сетка 4 окна (2x2)</span>
									</button>
									<button
										type="button"
										onClick={() => {
											setViewLayout("layout_1_plus_3");
											setIsStudioMenuOpen(false);
										}}
										className={`w-full px-2.5 py-1.5 rounded text-xs font-semibold text-left flex items-center gap-2 transition-colors cursor-pointer ${
											viewLayout === "layout_1_plus_3"
												? "text-cyan-400 bg-cyan-950/30"
												: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
										}`}
										data-testid="cbct-layout-1plus3-btn"
										title="Раскладка 1+3 (Доминантный аксиал)"
									>
										<Columns2 className="w-3.5 h-3.5 shrink-0" />
										<span>Раскладка 1+3 (Аксиал + MPR)</span>
									</button>
								</div>
							)}

							{/* Clinical Presets */}
							<div className="h-px bg-zinc-800 my-0.5" />
							<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
								Клинические пресеты (Базовые)
							</div>
							<div className="flex flex-col gap-0.5">
								{CLINICAL_RADIOLOGY_PRESETS.map((pr) => {
									const isSelected = activePresetId === pr.id;
									return (
										<button
											key={pr.id}
											type="button"
											onClick={() => {
												onSelectClinicalPreset?.(pr.id);
												onChangeWindowWidth?.(pr.windowWidth);
												onChangeWindowLevel?.(pr.windowLevel);
												onChangeSlabThicknessMm?.(pr.slabThicknessMm);
												onChangeSlabMode?.(pr.slabMode);
												setIsStudioMenuOpen(false);
											}}
											className={`w-full px-2 py-1 rounded text-xs font-semibold text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
												isSelected
													? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/40 shadow-xs font-bold"
													: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
											}`}
											data-testid={`cbct-header-clinical-preset-${pr.id}`}
											title={pr.descriptionRu}
										>
											<span className="truncate">{pr.label}</span>
											<span className="text-[10px] text-zinc-500 font-mono shrink-0">
												{pr.slabThicknessMm} мм • {pr.windowWidth}/{pr.windowLevel}
											</span>
										</button>
									);
								})}
							</div>

							{/* 1-Click WW/WL Contrast Presets */}
							{onSelectPreset && (
								<>
									<div className="h-px bg-zinc-800 my-0.5" />
									<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
										Пресеты контраста (HU)
									</div>
									<div className="flex flex-col gap-0.5">
										{CBCT_HOUNSFIELD_PRESETS.map((pr) => {
											const isSelected = activePresetId === pr.id;
											return (
												<button
													key={pr.id}
													type="button"
													onClick={() => {
														onSelectPreset(pr.id);
														setIsStudioMenuOpen(false);
													}}
													className={`w-full px-2 py-1 rounded text-xs font-semibold text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
														isSelected
															? "text-cyan-400 bg-cyan-950/40 border border-cyan-500/40 shadow-xs"
															: "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
													}`}
													data-testid={`cbct-header-preset-${pr.id}`}
													title={pr.descriptionRu}
												>
													<span className="truncate">{pr.label}</span>
													<span className="text-[10px] text-zinc-500 font-mono shrink-0">
														{pr.windowWidth}/{pr.windowLevel}
													</span>
												</button>
											);
										})}
									</div>
								</>
							)}

							{/* 1-Click Cross-Section Reslice Step Switcher */}
							{onChangeCrossSectionStepMm && (
								<>
									<div className="h-px bg-zinc-800 my-0.5" />
									<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
										<span>Шаг кросс-секций</span>
										<span className="text-cyan-400 font-mono text-[10px]">{crossSectionStepMm ?? 1.5} мм</span>
									</div>
									<div className="grid grid-cols-3 gap-1 px-1">
										{[1.0, 1.5, 2.0].map((step) => {
											const isCur = Math.abs((crossSectionStepMm ?? 1.5) - step) < 0.05;
											return (
												<button
													key={step}
													type="button"
													onClick={() => {
														onChangeCrossSectionStepMm(step);
														setIsStudioMenuOpen(false);
													}}
													className={`py-1 px-1 rounded text-center text-xs font-semibold font-mono border transition-colors cursor-pointer ${
														isCur
															? "bg-zinc-800 text-cyan-400 border-cyan-500/60 shadow-xs"
															: "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-100 hover:bg-zinc-800"
													}`}
													data-testid={`cbct-step-btn-${step}`}
													title={step === 1.0 ? "Шаг 1.0 мм (Высокая точность / Имплантация)" : step === 1.5 ? "Шаг 1.5 мм (Стандарт Planmeca/Vatech)" : "Шаг 2.0 мм (Обзорный шаг)"}
												>
													{step.toFixed(1)} мм
												</button>
											);
										})}
									</div>
								</>
							)}
						</div>
					)}
				</div>

				{/* Window Control Actions: Maximize & Close */}
				<div className="flex items-center gap-1 pl-1 sm:pl-1.5 pr-0.5 border-l border-zinc-800 shrink-0">
					{/* Modal Maximize / Fullscreen Button */}
					<button
						type="button"
						onClick={handleToggleFullscreenModal}
						className={`w-7 h-7 min-h-0 min-w-0 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
							isFullscreen
								? "bg-zinc-900 text-cyan-400 border-cyan-500/60 shadow-xs"
								: "bg-zinc-950 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border-zinc-800"
						}`}
						title={isFullscreen ? "Свернуть из полноэкранного режима" : "Развернуть на весь экран"}
						aria-label="Полноэкранный режим"
						data-testid="cbct-modal-maximize-btn"
					>
						{isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
					</button>

					{/* Modal Close Button */}
					<button
						type="button"
						onClick={onClose}
						className="w-7 h-7 min-h-0 min-w-0 rounded bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-white flex items-center justify-center border border-zinc-800 transition-colors cursor-pointer shrink-0"
						aria-label="Закрыть КЛКТ студию"
						data-testid="close-cbct-mpr-3d-studio-btn"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
		</header>
	);
};
