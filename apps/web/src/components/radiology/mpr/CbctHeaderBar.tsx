import { Camera, Columns2, Columns3, ExternalLink, FileText, Grid2X2, Maximize2, Minimize2, MoreHorizontal, Receipt, RotateCcw, Ruler, Sliders, SplitSquareHorizontal, X } from "lucide-react";
import React from "react";
import { BoneDensityMisch, DentalArticulator, DentalImplant, DentalLabOrder, DentalPanoramicArch, DicomCube3D, EndoFileCanal } from "../../icons/DentalIcons";
import {
	CBCT_HOUNSFIELD_PRESETS,
	type CbctViewportType,
	type CbctVoxelVolume,
	CLINICAL_RADIOLOGY_PRESETS,
	type ClinicalRadiologyPreset,
	type SlabProjectionMode,
} from "../cbctMprMath";
import { CbctContrastPopover } from "./CbctContrastPopover";
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
	readonly handleExportToPlan?: (() => void) | undefined;
	readonly handleExportToLab?: (() => void) | undefined;
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
	readonly setShowEdgeRulers?:
		| React.Dispatch<React.SetStateAction<boolean>>
		| undefined;
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
	readonly panoThicknessMm?: number | undefined;
	readonly onChangePanoThicknessMm?: ((th: number) => void) | undefined;
	readonly onSelectClinicalPreset?: ((presetId: string) => void) | undefined;
	readonly onCopySnapshotToClipboard?: (() => void) | undefined;
	readonly onOpenComparisonSplit?: (() => void) | undefined;
	readonly onOpenPopoutWindow?: (() => void) | undefined;
	readonly isStandaloneWindow?: boolean | undefined;
	readonly studyId?: string | undefined;
	readonly patientId?: string | undefined;
}

export const CbctHeaderBar: React.FC<CbctHeaderBarProps> = (props) => {
	const {
		modalId,
		patientDisplayName,
		resolvedPatientName,
		loadedSliceCount,
		volume,
		studioMode,
		handleSelectStudioMode,
		handleExportToEmr,
		handleExportCbctToFinance,
		handleExportToPlan,
		handleExportToLab,
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
		windowWidth = 4025,
		onChangeWindowWidth,
		windowLevel = 525,
		onChangeWindowLevel,
		slabThicknessMm = 1.0,
		onChangeSlabThicknessMm,
		slabMode = "single",
		onChangeSlabMode,
		panoThicknessMm = 1.0,
		onChangePanoThicknessMm,
		onSelectClinicalPreset,
		onCopySnapshotToClipboard,
		onOpenComparisonSplit,
		onOpenPopoutWindow,
		isStandaloneWindow = false,
		studyId,
		patientId,
	} = props;

	const contrastMenuRef = React.useRef<HTMLDivElement | null>(null);
	const [isContrastMenuOpen, setIsContrastMenuOpen] =
		React.useState<boolean>(false);

	React.useEffect(() => {
		if (!isContrastMenuOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (
				contrastMenuRef.current &&
				!contrastMenuRef.current.contains(e.target as Node)
			) {
				setIsContrastMenuOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isContrastMenuOpen]);

	return (
		<header
			data-testid="cbct-header-bar"
			className="h-10 min-h-[40px] px-2 sm:px-3 py-1 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between shrink-0 gap-1.5 sm:gap-2 text-zinc-300 min-w-0 w-full max-w-full relative z-30"
		>
			{/* Left: 3D Dicom Cube Icon + Title + Quiet Study Status */}
			<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 shrink-0">
				<div className="w-7 h-7 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 shrink-0 shadow-inner">
					<DicomCube3D className="w-4 h-4 text-cyan-400" />
				</div>
				<div className="flex flex-col min-w-0 justify-center">
					<h2 id={`cbct-studio-title-${modalId}`} className="sr-only">
						КЛКТ
					</h2>
					<div className="flex items-center gap-1.5 min-w-0">
						<p
							className="text-xs font-semibold text-zinc-300 truncate leading-none min-w-0 max-w-[120px] sm:max-w-[180px] lg:max-w-[220px]"
							data-testid="cbct-patient-metadata-badge"
							id="cbct-patient-metadata-badge"
							title={`${patientDisplayName || resolvedPatientName} • ${loadedSliceCount > 0 ? `${loadedSliceCount} срезов` : "Исследование не загружено"} • ${volume ? `${volume.spacingMm.x.toFixed(1)} мм` : "—"}`}
						>
							{patientDisplayName || resolvedPatientName}
						</p>
						<span className="text-[10px] text-zinc-500 font-mono leading-none shrink-0 hidden sm:inline">
							• {loadedSliceCount > 0 ? `${loadedSliceCount} ср.` : "0 ср."}
						</span>
					</div>
				</div>
			</div>

			{/* Center: Clinical Radiology PACS Workspaces + Physical Unsharp Masking */}
			<div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
				{/* 1. Табы верхнего бара: уменьшенный шрифт text-[11px] font-medium, мягкий серый тон text-zinc-400 / text-zinc-200 */}
				<nav
					aria-label="Рабочие области КЛКТ"
					role="tablist"
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
								role="tab"
								onClick={() => handleSelectStudioMode(tab.studioMode)}
								className={`px-2 sm:px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-colors cursor-pointer border ${
									isSelected
										? "bg-zinc-800/90 text-zinc-200 border-zinc-700/80 shadow-xs"
										: "bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
								}`}
								data-testid={tab.testId}
								data-mode-testid={tab.modeTestId}
								title={tab.description}
								aria-selected={isSelected}
							>
								<IconComponent
									className={`w-3.5 h-3.5 shrink-0 transition-colors ${isSelected ? tab.activeColorClass : "text-zinc-400"}`}
								/>
								<span className="hidden md:inline leading-none">
									{tab.label}
								</span>
								<span className="md:hidden leading-none">{tab.shortLabel}</span>
							</button>
						);
					})}
				</nav>

				{/* 2. Кнопка «Резкость» (Unsharp Masking): текст приглушен text-zinc-400 / text-zinc-300 */}
				{onToggleUnsharp && (
					<button
						type="button"
						onClick={onToggleUnsharp}
						className={`px-2 sm:px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
							isUnsharpActive
								? "bg-amber-950/40 text-amber-300 border-amber-600/60 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
								: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-850"
						}`}
						data-testid="cbct-unsharp-toggle-btn"
						id="cbct-header-unsharp-mask-btn"
						title="Контурная резкость трабекул (Unsharp Masking, горячая клавиша 'U')"
						aria-pressed={isUnsharpActive}
					>
						<BoneDensityMisch
							className={`w-3.5 h-3.5 shrink-0 ${isUnsharpActive ? "text-amber-400" : "text-zinc-400"}`}
						/>
						<span className="hidden 2xl:inline">Резкость</span>
						<span
							className={`text-[9px] font-mono px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
								isUnsharpActive
									? "bg-amber-500/20 text-amber-300/90 border border-amber-500/30"
									: "bg-zinc-800 text-zinc-500 border border-zinc-700/80"
							}`}
							data-testid="cbct-unsharp-hud-badge"
						>
							{isUnsharpActive ? "SHARP" : "RAW"}
						</span>
					</button>
				)}

				{/* 3. Кнопка «Контраст»: без слепящего белого, приглушенный серый text-zinc-400 hover:text-zinc-200 */}
				<div className="relative" ref={contrastMenuRef}>
					<button
						type="button"
						onClick={() => setIsContrastMenuOpen((prev) => !prev)}
						className={`px-2 sm:px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1.5 transition-all cursor-pointer border ${
							isContrastMenuOpen
								? "bg-cyan-950/60 text-cyan-300 border-cyan-500/70 shadow-[0_0_8px_rgba(6,182,212,0.3)] font-semibold"
								: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-850"
						}`}
						data-testid="cbct-contrast-controls-btn"
						id="cbct-header-contrast-controls-btn"
						title="Настройка яркости, контраста (W/L), толщины среза и пресетов КЛКТ"
						aria-expanded={isContrastMenuOpen}
					>
						<Sliders className="w-3.5 h-3.5 text-teal-400 shrink-0" />
						<span className="hidden 2xl:inline text-zinc-400">Контраст:</span>
						<span className="font-mono text-[10px] font-semibold text-zinc-200">
							W:{windowWidth}/L:{windowLevel}
						</span>
						<span className="hidden 2xl:inline-block text-[10px] text-zinc-500 font-mono">
							• {slabThicknessMm} мм
						</span>
					</button>

					<CbctContrastPopover
						isOpen={isContrastMenuOpen}
						activePresetId={activePresetId}
						onSelectClinicalPreset={onSelectClinicalPreset}
						windowWidth={windowWidth}
						onChangeWindowWidth={onChangeWindowWidth}
						windowLevel={windowLevel}
						onChangeWindowLevel={onChangeWindowLevel}
						slabThicknessMm={slabThicknessMm}
						onChangeSlabThicknessMm={onChangeSlabThicknessMm}
						slabMode={slabMode}
						onChangeSlabMode={onChangeSlabMode}
						panoThicknessMm={panoThicknessMm}
						onChangePanoThicknessMm={onChangePanoThicknessMm}
					/>
				</div>
			</div>

			{/* Right: Primary Clinical Actions (В ЭМК, В буфер, Смета, Панель, Опции) */}
			<div className="flex items-center gap-1 shrink-0">
				{/* Кнопка «В ЭМК»: темный благородный медицинский стиль */}
				<button
					type="button"
					onClick={handleExportToEmr}
					className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1 bg-teal-950/60 hover:bg-teal-900/80 text-teal-300 hover:text-teal-200 border border-teal-500/50 shadow-xs transition-colors cursor-pointer shrink-0"
					data-testid="cbct-btn-export-emr"
					title="Сохранить снимок и протокол планирования в медицинскую карту"
				>
					<Camera className="w-3.5 h-3.5 shrink-0" />
					<span className="hidden sm:inline">В ЭМК</span>
				</button>

				{/* Кнопка «В буфер»: приглушенный серый */}
				<button
					type="button"
					onClick={() => {
						if (onCopySnapshotToClipboard) onCopySnapshotToClipboard();
						else
							window.dispatchEvent(new CustomEvent("dente:copy-cbct-snapshot"));
					}}
					className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-200 border border-zinc-800 hover:border-teal-500/40 shadow-xs transition-all cursor-pointer shrink-0"
					data-testid="cbct-btn-copy-clipboard"
					id="cbct-btn-copy-clipboard"
					title="Копировать текущий снимок в буфер обмена (Ctrl+C)"
				>
					<Camera className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
					<span className="hidden xl:inline">Буфер</span>
				</button>

				{/* 3. Кнопка «+ Смета»: монохром с деликатным акцентом */}
				{handleExportCbctToFinance && (
					<button
						type="button"
						onClick={handleExportCbctToFinance}
						className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-200 border border-zinc-800 hover:border-teal-500/50 shadow-xs transition-colors cursor-pointer shrink-0"
						data-testid="cbct-header-add-finance-btn"
						title="Добавить операцию имплантации, костную пластику и КЛКТ в финансовый наряд визита"
					>
						<Receipt className="w-3.5 h-3.5 text-teal-400 shrink-0" />
						<span className="hidden 2xl:inline">+ КЛКТ и имплант в смету</span>
						<span className="inline 2xl:hidden">+ Смета</span>
					</button>
				)}

				{/* 4. Кнопка «В план лечения» */}
				{handleExportToPlan && (
					<button
						type="button"
						onClick={handleExportToPlan}
						className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-200 border border-zinc-800 hover:border-teal-500/50 shadow-xs transition-colors cursor-pointer shrink-0"
						data-testid="cbct-btn-export-plan"
						id="cbct-btn-export-plan"
						title="Добавить хирургический этап имплантации со срезом КЛКТ в план лечения"
					>
						<FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
						<span className="hidden 2xl:inline">В план лечения</span>
						<span className="hidden xl:inline 2xl:hidden">В план</span>
					</button>
				)}

				{/* 5. Кнопка «В ЗТЛ» (Лаборатория) */}
				{handleExportToLab && (
					<button
						type="button"
						onClick={handleExportToLab}
						className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-200 border border-zinc-800 hover:border-teal-500/50 shadow-xs transition-colors cursor-pointer shrink-0"
						data-testid="cbct-btn-export-lab"
						id="cbct-btn-export-lab"
						title="Сформировать заказ-наряд ЗТЛ на хирургический шаблон с параметрами имплантата и срезом КЛКТ"
					>
						<DentalLabOrder className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
						<span className="hidden 2xl:inline">В лабораторию (ЗТЛ)</span>
						<span className="hidden xl:inline 2xl:hidden">В ЗТЛ</span>
					</button>
				)}

				{/* Кнопка «Панель»: приглушенный серый */}
				<button
					type="button"
					onClick={() => setIsSidebarOpen((prev) => !prev)}
					className={`px-1.5 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1 transition-colors border shadow-xs shrink-0 ${
						isSidebarOpen
							? "bg-zinc-900 text-teal-300 border-teal-500/60"
							: "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-900"
					}`}
					title={
						isSidebarOpen ? "Скрыть боковую панель" : "Показать боковую панель"
					}
					data-testid="cbct-toggle-sidebar-btn"
				>
					<Columns2 className="w-3.5 h-3.5 shrink-0" />
					<span className="hidden 2xl:inline">Панель</span>
				</button>

				{/* Кнопка «Опции» и меню дополнительных действий */}
				<div className="relative shrink-0" ref={studioMenuRef}>
					<button
						type="button"
						onClick={() => setIsStudioMenuOpen((prev) => !prev)}
						className={`px-1.5 py-1 rounded text-xs font-medium whitespace-nowrap h-7 min-h-0 flex items-center gap-1 border transition-colors cursor-pointer ${
							isStudioMenuOpen
								? "bg-zinc-900 text-teal-300 border-teal-500/60"
								: "bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border-zinc-800"
						}`}
						data-testid="cbct-more-options-btn"
						title="Дополнительные операции (Сброс, дуга, PDF, раскладка)"
						aria-haspopup="true"
						aria-expanded={isStudioMenuOpen}
					>
						<MoreHorizontal className="w-3.5 h-3.5" />
						<span className="hidden 2xl:inline">Опции</span>
					</button>

					{isStudioMenuOpen && (
						<div
							className="absolute right-0 top-full mt-1.5 w-60 bg-zinc-900/98 border border-zinc-700/90 rounded-lg shadow-2xl p-1.5 z-50 flex flex-col gap-1 backdrop-blur-md"
							data-testid="cbct-more-options-popover"
						>
							{/* Сброс вида */}
							<button
								type="button"
								onClick={() => {
									handleResetAll();
									setIsStudioMenuOpen(false);
								}}
								className="w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 text-amber-300/90 hover:text-amber-200 hover:bg-zinc-800 transition-colors cursor-pointer"
								data-testid="cbct-btn-reset-view"
								title="Сбросить масштаб (100%), панораму (центр), наклон осей (0°) и контраст"
							>
								<RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0" />
								<span>Сброс вида</span>
							</button>

							{/* Автодуга зубов */}
							<button
								type="button"
								onClick={() => {
									handleAutoDetectArch();
									setIsStudioMenuOpen(false);
								}}
								className="w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 text-purple-300/90 hover:text-purple-200 hover:bg-zinc-800 transition-colors cursor-pointer"
								data-testid="cbct-btn-auto-arch"
								title="Сгенерировать дугу автоматически по плотности эмали и кортикального гребня"
							>
								<Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
								<span>Автодуга зубов</span>
							</button>

							{/* Показать / скрыть анатомическую дугу ОПТГ */}
							<button
								type="button"
								onClick={() => {
									setShowDentalArch((prev) => {
										const next = !prev;
										if (next && studioMode !== "panoramic")
											handleSelectStudioMode("panoramic");
										return next;
									});
									setIsStudioMenuOpen(false);
								}}
								className={`w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer ${showDentalArch ? "text-purple-300 bg-purple-950/40 hover:bg-purple-950/60" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`}
								data-testid="cbct-toggle-dental-arch"
								title="Показать / скрыть анатомическую дугу ОПТГ"
							>
								<DentalPanoramicArch className="w-3.5 h-3.5 text-purple-400 shrink-0" />
								<span>{showDentalArch ? "Скрыть дугу ОПТГ" : "Показать дугу ОПТГ"}</span>
							</button>

							{/* Краевые миллиметровые линейки */}
							{setShowEdgeRulers && (
								<button
									type="button"
									onClick={() => { setShowEdgeRulers((prev) => !prev); setIsStudioMenuOpen(false); }}
									className={`w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer ${showEdgeRulers ? "text-cyan-300 bg-cyan-950/40 hover:bg-cyan-950/60" : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"}`}
									data-testid="cbct-toggle-edge-rulers"
									title="Показать / скрыть краевые миллиметровые линейки по периметру окон"
								>
									<Ruler className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
									<span>{showEdgeRulers ? "Скрыть краевые линейки" : "Показать краевые линейки"}</span>
								</button>
							)}

							{/* Печатный A4 PDF протокол */}
							<button
								type="button"
								onClick={() => { handleExportPdfReport(); setIsStudioMenuOpen(false); }}
								className="w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 text-amber-300/90 hover:text-amber-200 hover:bg-zinc-800 transition-colors cursor-pointer"
								data-testid="cbct-btn-export-pdf"
								title="Сформировать печатный A4 протокол планирования / PDF"
							>
								<FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
								<span>Печатный PDF протокол</span>
							</button>

							{/* Копировать снимок в буфер */}
							<button
								type="button"
								onClick={() => {
									if (onCopySnapshotToClipboard) onCopySnapshotToClipboard();
									else window.dispatchEvent(new CustomEvent("dente:copy-cbct-snapshot"));
									setIsStudioMenuOpen(false);
								}}
								className="w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 text-cyan-300/90 hover:text-cyan-200 hover:bg-zinc-800 transition-colors cursor-pointer"
								data-testid="cbct-menu-copy-clipboard"
								title="Копировать текущий кадр в буфер обмена (Ctrl+C)"
							>
								<Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
								<span>Копировать снимок (Ctrl+C)</span>
							</button>

							{/* Сравнение КТ исследований (До / После) — опционально Tier 3 */}
							{onOpenComparisonSplit && (
								<button
									type="button"
									onClick={() => { onOpenComparisonSplit(); setIsStudioMenuOpen(false); }}
									className="w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 text-emerald-300/90 hover:text-emerald-200 hover:bg-zinc-800 transition-colors cursor-pointer"
									data-testid="cbct-menu-open-comparison-split"
									title="Сравнение исследований (До/После) и динамика остеоинтеграции"
								>
									<SplitSquareHorizontal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
									<span>Сравнить динамику КТ (До/После)</span>
								</button>
							)}

							<div className="h-px bg-zinc-800 my-0.5" />

							{/* Раскладка окон */}
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
									className="w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 text-cyan-300 hover:bg-zinc-800 transition-colors cursor-pointer"
									data-testid="cbct-restore-grid-btn"
									title="Восстановить сетку окон (2x2)"
								>
									<Minimize2 className="w-3.5 h-3.5 shrink-0" />
									<span>Сетка окон 2x2</span>
								</button>
							) : (
								<div className="flex flex-col gap-0.5">
									{[
										{
											id: "mpr_3_view" as ViewLayoutMode,
											label: "3 проекции MPR (Axial, Coronal, Sagittal)",
											testId: "cbct-layout-3view-btn",
											Icon: Columns3,
										},
										{
											id: "quad_view" as ViewLayoutMode,
											label: "Сетка 4 окна (2x2)",
											testId: "cbct-layout-quad-btn",
											Icon: Grid2X2,
										},
										{
											id: "layout_1_plus_3" as ViewLayoutMode,
											label: "Раскладка 1+3 (Аксиал + MPR)",
											testId: "cbct-layout-1plus3-btn",
											Icon: Columns2,
										},
									].map(({ id, label, testId, Icon }) => (
										<button
											key={id}
											type="button"
											onClick={() => {
												setViewLayout(id);
												setIsStudioMenuOpen(false);
											}}
											className={`w-full px-2.5 py-1.5 rounded text-xs font-medium text-left flex items-center gap-2 transition-colors cursor-pointer ${
												viewLayout === id
													? "text-cyan-300 bg-cyan-950/30"
													: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
											}`}
											data-testid={testId}
										>
											<Icon className="w-3.5 h-3.5 shrink-0" />
											<span>{label}</span>
										</button>
									))}
								</div>
							)}

							{/* Клинические пресеты */}
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
											className={`w-full px-2 py-1 rounded text-xs font-medium text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
												isSelected
													? "text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 shadow-xs font-semibold"
													: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
											}`}
											data-testid={`cbct-header-clinical-preset-${pr.id}`}
											title={pr.descriptionRu}
										>
											<span className="truncate">{pr.label}</span>
											<span className="text-[10px] text-zinc-500 font-mono shrink-0">
												{pr.slabThicknessMm} мм • {pr.windowWidth}/
												{pr.windowLevel}
											</span>
										</button>
									);
								})}
							</div>

							{/* Пресеты контраста (HU) */}
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
													className={`w-full px-2 py-1 rounded text-xs font-medium text-left flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
														isSelected
															? "text-cyan-300 bg-cyan-950/40 border border-cyan-500/40 shadow-xs"
															: "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
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

							{/* Шаг кросс-секций */}
							{onChangeCrossSectionStepMm && (
								<>
									<div className="h-px bg-zinc-800 my-0.5" />
									<div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
										<span>Шаг кросс-секций</span>
										<span className="text-cyan-400 font-mono text-[10px]">
											{crossSectionStepMm ?? 1.5} мм
										</span>
									</div>
									<div className="grid grid-cols-3 gap-1 px-1">
										{[1.0, 1.5, 2.0].map((step) => {
											const isCur =
												Math.abs((crossSectionStepMm ?? 1.5) - step) < 0.05;
											return (
												<button
													key={step}
													type="button"
													onClick={() => {
														onChangeCrossSectionStepMm(step);
														setIsStudioMenuOpen(false);
													}}
													className={`py-1 px-1 rounded text-center text-xs font-medium font-mono border transition-colors cursor-pointer ${
														isCur
															? "bg-zinc-800 text-cyan-300 border-cyan-500/60 shadow-xs"
															: "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
													}`}
													data-testid={`cbct-step-btn-${step}`}
													title={
														step === 1.0
															? "Шаг 1.0 мм (Высокая точность)"
															: step === 1.5
																? "Шаг 1.5 мм (Стандарт)"
																: "Шаг 2.0 мм (Обзорный шаг)"
													}
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

				{/* Оконные кнопки: В окно / Развернуть / Закрыть */}
				<div className="flex items-center gap-1 pl-1 sm:pl-1.5 pr-0.5 border-l border-zinc-800 shrink-0">
					{/* В отдельное окно (на второй монитор) */}
					{!isStandaloneWindow && (
						<button
							type="button"
							onClick={async () => {
								if (onOpenPopoutWindow) {
									onOpenPopoutWindow();
								} else {
									const { routeOpenCbctPopout } = await import("../../../utils/runtimeRouter");
									const res = await routeOpenCbctPopout({
										...(studyId ? { studyId } : {}),
										...(patientId ? { patientId } : {}),
										patientName: patientDisplayName || resolvedPatientName,
										mode: studioMode,
									});
									if (!res.success && res.error === "popup_blocked") {
										const { showToast } = await import("../../GlobalToast");
										showToast("Разрешите всплывающие окна для вывода КТ на второй монитор", "warning");
									} else if (res.success) {
										onClose?.();
									}
								}
							}}
							className="w-7 h-7 min-h-0 min-w-0 rounded bg-zinc-950 hover:bg-zinc-900 text-cyan-400 hover:text-cyan-300 flex items-center justify-center border border-zinc-800 hover:border-cyan-500/60 shadow-xs transition-colors cursor-pointer shrink-0"
							title="В отдельное окно (на второй монитор)"
							aria-label="В отдельное окно"
							data-testid="cbct-popout-window-btn"
							id="cbct-popout-window-btn"
						>
							<ExternalLink className="w-3.5 h-3.5" />
						</button>
					)}

					{/* Полноэкранный режим */}
					<button
						type="button"
						onClick={handleToggleFullscreenModal}
						className={`w-7 h-7 min-h-0 min-w-0 rounded flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
							isFullscreen
								? "bg-zinc-900 text-cyan-300 border-cyan-500/60 shadow-xs"
								: "bg-zinc-950 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-zinc-800"
						}`}
						title={
							isFullscreen
								? "Свернуть из полноэкранного режима"
								: "Развернуть на весь экран"
						}
						aria-label="Полноэкранный режим"
						data-testid="cbct-modal-maximize-btn"
					>
						{isFullscreen ? (
							<Minimize2 className="w-3.5 h-3.5" />
						) : (
							<Maximize2 className="w-3.5 h-3.5" />
						)}
					</button>

					{/* Закрыть КЛКТ студию */}
					<button
						type="button"
						onClick={onClose}
						className="w-7 h-7 min-h-0 min-w-0 rounded bg-zinc-950 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 flex items-center justify-center border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer shrink-0"
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
