import React from "react";
import {
	Activity,
	CheckCircle2,
	ChevronDown,
	Download,
	FileText,
	Maximize2,
	Minimize2,
	Move,
	Ruler,
	Search,
	Sparkles,
	SplitSquareHorizontal,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import { RadiologyQuickFiltersPanel } from "../RadiologyQuickFiltersPanel.js";
import { RADIOLOGY_STANDARD_PROTOCOLS } from "../radiologyProtocols.js";
import { calculateLesionAreaGaussMm2 } from "../dentalViewerMath.js";
import type { SensorViewerState, SensorStudyViewerProps } from "./types.js";

export interface ViewerToolbarProps {
	readonly state: SensorViewerState;
	readonly props: SensorStudyViewerProps;
}

export const ViewerToolbar: React.FC<ViewerToolbarProps> = ({ state, props }) => {
	const {
		activeStudy,
		effectiveTooth,
		activeTool,
		setActiveTool,
		isFullscreen,
		setIsFullscreen,
		filters,
		setFilters,
		brightnessPct,
		contrastPct,
		handleResetFilters,
		isNormaApplied,
		handleInsertNorma,
		isProtocolsOpen,
		setIsProtocolsOpen,
		protocolsDropdownRef,
		handleApplyStandardProtocol,
		handleExportImage,
		isExporting,
		setShowConsultationSplit,
		handleClose,
		handleResetView,
		handleClearMeasurements,
		draftCurvedPoints,
		handleFinishCurvedCanal,
		draftLesionPoints,
		handleFinishLesionContour,
		measurements,
		curvedCanals,
		lesionContours,
		calibratedMmPerPx,
		isMobile,
	} = state;

	const { patientName, onClose } = props;

	const activePatientName =
		activeStudy && "patientName" in activeStudy && typeof activeStudy.patientName === "string"
			? activeStudy.patientName
			: patientName || "Пациент";
	const activeModalityLabel =
		activeStudy && "modalityLabel" in activeStudy && typeof activeStudy.modalityLabel === "string"
			? activeStudy.modalityLabel
			: "Прицельный снимок RVG";

	if (isFullscreen) {
		return null;
	}

	if (isMobile) {
		return (
			<div
				data-testid="sensor-viewer-mobile-top-bar"
				className="flex items-center justify-between px-3 py-2 bg-[var(--paper)] border-b border-[var(--line)] text-xs shrink-0 select-none"
				style={{ paddingTop: "max(8px, env(safe-area-inset-top, 8px))" }}
			>
				<div className="flex items-center gap-2 min-w-0">
					<span className="px-2 py-0.5 rounded font-black text-[10px] bg-[var(--teal,#0d9488)] text-white uppercase tracking-wider shrink-0">
						DENTE 2D
					</span>
					<div className="flex flex-col min-w-0">
						<span className="text-white font-semibold text-xs truncate">
							{activePatientName}
						</span>
						<span className="text-[10px] text-slate-400 truncate">
							{effectiveTooth ? `Зуб #${effectiveTooth} • ` : ""}{activeModalityLabel}
						</span>
					</div>
				</div>
				<div className="flex items-center gap-1.5 shrink-0">
					{/* 1-Click Norma button on mobile */}
					<button
						type="button"
						onClick={handleInsertNorma}
						className={`px-2 py-1 rounded font-bold text-[10px] border transition-all cursor-pointer flex items-center gap-1 ${
							isNormaApplied
								? "bg-[#10b981]/25 border-[#10b981] text-[#a7f3d0]"
								: "bg-[#064e3b] border-[#10b981] text-[#a7f3d0]"
						}`}
						title="Внести норму патологии в медицинскую карту"
					>
						{isNormaApplied ? <CheckCircle2 size={11} /> : <Zap size={11} className="text-[#34d399]" />}
						<span>Норма</span>
					</button>
					{/* Fullscreen toggle */}
					<button
						type="button"
						onClick={() => setIsFullscreen((prev) => !prev)}
						className="p-1.5 rounded bg-[var(--paper-soft)] text-slate-300 border border-[var(--line)] cursor-pointer"
						title="Полноэкранный режим"
					>
						{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
					</button>
					{/* Close button */}
					{onClose && (
						<button
							type="button"
							onClick={handleClose}
							className="p-1.5 rounded bg-transparent text-slate-400 hover:text-white border border-[var(--line)] cursor-pointer"
							title="Закрыть"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div
			data-testid="sensor-viewer-top-toolbar"
			className="flex items-center justify-between px-3 py-1 bg-[var(--paper)] border-b border-[var(--line)] text-xs h-9 min-h-[34px] max-h-[36px] shrink-0"
		>
			{/* Left: Brand Badge & Interactive Tools */}
			<div className="flex items-center gap-2">
				<span className="px-2 py-0.5 rounded font-black text-[11px] bg-[var(--teal,#0d9488)] text-white uppercase tracking-wider">
					DENTE 2D
				</span>

				{/* Tool Toggle: Pan / Ruler / Curved Canal / Loupe */}
				<div
					className="dente-segmented-bar bg-[var(--paper-soft)] border-[var(--line)]"
					style={{ background: "var(--paper-soft)", borderColor: "var(--line)" }}
					data-testid="sensor-tools-segmented-bar"
				>
					<button
						type="button"
						onClick={() => setActiveTool("pan")}
						className={`dente-segmented-item ${activeTool === "pan" ? "active" : ""}`}
						data-testid="btn-tool-pan"
						title="Панорамирование (Рука)"
					>
						<Move size={12} />
						<span>Рука</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTool("ruler")}
						className={`dente-segmented-item ${activeTool === "ruler" ? "active" : ""}`}
						data-testid="btn-tool-ruler"
						title="Измерительная калибровочная линейка"
					>
						<Ruler size={12} />
						<span>Линейка</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTool("curved_canal")}
						className={`dente-segmented-item ${activeTool === "curved_canal" ? "active" : ""}`}
						data-testid="btn-tool-curved-canal"
						title="Эндо-линейка искривленных каналов (Working Length / Апекс)"
					>
						<Activity size={12} />
						<span>Канал (WL)</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTool("magnifier")}
						className={`dente-segmented-item ${activeTool === "magnifier" ? "active" : ""}`}
						data-testid="btn-tool-magnifier"
						title="Интерактивная 2.5x лупа для поиска микротрещин и апексов"
					>
						<Search size={12} />
						<span>Лупа 2.5x</span>
					</button>
					<button
						type="button"
						onClick={() => setActiveTool("lesion_contour")}
						className={`dente-segmented-item ${activeTool === "lesion_contour" ? "active" : ""}`}
						data-testid="btn-tool-lesion"
						title="Контур периапикального очага / кисты (площадь по формуле Гаусса в мм²)"
					>
						<Sparkles size={12} />
						<span>Очаг (мм²)</span>
					</button>
				</div>

				{/* Curved Canal in progress confirmation button */}
				{activeTool === "curved_canal" && draftCurvedPoints.length >= 2 && (
					<button
						type="button"
						onClick={handleFinishCurvedCanal}
						className="h-8 px-2.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-medium cursor-pointer transition-colors"
						title="Зафиксировать рабочую длину канала (WL)"
						data-testid="btn-finish-canal"
					>
						Готово ({draftCurvedPoints.length} тчк)
					</button>
				)}

				{/* Lesion contour in progress confirmation button */}
				{activeTool === "lesion_contour" && draftLesionPoints.length >= 3 && (
					<button
						type="button"
						onClick={handleFinishLesionContour}
						className="h-8 px-2.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-black text-xs font-medium cursor-pointer transition-colors"
						title="Зафиксировать площадь очага деструкции (мм²)"
						data-testid="btn-finish-lesion"
					>
						Готово ({draftLesionPoints.length} тчк, {calculateLesionAreaGaussMm2(draftLesionPoints, calibratedMmPerPx).toFixed(1)} мм²)
					</button>
				)}

				{/* Clear measurements if any */}
				{(measurements.length > 0 || curvedCanals.length > 0 || lesionContours.length > 0) && (
					<button
						type="button"
						onClick={handleClearMeasurements}
						className="h-8 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-slate-400 hover:text-red-400 hover:border-red-400/50 cursor-pointer transition-colors flex items-center justify-center"
						title="Очистить все линейки и каналы"
						data-testid="btn-clear-measurements"
					>
						<Trash2 size={12} />
					</button>
				)}

				{/* Reset Zoom/Pan */}
				<button
					type="button"
					onClick={handleResetView}
					className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-slate-200 hover:text-white text-xs font-medium cursor-pointer transition-colors shadow-2xs"
					title="Сбросить масштаб и положение (0)"
					data-testid="btn-reset-view"
				>
					1:1 / Центр
				</button>
			</div>

			{/* Center: Horizontal 1-Click Filters Toggles */}
			<RadiologyQuickFiltersPanel
				filterState={filters}
				onFilterChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
				onReset={handleResetFilters}
				orientation="horizontal"
				brightnessPct={brightnessPct}
				contrastPct={contrastPct}
			/>

			{/* Right: 1-Click Norma, Protocols, Fullscreen & Close */}
			<div className="flex items-center gap-2">
				{/* 1-Click Norma Button */}
				<button
					type="button"
					onClick={handleInsertNorma}
					className={`h-8 px-2.5 rounded-lg font-medium text-xs border transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
						isNormaApplied
							? "bg-[#10b981]/25 border-[#10b981] text-[#a7f3d0]"
							: "bg-[#064e3b] border-[#10b981] text-[#a7f3d0] hover:bg-[#047857]"
					}`}
					data-testid="btn-sensor-norma"
					title="Внести заключение о норме в медицинскую карту"
				>
					{isNormaApplied ? <CheckCircle2 size={12} /> : <Zap size={12} className="text-[#34d399]" />}
					<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
				</button>

				{/* Standard Protocols Dropdown */}
				<div className="relative" ref={protocolsDropdownRef}>
					<button
						type="button"
						onClick={() => setIsProtocolsOpen((prev) => !prev)}
						className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-sensor-protocols"
					>
						<FileText size={12} className="text-[#2dd4bf]" />
						<span>Протоколы</span>
						<ChevronDown size={11} />
					</button>

					{isProtocolsOpen && (
						<div
							style={{
								position: "absolute",
								top: "100%",
								right: 0,
								marginTop: "4px",
								minWidth: "260px",
								backgroundColor: "var(--paper-soft)",
								border: "1px solid var(--line)",
								borderRadius: "6px",
								boxShadow: "0 10px 25px rgba(0,0,0,0.7)",
								zIndex: 10000,
								padding: "4px",
							}}
						>
							{RADIOLOGY_STANDARD_PROTOCOLS.map((preset) => (
								<button
									key={preset.id}
									type="button"
									onClick={() => handleApplyStandardProtocol(preset)}
									className="w-full text-left px-2.5 py-1.5 rounded text-[11px] text-slate-200 hover:bg-[#134e4a] hover:text-[#5eead4] cursor-pointer"
								>
									{preset.titleRu}
								</button>
							))}
						</div>
					)}
				</div>

				{/* 1-Click High-Res PNG Export with 5 mm Scale */}
				<button
					type="button"
					onClick={handleExportImage}
					disabled={isExporting}
					className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
					data-testid="btn-sensor-export-png"
					title="Экспортировать снимок с калибровочной шкалой 5 мм и метаданными клиники (PNG)"
				>
					<Download size={12} className="text-[var(--teal,#0d9488)]" />
					<span>{isExporting ? "Экспорт..." : "Экспорт"}</span>
				</button>

				{/* Consultation Split Mode Button */}
				<button
					type="button"
					onClick={() => setShowConsultationSplit(true)}
					className="h-8 px-2.5 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] border border-[var(--line)] text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
					data-testid="btn-sensor-open-consultation"
					title="Перейти в режим сплит-консультации и библиотеки 8 дисциплин"
				>
					<SplitSquareHorizontal size={12} className="text-[var(--teal,#0d9488)]" />
					<span>Консультация</span>
				</button>

				{/* Fullscreen Button */}
				<button
					type="button"
					onClick={() => setIsFullscreen((prev) => !prev)}
					className="h-8 w-8 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--line)] text-slate-300 border border-[var(--line)] cursor-pointer flex items-center justify-center"
					title={isFullscreen ? "Выйти из полного экрана (F / Esc)" : "Полноэкранный режим (F)"}
					data-testid="btn-sensor-fullscreen"
				>
					{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
				</button>

				{/* Close Button */}
				{onClose && (
					<button
						type="button"
						onClick={handleClose}
						className="h-8 w-8 rounded-lg bg-transparent hover:bg-[var(--paper-soft)] text-slate-400 hover:text-white border border-[var(--line)] cursor-pointer flex items-center justify-center"
						title="Закрыть просмотрщик (Esc)"
						data-testid="btn-sensor-close"
					>
						<X size={14} />
					</button>
				)}
			</div>
		</div>
	);
};
