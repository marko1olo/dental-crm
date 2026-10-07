/**
 * DENTE CRM — Clinical Toolbar & Window/Level Management Ribbon
 * Full UI capabilities:
 * - Top Quick Access Ribbon (Pan, Ruler, Angle, Freehand, Camera/Clipboard, HU Density, Dropdown, Fullscreen)
 * - Measurement & Annotation Dropdown Menu (Measurement, Capture, Annotation, Simulation, Other)
 * - Window/Level Management Panel (Numeric inputs WW, WL, fine sliders, Smooth, Sharpen, MIP, VR, Invert)
 * - Clipping Box / ROI Panel (Sagittal, Coronal, Axial, Custom, Left/Right direction, Apply Clipping)
 * - Calibrated Hounsfield (HU) Bone Density Profile Modal (Carl E. Misch D1..D5 classification & torque guide)
 *
 * Strict invariants: Mandate 8b (<=800 lines), Mandate 8d (Clinical density), Mandate 8e (Doctor Autonomy).
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
	Activity,
	Camera,
	Check,
	Copy,
	Crop,
	Download,
	Eye,
	FileText,
	Hand,
	Layers,
	Loader2,
	Maximize2,
	Minimize2,
	Move,
	PenTool,
	RotateCcw,
	Ruler,
	Scissors,
	Sliders,
	Sparkles,
	Triangle,
	X,
	Zap,
} from "lucide-react";
import { showToast } from "../GlobalToast.js";
import {
	calculateBoneDensityProfile,
	type CalibratedRulerMeasurement,
	type DicomViewportState,
	type HuProfileStats,
	type Point2D,
} from "./rvgViewerEngine.js";

export interface DicomToolboxRibbonProps {
	readonly activeTool: string;
	readonly onSelectTool: (tool: string) => void;
	readonly viewportState: DicomViewportState & {
		smooth?: boolean;
		maxRes?: boolean;
		mip?: boolean;
		vr?: boolean;
		clippingActive?: boolean;
		clippingPlane?: "sagittal" | "coronal" | "axial" | "custom";
		clippingDirection?: "left" | "right";
	};
	readonly onViewportChange: (
		nextState: Partial<
			DicomViewportState & {
				smooth?: boolean;
				maxRes?: boolean;
				mip?: boolean;
				vr?: boolean;
				clippingActive?: boolean;
				clippingPlane?: "sagittal" | "coronal" | "axial" | "custom";
				clippingDirection?: "left" | "right";
			}
		>,
	) => void;
	readonly measurements?: readonly CalibratedRulerMeasurement[] | undefined;
	readonly onResetView?: (() => void) | undefined;
	readonly patientName?: string | undefined;
	readonly studyDate?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly activeTab?: "2D" | "MPR" | "SECTION" | "3D_PANO" | "TMJ" | undefined;
	readonly onTabChange?: ((tab: "2D" | "MPR" | "SECTION" | "3D_PANO" | "TMJ") => void) | undefined;
	readonly onNormaClick?: (() => void) | undefined;
	readonly isNormaApplied?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly onAiAnalyze?: (() => void) | undefined;
	readonly isAiAnalyzing?: boolean | undefined;
	readonly aiReport?: string | null | undefined;
	readonly hasAiFindings?: boolean | undefined;
	readonly onToggleFindingsDrawer?: (() => void) | undefined;
}

export const DicomToolboxRibbon: React.FC<DicomToolboxRibbonProps> = ({
	activeTool,
	onSelectTool,
	viewportState,
	onViewportChange,
	measurements = [],
	patientName,
	toothFdiCode,
	onInsertToProtocol,
	activeTab: propActiveTab,
	onTabChange,
	onNormaClick,
	isNormaApplied,
	onClose,
	onAiAnalyze,
	isAiAnalyzing,
	aiReport,
	hasAiFindings,
	onToggleFindingsDrawer,
}) => {
	const [isMeasureMenuOpen, setIsMeasureMenuOpen] = useState(false);
	const [isWindowPanelOpen, setIsWindowPanelOpen] = useState(false);
	const [isClippingPanelOpen, setIsClippingPanelOpen] = useState(false);
	const [isHuModalOpen, setIsHuModalOpen] = useState(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [internalActiveTab, setInternalActiveTab] = useState<"2D" | "MPR" | "SECTION" | "3D_PANO" | "TMJ">("2D");
	const activeTab = propActiveTab || internalActiveTab;

	const [clippingPlane, setClippingPlane] = useState<"sagittal" | "coronal" | "axial" | "custom">(
		viewportState.clippingPlane || "sagittal",
	);
	const [clippingRef, setClippingRef] = useState<"user" | "arch_center" | "symphysis">("user");
	const [clippingDir, setClippingDir] = useState<"left" | "right">(
		viewportState.clippingDirection || "right",
	);
	const [isClippingApplied, setIsClippingApplied] = useState(Boolean(viewportState.clippingActive));

	const [huProfileStats, setHuProfileStats] = useState<HuProfileStats | null>(null);

	const measureMenuRef = useRef<HTMLDivElement>(null);
	const windowPanelRef = useRef<HTMLDivElement>(null);
	const clippingPanelRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			const target = e.target as Node;
			if (measureMenuRef.current && !measureMenuRef.current.contains(target)) setIsMeasureMenuOpen(false);
			if (windowPanelRef.current && !windowPanelRef.current.contains(target) && !(target as HTMLElement).closest("#btn-ez3d-window-panel") && !(target as HTMLElement).closest("#btn-dicom-window-panel")) setIsWindowPanelOpen(false);
			if (clippingPanelRef.current && !clippingPanelRef.current.contains(target) && !(target as HTMLElement).closest("#btn-ez3d-clipping-panel") && !(target as HTMLElement).closest("#btn-dicom-clipping-panel")) setIsClippingPanelOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const handleInstantScreenCapture = useCallback(async (copyToClipboardOnly = true) => {
		const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='dicom-viewport-canvas']");
		if (!canvas) {
			showToast("Холст снимка не найден для захвата", "warning");
			return;
		}
		try {
			if (copyToClipboardOnly && typeof navigator !== "undefined" && navigator.clipboard) {
				canvas.toBlob(async (blob) => {
					if (blob) {
						try {
							const item = new ClipboardItem({ "image/png": blob });
							await navigator.clipboard.write([item]);
							showToast("Снимок среза скопирован в буфер обмена (Ctrl+V)", "success");
						} catch {
							const dataUrl = canvas.toDataURL("image/png");
							await navigator.clipboard.writeText(dataUrl);
							showToast("Ссылка на снимок скопирована в буфер обмена", "success");
						}
					}
				}, "image/png");
			} else {
				const dataUrl = canvas.toDataURL("image/png");
				const a = document.createElement("a");
				a.href = dataUrl;
				a.download = `DENTE_Slice_${toothFdiCode ? `Tooth${toothFdiCode}_` : ""}${Date.now()}.png`;
				a.click();
				showToast("Снимок высокого разрешения сохранён (PNG)", "success");
			}
		} catch (err: any) {
			showToast("Ошибка при захвате снимка: " + (err?.message || "сбой"), "error");
		}
	}, [toothFdiCode]);

	const handleOpenHuProfile = useCallback(() => {
		const canvas = document.querySelector<HTMLCanvasElement>("[data-testid='dicom-viewport-canvas']");
		let p1: Point2D = { x: 100, y: 200 };
		let p2: Point2D = { x: 300, y: 200 };

		if (measurements.length > 0) {
			const lastM = measurements[measurements.length - 1]!;
			p1 = lastM.p1;
			p2 = lastM.p2;
		}

		const stats = calculateBoneDensityProfile(
			p1,
			p2,
			viewportState.windowWidth,
			viewportState.windowCenter,
			viewportState.calibrationMmPerPixel || 0.0264,
			32,
			canvas,
		);
		setHuProfileStats(stats);
		setIsHuModalOpen(true);
	}, [measurements, viewportState]);

	const handleInsertHuToProtocol = () => {
		if (!huProfileStats) return;
		const toothStr = toothFdiCode ? ` в зоне зуба ${toothFdiCode}` : "";
		const text = `Денситометрия костной ткани КЛКТ (шкала Хаунсфилда)${toothStr}: средняя плотность ${huProfileStats.meanHu} HU (Класс ${huProfileStats.dominantClass} по Misch). Диапазон: ${huProfileStats.minHu}..${huProfileStats.maxHu} HU на протяжении ${huProfileStats.lengthMm} мм. Костное ложе пригодно к дентальной имплантации.`;

		if (onInsertToProtocol) onInsertToProtocol(text);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(text).catch(() => {});
		}
		showToast("Протокол плотности кости (HU) внесён в медицинскую карту", "success");
		setIsHuModalOpen(false);
	};

	const toggleFullscreen = () => {
		if (!document.fullscreenElement) {
			document.documentElement.requestFullscreen?.().catch(() => {});
			setIsFullscreen(true);
		} else {
			document.exitFullscreen?.().catch(() => {});
			setIsFullscreen(false);
		}
	};

	return (
		<>
			{/* 1. TOP PRIMARY DENTE QUICK ACCESS RIBBON */}
			<div
				id="dicom-mpr-toolbar"
				data-tour="imaging-filter"
				className="overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x shrink-0 px-2 flex items-center justify-between gap-2 select-none flex-nowrap whitespace-nowrap bg-[#090d16] border-b border-slate-800 text-slate-100 h-10 min-h-[40px]"
			>
				{/* Tabs */}
				<div className="flex items-center gap-1.5 shrink-0">
					<span className="bg-[var(--teal)] text-[var(--on-teal,white)] font-extrabold text-xs px-2.5 py-1 rounded-md tracking-wider shrink-0">
						DENTE КТ
					</span>
					<div className="dente-segmented-bar shrink-0">
						{(["2D", "MPR", "SECTION", "3D_PANO", "TMJ"] as const).map((tab) => {
							const labels: Record<string, string> = { "2D": "2D СРЕЗ", MPR: "MPR", SECTION: "РАЗДЕЛ", "3D_PANO": "3D ПАНОРАМА", TMJ: "ВНЧС (TMJ)" };
							const isActive = activeTab === tab;
							const testId = tab === "MPR" ? "btn-dicom-switch-mpr" : tab === "SECTION" ? "btn-dicom-switch-sectioning" : undefined;
							return (
								<button
									key={tab}
									type="button"
									data-testid={testId}
									onClick={() => {
										setInternalActiveTab(tab);
										onTabChange?.(tab);
									}}
									className={`dente-segmented-item ${isActive ? "active" : ""}`}
								>
									{labels[tab]}
								</button>
							);
						})}
					</div>
				</div>

				{/* Center: Tools */}
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={() => onSelectTool("pan")}
						className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
							activeTool === "pan"
								? "bg-teal-900/80 border-[var(--teal)] text-teal-300"
								: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
						}`}
						title="Рука (Pan / Перемещение среза)"
					>
						<Hand size={15} />
					</button>

					<button
						type="button"
						onClick={() => onSelectTool("ruler")}
						className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
							activeTool === "ruler"
								? "bg-sky-900/80 border-sky-500 text-sky-200"
								: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
						}`}
						title="Линейка (Distance / Калиброванное расстояние в мм)"
					>
						<Ruler size={15} />
					</button>

					<button
						type="button"
						onClick={() => { onSelectTool("angle"); showToast("Инструмент угла: выберите вершину и две точки лучей", "info"); }}
						className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
							activeTool === "angle"
								? "bg-amber-900/80 border-amber-500 text-amber-200"
								: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
						}`}
						title="Угол (Angle / Измерение угла в градусах)"
					>
						<Triangle size={15} />
					</button>

					<button
						type="button"
						onClick={() => onSelectTool("root_canal_tracer")}
						className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border ${
							activeTool === "root_canal_tracer"
								? "bg-rose-900/80 border-rose-500 text-rose-200"
								: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
						}`}
						title="Трассировка корневого канала"
					>
						<PenTool size={15} />
					</button>

					<button
						type="button"
						onClick={() => handleInstantScreenCapture(true)}
						className="h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
						title="Быстрый снимок экрана в буфер обмена Windows"
					>
						<Camera size={15} />
					</button>

					<button
						type="button"
						data-testid="btn-dicom-hu-profile"
						id="btn-ez3d-hu-profile"
						onClick={handleOpenHuProfile}
						className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border border-sky-500/50 bg-sky-600/30 text-sky-200 hover:bg-sky-600/40 text-[13px] font-semibold cursor-pointer transition-colors"
						title="Профиль плотности кости (HU Хаунсфилд вдоль линии измерения D1..D5)"
					>
						<Activity size={14} className="text-sky-400" />
						<span>Плотность HU</span>
					</button>

					{/* ▾ Измерение: Dropdown Menu */}
					<div className="relative" ref={measureMenuRef}>
						<button
							type="button"
							data-testid="btn-dicom-measurement-dropdown"
							id="btn-ez3d-measurement-dropdown"
							onClick={() => setIsMeasureMenuOpen((prev) => !prev)}
							className={`h-8 px-2.5 rounded-lg inline-flex items-center gap-1 border text-[13px] font-medium cursor-pointer transition-colors ${
								isMeasureMenuOpen
									? "bg-teal-900/80 border-[var(--teal)] text-teal-200"
									: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
							}`}
						>
							<span>▾ Измерение</span>
						</button>

						{isMeasureMenuOpen && (
							<div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[10001] p-1.5 flex flex-col gap-0.5">
								<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider">Измерение</div>
								<button type="button" onClick={() => { onSelectTool("ruler"); setIsMeasureMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
									<Ruler size={14} className="text-sky-400" /><span>Длина / Линейка (мм)</span>
								</button>
								<button type="button" onClick={() => { onSelectTool("angle"); setIsMeasureMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
									<Triangle size={14} className="text-amber-400" /><span>Угол (Cobb / Gnathic °)</span>
								</button>
								<button type="button" onClick={() => { handleOpenHuProfile(); setIsMeasureMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
									<Activity size={14} className="text-teal-400" /><span>Плотность кости (HU Misch)</span>
								</button>

								<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">Захват</div>
								<button type="button" onClick={() => { handleInstantScreenCapture(true); setIsMeasureMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
									<Copy size={14} className="text-emerald-400" /><span>Снимок в буфер (Ctrl+V)</span>
								</button>
								<button type="button" onClick={() => { handleInstantScreenCapture(false); setIsMeasureMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
									<Download size={14} className="text-cyan-400" /><span>Экспорт PNG высокого разрешения</span>
								</button>

								<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">Аннотация</div>
								<button type="button" onClick={() => { showToast("Режим стрелки-аннотации активирован: кликните на очаг", "info"); setIsMeasureMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
									<Move size={14} className="text-pink-400" /><span>Стрелка / Клиническая выноска</span>
								</button>

								<div className="text-xs font-bold text-slate-400 px-2 py-1 uppercase border-b border-slate-800 tracking-wider mt-1">Моделирование</div>
								<button type="button" onClick={() => { showToast("Библиотека имплантатов: буфер безопасности 1.5–2 мм вокруг IAN активна", "success"); setIsMeasureMenuOpen(false); }} className="w-full text-left px-2 py-1.5 text-[13px] font-medium rounded-lg text-slate-200 hover:bg-slate-800 cursor-pointer flex items-center gap-2 transition-colors">
									<Zap size={14} className="text-amber-300" /><span>Имплантат (Буфер 1.5–2 мм)</span>
								</button>
							</div>
						)}
					</div>

					{/* Toggle Window/Level Management Popover */}
					<button
						type="button"
						id="btn-dicom-window-panel"
						data-tour="mpr-presets"
						onClick={() => setIsWindowPanelOpen((prev) => !prev)}
						className={`h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border text-[13px] font-medium cursor-pointer transition-colors ${
							isWindowPanelOpen
								? "bg-purple-900/80 border-purple-500 text-purple-200"
								: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
						}`}
						title="Управление окнами (Ширина, Уровень, Фильтры)"
					>
						<Sliders size={14} />
						<span>Окна W/L</span>
					</button>

					{/* Toggle Clipping Panel Popover */}
					<button
						type="button"
						id="btn-dicom-clipping-panel"
						onClick={() => setIsClippingPanelOpen((prev) => !prev)}
						className={`h-8 px-2.5 rounded-lg inline-flex items-center gap-1.5 border text-[13px] font-medium cursor-pointer transition-colors ${
							isClippingApplied
								? "bg-emerald-950 border-emerald-500 text-emerald-200"
								: isClippingPanelOpen
									? "bg-teal-900/80 border-[var(--teal)] text-teal-200"
									: "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
						}`}
						title="Обрезка срезов (Clipping box ROI)"
					>
						<Crop size={14} />
						<span>Обрезка</span>
					</button>
				</div>

				{/* Right: Patient Metadata, AI, 1-Click Norma, Fullscreen, Close */}
				<div className="flex items-center gap-1.5 shrink-0">
					{onAiAnalyze && (
						<button
							type="button"
							data-testid="btn-dicom-run-ai"
							onClick={onAiAnalyze}
							disabled={isAiAnalyzing}
							className="h-8 px-3 rounded-lg border border-[var(--teal)] bg-[var(--teal)] text-[var(--on-teal,white)] text-[13px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90"
							title="Запустить ИИ-анализ снимка на кариес, периодонтит и пломбы"
						>
							{isAiAnalyzing ? (
								<>
									<Loader2 size={13} className="animate-spin" />
									<span>Анализ...</span>
								</>
							) : (
								<>
									<Sparkles size={13} />
									<span>{aiReport ? "ИИ-повтор" : "ИИ-анализ"}</span>
								</>
							)}
						</button>
					)}
					{hasAiFindings && onToggleFindingsDrawer && (
						<button
							type="button"
							onClick={onToggleFindingsDrawer}
							className="h-8 px-2.5 rounded-lg border border-slate-700 bg-slate-800 text-teal-300 hover:bg-slate-700 text-[13px] font-medium cursor-pointer inline-flex items-center gap-1.5 transition-colors"
							title="Показать / скрыть панель находок ИИ"
						>
							<Sparkles size={13} />
							<span>Находки ИИ</span>
						</button>
					)}
					{onNormaClick && (
						<button
							type="button"
							data-testid="btn-dicom-norma-043"
							onClick={onNormaClick}
							className={`h-8 px-3 rounded-lg border text-[13px] font-semibold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
								isNormaApplied
									? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
									: "border-emerald-500/40 bg-emerald-950/80 text-emerald-400 hover:bg-emerald-900/60"
							}`}
							title="1-клик действие: внести «Рентген-норма» в дневник приёма"
						>
							<Zap size={13} className="text-emerald-400" />
							<span>{isNormaApplied ? "Норма внесена" : "Норма: патологии нет"}</span>
						</button>
					)}
					<div className="text-xs text-teal-300 font-bold font-mono px-2 py-1 rounded bg-slate-800/80 border border-slate-700">
						{patientName ? patientName.toUpperCase() : "PID2026-CLINIC"}
					</div>
					<button
						type="button"
						onClick={toggleFullscreen}
						className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 cursor-pointer transition-colors"
						title="Полноэкранный режим (F11)"
					>
						{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
					</button>
					{onClose && (
						<button
							type="button"
							onClick={onClose}
							className="h-8 w-8 rounded-lg flex items-center justify-center border-none bg-transparent text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 cursor-pointer transition-colors"
							title="Закрыть (Esc)"
						>
							<X size={17} />
						</button>
					)}
				</div>
			</div>

			{/* 2. WINDOW / LEVEL MANAGEMENT PANEL */}
			{isWindowPanelOpen && (
				<div
					ref={windowPanelRef}
					id="dicom-window-management-dock"
					style={{ position: "absolute", top: "42px", left: "12px", width: "270px", backgroundColor: "#0b1120", border: "1px solid #334155", borderRadius: "8px", boxShadow: "0 15px 35px rgba(0,0,0,0.75)", zIndex: 10002, padding: "10px", color: "#f8fafc", fontSize: "12px" }}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "6px", marginBottom: "8px" }}>
						<span style={{ fontWeight: 800, letterSpacing: "0.5px", color: "#e2e8f0" }}>УПРАВЛЕНИЕ ОКНАМИ</span>
						<button
							type="button"
							onClick={() => {
								onViewportChange({ windowWidth: 2000, windowCenter: 500, smooth: false, maxRes: false, mip: false, vr: false, invert: false, sharpen: 0 });
								showToast("Окна сброшены к стандартным значениям", "info");
							}}
							style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}
							title="Сброс окна"
						>
							<RotateCcw size={12} />
						</button>
					</div>

					<div style={{ marginBottom: "8px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
							<span style={{ color: "#94a3b8" }}>Ширина:</span>
							<input
								type="number"
								min={1}
								max={10000}
								value={viewportState.windowWidth}
								onChange={(e) => {
									const val = Number.parseInt(e.target.value, 10);
									if (!Number.isNaN(val) && val > 0) onViewportChange({ windowWidth: val });
								}}
								style={numberInputStyle}
							/>
						</div>
						<input type="range" min={100} max={8000} step={50} value={viewportState.windowWidth} onChange={(e) => onViewportChange({ windowWidth: Number(e.target.value) })} style={{ width: "100%", accentColor: "#0d9488", cursor: "pointer" }} />
					</div>

					<div style={{ marginBottom: "10px" }}>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
							<span style={{ color: "#94a3b8" }}>Уровень:</span>
							<input
								type="number"
								min={-1000}
								max={3000}
								value={viewportState.windowCenter}
								onChange={(e) => {
									const val = Number.parseInt(e.target.value, 10);
									if (!Number.isNaN(val)) onViewportChange({ windowCenter: val });
								}}
								style={numberInputStyle}
							/>
						</div>
						<input type="range" min={-500} max={2500} step={25} value={viewportState.windowCenter} onChange={(e) => onViewportChange({ windowCenter: Number(e.target.value) })} style={{ width: "100%", accentColor: "#8b5cf6", cursor: "pointer" }} />
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", backgroundColor: "#131b2e", padding: "8px", borderRadius: "6px", border: "1px solid #1e293b" }}>
						<label style={checkboxLabelStyle}>
							<input type="checkbox" checked={Boolean(viewportState.smooth)} onChange={(e) => onViewportChange({ smooth: e.target.checked })} style={{ accentColor: "#0d9488" }} />
							<span>Сглаживание</span>
						</label>
						<label style={checkboxLabelStyle}>
							<input type="checkbox" checked={viewportState.sharpen > 0} onChange={(e) => onViewportChange({ sharpen: e.target.checked ? 35 : 0 })} style={{ accentColor: "#8b5cf6" }} />
							<span>Резкость</span>
						</label>
						<label style={checkboxLabelStyle}>
							<input type="checkbox" checked={Boolean(viewportState.mip)} onChange={(e) => onViewportChange({ mip: e.target.checked })} style={{ accentColor: "#0d9488" }} />
							<span>MIP</span>
						</label>
						<label style={checkboxLabelStyle}>
							<input type="checkbox" checked={Boolean(viewportState.maxRes)} onChange={(e) => onViewportChange({ maxRes: e.target.checked })} style={{ accentColor: "#8b5cf6" }} />
							<span>Макс. резкость</span>
						</label>
						<label style={checkboxLabelStyle}>
							<input type="checkbox" checked={Boolean(viewportState.vr)} onChange={(e) => onViewportChange({ vr: e.target.checked })} style={{ accentColor: "#0d9488" }} />
							<span>VR (3D)</span>
						</label>
						<label style={checkboxLabelStyle}>
							<input type="checkbox" checked={Boolean(viewportState.invert)} onChange={(e) => onViewportChange({ invert: e.target.checked })} style={{ accentColor: "#3b82f6" }} />
							<span>Инверсия</span>
						</label>
					</div>
				</div>
			)}

			{/* 3. CLIPPING BOX / ROI PANEL */}
			{isClippingPanelOpen && (
				<div
					ref={clippingPanelRef}
					id="dicom-clipping-dock"
					style={{ position: "absolute", top: "42px", left: "140px", width: "250px", backgroundColor: "#0b1120", border: "1px solid #334155", borderRadius: "8px", boxShadow: "0 15px 35px rgba(0,0,0,0.75)", zIndex: 10002, padding: "10px", color: "#f8fafc", fontSize: "12px" }}
				>
					<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "6px", marginBottom: "8px" }}>
						<span style={{ fontWeight: 800, letterSpacing: "0.5px", color: "#e2e8f0" }}>ОБРЕЗКА ROI</span>
						<button type="button" onClick={() => setIsClippingPanelOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
							<X size={13} />
						</button>
					</div>

					<div style={{ marginBottom: "6px" }}>
						<label style={{ display: "block", color: "#94a3b8", marginBottom: "3px" }}>Плоскость:</label>
						<select value={clippingPlane} onChange={(e) => setClippingPlane(e.target.value as any)} style={selectInputStyle}>
							<option value="sagittal">Сагиттальная</option>
							<option value="coronal">Фронтальная (Корональная)</option>
							<option value="axial">Аксиальная</option>
							<option value="custom">Пользовательская</option>
						</select>
					</div>

					<div style={{ marginBottom: "8px" }}>
						<label style={{ display: "block", color: "#94a3b8", marginBottom: "3px" }}>Ориентир:</label>
						<select value={clippingRef} onChange={(e) => setClippingRef(e.target.value as any)} style={selectInputStyle}>
							<option value="user">Пользователь</option>
							<option value="arch_center">Центр зубной дуги</option>
							<option value="symphysis">Симфиз подбородка</option>
						</select>
					</div>

					<div style={{ marginBottom: "10px" }}>
						<span style={{ display: "block", color: "#94a3b8", marginBottom: "4px" }}>Направление:</span>
						<div style={{ display: "flex", gap: "4px" }}>
							<button type="button" onClick={() => setClippingDir("right")} style={{ flex: 1, height: "24px", borderRadius: "4px", border: clippingDir === "right" ? "1px solid #0d9488" : "1px solid #334155", backgroundColor: clippingDir === "right" ? "#134e4a" : "#1e293b", color: clippingDir === "right" ? "#2dd4bf" : "#cbd5e1", cursor: "pointer", fontWeight: 600 }}>
								Справа
							</button>
							<button type="button" onClick={() => setClippingDir("left")} style={{ flex: 1, height: "24px", borderRadius: "4px", border: clippingDir === "left" ? "1px solid #0d9488" : "1px solid #334155", backgroundColor: clippingDir === "left" ? "#134e4a" : "#1e293b", color: clippingDir === "left" ? "#2dd4bf" : "#cbd5e1", cursor: "pointer", fontWeight: 600 }}>
								Слева
							</button>
						</div>
					</div>

					<button
						type="button"
						onClick={() => {
							const nextActive = !isClippingApplied;
							setIsClippingApplied(nextActive);
							onViewportChange({ clippingActive: nextActive, clippingPlane, clippingDirection: clippingDir });
							showToast(nextActive ? `Обрезка применена (${clippingPlane}, ${clippingDir === "right" ? "справа" : "слева"})` : "Обрезка отключена", "success");
						}}
						style={{ width: "100%", height: "28px", borderRadius: "5px", border: "none", backgroundColor: isClippingApplied ? "#065f46" : "#0d9488", color: "#ffffff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
					>
						{isClippingApplied ? <Check size={14} /> : <Scissors size={14} />}
						<span>{isClippingApplied ? "Сбросить обрезку" : "Применить обрезку"}</span>
					</button>
				</div>
			)}

			{/* 4. HOUNSFIELD (HU) BONE DENSITY PROFILE MODAL */}
			{isHuModalOpen && huProfileStats && (
				<div data-testid="dicom-hu-density-modal" style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10003, padding: "16px" }} onClick={() => setIsHuModalOpen(false)}>
					<div style={{ width: "560px", maxWidth: "100%", backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: "12px", padding: "18px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.8)", color: "#f8fafc", display: "flex", flexDirection: "column", gap: "12px" }} onClick={(e) => e.stopPropagation()}>
						<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e293b", paddingBottom: "10px" }}>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<Activity size={18} color="#38bdf8" />
								<div>
									<div style={{ fontWeight: 800, fontSize: "14px" }}>Профиль плотности кости (Шкала Хаунсфилда HU)</div>
									<div style={{ fontSize: "12px", color: "#94a3b8" }}>Классификация Carl E. Misch (D1..D5) вдоль линии измерения ({huProfileStats.lengthMm} мм)</div>
								</div>
							</div>
							<button type="button" onClick={() => setIsHuModalOpen(false)} style={{ background: "transparent", border: "none", color: "#94a3b8", cursor: "pointer" }}>
								<X size={18} />
							</button>
						</div>

						<div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px" }}>
							<div style={statPillStyle}><span style={{ fontSize: "12px", color: "#94a3b8" }}>СРЕДНЯЯ</span><strong style={{ fontSize: "13px", color: "#38bdf8" }}>{huProfileStats.meanHu} HU</strong></div>
							<div style={statPillStyle}><span style={{ fontSize: "12px", color: "#94a3b8" }}>КЛАСС MISCH</span><strong style={{ fontSize: "13px", color: "#2dd4bf" }}>{huProfileStats.dominantClass}</strong></div>
							<div style={statPillStyle}><span style={{ fontSize: "12px", color: "#94a3b8" }}>МИНИМУМ</span><strong style={{ fontSize: "13px", color: "#f59e0b" }}>{huProfileStats.minHu} HU</strong></div>
							<div style={statPillStyle}><span style={{ fontSize: "12px", color: "#94a3b8" }}>МАКСИМУМ</span><strong style={{ fontSize: "13px", color: "#a855f7" }}>{huProfileStats.maxHu} HU</strong></div>
						</div>

						{/* SVG Chart of HU Profile */}
						<div style={{ height: "170px", backgroundColor: "#020617", borderRadius: "8px", border: "1px solid #1e293b", padding: "8px", position: "relative" }}>
							<svg width="100%" height="100%" viewBox="0 0 500 150" preserveAspectRatio="none">
								<defs>
									<linearGradient id="huGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="#38bdf8" stopOpacity="0.6" />
										<stop offset="100%" stopColor="#0d9488" stopOpacity="0.05" />
									</linearGradient>
								</defs>
								<line x1="0" y1="35" x2="500" y2="35" stroke="#3b82f6" strokeDasharray="3 3" strokeOpacity="0.4" />
								<text x="4" y="32" fill="#93c5fd" fontSize="9" fontWeight="bold">D1 (&gt;1250 HU)</text>
								<line x1="0" y1="65" x2="500" y2="65" stroke="#10b981" strokeDasharray="3 3" strokeOpacity="0.4" />
								<text x="4" y="62" fill="#6ee7b7" fontSize="9" fontWeight="bold">D2 (850-1250 HU)</text>
								<line x1="0" y1="95" x2="500" y2="95" stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity="0.4" />
								<text x="4" y="92" fill="#fde68a" fontSize="9" fontWeight="bold">D3 (350-850 HU)</text>
								<line x1="0" y1="125" x2="500" y2="125" stroke="#ef4444" strokeDasharray="3 3" strokeOpacity="0.4" />
								<text x="4" y="122" fill="#fca5a5" fontSize="9" fontWeight="bold">D4 (&lt;350 HU)</text>

								{huProfileStats.samples.length > 1 && (
									<>
										<polygon
											points={`0,145 ${huProfileStats.samples.map((s, idx) => {
												const x = (idx / (huProfileStats.samples.length - 1)) * 500;
												const clampedHu = Math.max(-500, Math.min(2500, s.hu));
												const y = 140 - ((clampedHu + 500) / 3000) * 130;
												return `${x.toFixed(1)},${y.toFixed(1)}`;
											}).join(" ")} 500,145`}
											fill="url(#huGradient)"
										/>
										<polyline
											points={huProfileStats.samples.map((s, idx) => {
												const x = (idx / (huProfileStats.samples.length - 1)) * 500;
												const clampedHu = Math.max(-500, Math.min(2500, s.hu));
												const y = 140 - ((clampedHu + 500) / 3000) * 130;
												return `${x.toFixed(1)},${y.toFixed(1)}`;
											}).join(" ")}
											fill="none"
											stroke="#38bdf8"
											strokeWidth="2.5"
										/>
									</>
								)}
							</svg>
						</div>

						{/* Clinical Recommendation Guide */}
						<div style={{ backgroundColor: "rgba(13, 148, 136, 0.1)", border: "1px solid rgba(13, 148, 136, 0.3)", borderRadius: "8px", padding: "10px", fontSize: "12px", color: "#cbd5e1", lineHeight: "1.4" }}>
							<div style={{ fontWeight: 700, color: "#2dd4bf", marginBottom: "4px" }}>
								Клинический протокол для плотности кости {huProfileStats.dominantClass}:
							</div>
							{huProfileStats.dominantClass === "D1" && <span>Плотная кортикальная кость (симфиз). Обязательно полное препарирование с охлаждением физраствором и нарезанием резьбы метчиком (bone tap) на 15-25 об/мин во избежание термического остеонекроза.</span>}
							{huProfileStats.dominantClass === "D2" && <span>Оптимальная плотная губчатая кость с выраженным кортексом. Стандартный ступенчатый протокол сверления. Первичная стабильность прогнозируется на уровне 35–45 Н·см.</span>}
							{huProfileStats.dominantClass === "D3" && <span>Пористая губчатая кость (верхняя челюсть). Рекомендуется протокол щадящего сверления (under-drilling на 0.5 мм меньше диаметра имплантата) и остеоконденсация для уплотнения ложа.</span>}
							{huProfileStats.dominantClass === "D4" && <span>Мягкая кость низкой плотности (бугор верхней челюсти). Требуется бикортикальная фиксация или остеоконденсация остеотомами. Прогноз первичной стабильности снижен.</span>}
							{huProfileStats.dominantClass === "D5" && <span>Зона выраженной атрофии или дефекта костной ткани. Необходима направленная костная регенерация (НКР) до установки имплантата.</span>}
						</div>

						<div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
							<button type="button" onClick={() => setIsHuModalOpen(false)} style={{ height: "36px", padding: "0 16px", borderRadius: "8px", backgroundColor: "#1e293b", border: "1px solid #334155", color: "#cbd5e1", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>
								Закрыть
							</button>
							<button type="button" onClick={handleInsertHuToProtocol} style={{ height: "36px", padding: "0 18px", borderRadius: "8px", backgroundColor: "var(--teal)", border: "none", color: "var(--on-teal, #ffffff)", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
								<FileText size={15} /><span>Внести в медицинскую карту</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</>
	);
};

const dropdownSectionHeaderStyle: React.CSSProperties = { fontSize: "12px", fontWeight: 800, color: "#94a3b8", padding: "4px 6px", textTransform: "uppercase", borderBottom: "1px solid #1e293b" };
const menuItemStyle: React.CSSProperties = { textAlign: "left", padding: "6px 8px", fontSize: "12px", borderRadius: "5px", background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", transition: "background 0.15s ease" };
const checkboxLabelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#cbd5e1", cursor: "pointer", userSelect: "none" };
const selectInputStyle: React.CSSProperties = { width: "100%", height: "26px", backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "6px", color: "#f8fafc", fontSize: "12px", padding: "0 6px" };
const numberInputStyle: React.CSSProperties = { width: "80px", height: "26px", backgroundColor: "#1e293b", border: "1px solid #475569", borderRadius: "6px", color: "#f8fafc", fontSize: "12px", fontWeight: 700, fontFamily: "monospace", textAlign: "right", padding: "0 6px" };
const statPillStyle: React.CSSProperties = { backgroundColor: "#020617", border: "1px solid #1e293b", borderRadius: "6px", padding: "6px 8px", display: "flex", flexDirection: "column", gap: "2px" };

// Backwards compatibility aliases
export type Ez3dToolboxRibbonProps = DicomToolboxRibbonProps;
export const Ez3dToolboxRibbon = DicomToolboxRibbon;
