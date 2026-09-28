import React from "react";
import {
	Activity,
	Box,
	Camera,
	CircleDot,
	Columns2,
	Columns3,
	FileText,
	Grid2X2,
	Maximize2,
	Minimize2,
	MoreHorizontal,
	RotateCcw,
	Ruler,
	Search,
	Sliders,
	Spline,
	Receipt,
	X,
} from "lucide-react";
import { CBCT_HOUNSFIELD_PRESETS, type CbctVoxelVolume, type CbctViewportType } from "../cbctMprMath";
import type { StudioMode, ViewLayoutMode } from "./cbctStudioTypes";

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
}) => {
	return (
		<header
			className="h-9 min-h-[36px] px-2 sm:px-3 py-0.5 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0 gap-1.5 sm:gap-2 text-zinc-100 min-w-0 w-full max-w-full relative"
		>
			{/* Left: 3D Cube Icon + Title + Quiet Study Status */}
			<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
				<div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
					<Box className="w-3.5 h-3.5" />
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
						className="text-[10px] text-zinc-400 truncate leading-none min-w-0 max-w-[110px] sm:max-w-[200px] lg:max-w-[320px]"
						data-testid="cbct-patient-metadata-badge"
						id="cbct-patient-metadata-badge"
						title={`${patientDisplayName || resolvedPatientName} • ${loadedSliceCount > 0 ? `${loadedSliceCount} срезов` : "Исследование не загружено"} • ${volume ? `${volume.spacingMm.x.toFixed(1)} мм` : "—"}`}
					>
						{patientDisplayName || resolvedPatientName}
					</p>
				</div>
			</div>

			{/* Center: 4 Clean Workspace Modes (Romexis Segmented Switcher) */}
			<div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 shrink-0 gap-0.5">
				<button
					type="button"
					onClick={() => handleSelectStudioMode("diagnostic")}
					className={`px-2 sm:px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap h-7 min-h-0 flex items-center gap-1 transition-colors ${
						studioMode === "diagnostic"
							? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 shadow-xs"
							: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
					}`}
					data-testid="cbct-mode-diagnostic-btn"
					title="Режим общей 3D диагностики (панель свернута)"
				>
					<Search className="w-3.5 h-3.5 text-cyan-400" />
					<span className="hidden md:inline">Диагностика</span>
				</button>
				<button
					type="button"
					onClick={() => handleSelectStudioMode("implant")}
					className={`px-2 sm:px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap h-7 min-h-0 flex items-center gap-1 transition-colors ${
						studioMode === "implant"
							? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 shadow-xs"
							: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
					}`}
					data-testid="cbct-mode-implant-btn"
					title="Планирование имплантации и контроль нерва"
				>
					<CircleDot className="w-3.5 h-3.5 text-amber-400" />
					<span className="hidden md:inline">Имплантация</span>
				</button>
				<button
					type="button"
					onClick={() => handleSelectStudioMode("endo")}
					className={`px-1.5 sm:px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap h-7 min-h-0 flex items-center gap-1 transition-colors ${
						studioMode === "endo"
							? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 shadow-xs"
							: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
					}`}
					data-testid="cbct-mode-endo-btn"
					title="Эндодонтия: корневые каналы и апексы"
				>
					<Activity className="w-3.5 h-3.5 text-cyan-400" />
					<span className="hidden md:inline">Эндо</span>
				</button>
				<button
					type="button"
					onClick={() => handleSelectStudioMode("tmj")}
					className={`px-1.5 sm:px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap h-7 min-h-0 flex items-center gap-1 transition-colors ${
						studioMode === "tmj"
							? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 shadow-xs"
							: "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
					}`}
					data-testid="cbct-mode-tmj-btn"
					title="ВНЧС: суставные головки и ямки"
				>
					<Ruler className="w-3.5 h-3.5 text-cyan-400" />
					<span className="hidden md:inline">ВНЧС</span>
				</button>
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
								<Spline className="w-3.5 h-3.5 text-purple-400 shrink-0" />
								<span>{showDentalArch ? "Скрыть дугу ОПТГ" : "Показать дугу ОПТГ"}</span>
							</button>

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
