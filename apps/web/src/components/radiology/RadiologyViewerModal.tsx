import {
	Activity,
	AlertCircle,
	ArrowLeft,
	Box,
	Camera,
	Check,
	ChevronRight,
	Columns,
	Crosshair,
	Download,
	Eye,
	EyeOff,
	FileText,
	FlipHorizontal,
	Info,
	Layers,
	Maximize2,
	Minus,
	Move,
	Pin,
	Plus,
	Printer,
	RefreshCcw,
	RotateCcw,
	RotateCw,
	Ruler,
	Scan,
	Sliders,
	Sun,
	Tag,
	Target,
	Trash2,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	ADULT_FDI_TEETH,
	calculateDistanceMm,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
	LANDMARK_TYPE_LABELS,
} from "./radiologyMath";
import {
	DEFAULT_WW_WL_PRESETS,
	type LandmarkPin,
	type MeasurementRuler,
	type RadiologyStudy,
	type RadiologyViewerTool,
	type WindowLevelPreset,
} from "./types";

export interface RadiologyViewerModalProps {
	isOpen: boolean;
	onClose: () => void;
	study: RadiologyStudy | null;
	onSaveStudy?: (updatedStudy: RadiologyStudy) => void;
	onOpenReferralModal?: (study: RadiologyStudy) => void;
	onOpenDoseSheetModal?: (study: RadiologyStudy) => void;
}

export const RadiologyViewerModal: React.FC<RadiologyViewerModalProps> = ({
	isOpen,
	onClose,
	study,
	onSaveStudy,
	onOpenReferralModal,
	onOpenDoseSheetModal,
}) => {
	const modalId = useId();
	const viewportRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLImageElement>(null);

	// Viewport Transform State
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [rotation, setRotation] = useState<number>(0);
	const [flipH, setFlipH] = useState<boolean>(false);

	// Active Tool
	const [activeTool, setActiveTool] = useState<RadiologyViewerTool>("pan");

	// WW/WL & Image Adjustments
	const [activePresetId, setActivePresetId] = useState<string>("standard");
	const [brightness, setBrightness] = useState<number>(100);
	const [contrast, setContrast] = useState<number>(100);
	const [invert, setInvert] = useState<boolean>(false);

	// Rulers & Landmarks
	const [measurements, setMeasurements] = useState<MeasurementRuler[]>([]);
	const [landmarks, setLandmarks] = useState<LandmarkPin[]>([]);
	const [activeRulerStart, setActiveRulerStart] = useState<{ x: number; y: number } | null>(null);
	const [mousePosPercent, setMousePosPercent] = useState<{ x: number; y: number } | null>(null);

	// Landmark Placement Dialog
	const [pendingLandmarkPos, setPendingLandmarkPos] = useState<{ x: number; y: number } | null>(null);
	const [selectedFdiTooth, setSelectedFdiTooth] = useState<string>("36");
	const [landmarkType, setLandmarkType] = useState<LandmarkPin["type"]>("tooth");
	const [landmarkCustomLabel, setLandmarkCustomLabel] = useState<string>("");

	// HUD and Panels
	const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
	const [isSideDrawerOpen, setIsSideDrawerOpen] = useState<boolean>(true);
	const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(false);

	// Dragging state
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// Sync study measurements and landmarks on load
	useEffect(() => {
		if (study) {
			setMeasurements(study.measurements || []);
			setLandmarks(study.landmarks || []);
			// Set initial FDI tooth from study if available
			if (study.teethFdi && study.teethFdi.length > 0 && study.teethFdi[0]) {
				setSelectedFdiTooth(study.teethFdi[0] ?? "16");
			}
		}
		// Reset view state
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
		setRotation(0);
		setFlipH(false);
		setActivePresetId("standard");
		setBrightness(100);
		setContrast(100);
		setInvert(false);
		setActiveTool("pan");
		setActiveRulerStart(null);
		setPendingLandmarkPos(null);
	}, [study]);

	// Keyboard shortcuts
	useEffect(() => {
		if (!isOpen) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				if (pendingLandmarkPos) {
					setPendingLandmarkPos(null);
				} else if (activeRulerStart) {
					setActiveRulerStart(null);
				} else {
					onClose();
				}
			} else if (e.key === "+" || e.key === "=") {
				setZoom((prev) => Math.min(prev + 0.2, 5.0));
			} else if (e.key === "-") {
				setZoom((prev) => Math.max(prev - 0.2, 0.2));
			} else if (e.key === "0") {
				setZoom(1.0);
				setPan({ x: 0, y: 0 });
			} else if (e.key.toLowerCase() === "r") {
				setRotation((prev) => (prev + 90) % 360);
			} else if (e.key.toLowerCase() === "i") {
				setInvert((prev) => !prev);
			} else if (e.key.toLowerCase() === "m") {
				setActiveTool("ruler");
			} else if (e.key.toLowerCase() === "l") {
				setActiveTool("landmark");
			} else if (e.key.toLowerCase() === "p") {
				setActiveTool("pan");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, pendingLandmarkPos, activeRulerStart, onClose]);

	// Apply Preset
	const handleSelectPreset = (preset: WindowLevelPreset) => {
		setActivePresetId(preset.id);
		setBrightness(preset.brightness);
		setContrast(preset.contrast);
		setInvert(!!preset.invert);
	};

	// Reset All Adjustments
	const handleResetAll = () => {
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
		setRotation(0);
		setFlipH(false);
		setActivePresetId("standard");
		setBrightness(100);
		setContrast(100);
		setInvert(false);
		setActiveRulerStart(null);
		setPendingLandmarkPos(null);
	};

	// Get click coordinates in % of image
	const getImagePercentCoords = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
		if (!imageRef.current) return null;
		const rect = imageRef.current.getBoundingClientRect();
		const xPx = e.clientX - rect.left;
		const yPx = e.clientY - rect.top;
		if (xPx < 0 || yPx < 0 || xPx > rect.width || yPx > rect.height) return null;

		const xPct = Number(((xPx / rect.width) * 100).toFixed(2));
		const yPct = Number(((yPx / rect.height) * 100).toFixed(2));
		return { x: xPct, y: yPct };
	}, []);

	// Pan / Drag Handling
	const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return; // only left click

		if (activeTool === "pan") {
			setIsDragging(true);
			setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
			return;
		}

		const coords = getImagePercentCoords(e);
		if (!coords) return;

		if (activeTool === "ruler") {
			if (!activeRulerStart) {
				setActiveRulerStart(coords);
			} else {
				// Complete ruler measurement
				const pixelSpacing = study?.metadata?.pixelSpacingMm || 0.1;
				const imgW = imageRef.current?.naturalWidth || 1200;
				const imgH = imageRef.current?.naturalHeight || 1200;
				const distanceMm = calculateDistanceMm(
					activeRulerStart.x,
					activeRulerStart.y,
					coords.x,
					coords.y,
					imgW,
					imgH,
					pixelSpacing,
				);

				const newRuler: MeasurementRuler = {
					id: `ruler-${Date.now()}`,
					startX: activeRulerStart.x,
					startY: activeRulerStart.y,
					endX: coords.x,
					endY: coords.y,
					distanceMm,
					label: `${distanceMm} мм`,
					color: "#06b6d4", // cyan
				};

				const updated = [...measurements, newRuler];
				setMeasurements(updated);
				setActiveRulerStart(null);

				if (study && onSaveStudy) {
					onSaveStudy({ ...study, measurements: updated });
				}
			}
		} else if (activeTool === "landmark") {
			setPendingLandmarkPos(coords);
		}
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
		if (isDragging && activeTool === "pan") {
			setPan({
				x: e.clientX - dragStart.x,
				y: e.clientY - dragStart.y,
			});
		}

		if (activeTool === "ruler" && activeRulerStart) {
			const coords = getImagePercentCoords(e);
			if (coords) {
				setMousePosPercent(coords);
			}
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	// Mouse Wheel Zoom
	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		e.preventDefault();
		const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
		setZoom((prev) => Math.min(Math.max(Number((prev + zoomDelta).toFixed(2)), 0.2), 6.0));
	};

	// Save Landmark Pin
	const handleConfirmLandmark = () => {
		if (!pendingLandmarkPos) return;

		const toothName = FDI_TOOTH_NAMES[selectedFdiTooth] || `Зуб ${selectedFdiTooth}`;
		const finalLabel =
			landmarkCustomLabel.trim() || `${LANDMARK_TYPE_LABELS[landmarkType]} (${selectedFdiTooth})`;

		const newPin: LandmarkPin = {
			id: `pin-${Date.now()}`,
			x: pendingLandmarkPos.x,
			y: pendingLandmarkPos.y,
			toothFdi: selectedFdiTooth,
			label: finalLabel,
			type: landmarkType,
			color: landmarkType === "caries" ? "#ef4444" : landmarkType === "apex" ? "#10b981" : "#06b6d4",
		};

		const updated = [...landmarks, newPin];
		setLandmarks(updated);
		setPendingLandmarkPos(null);
		setLandmarkCustomLabel("");

		if (study && onSaveStudy) {
			onSaveStudy({ ...study, landmarks: updated });
		}
	};

	// Delete Ruler
	const handleDeleteRuler = (rulerId: string) => {
		const updated = measurements.filter((r) => r.id !== rulerId);
		setMeasurements(updated);
		if (study && onSaveStudy) {
			onSaveStudy({ ...study, measurements: updated });
		}
	};

	// Delete Landmark
	const handleDeleteLandmark = (pinId: string) => {
		const updated = landmarks.filter((p) => p.id !== pinId);
		setLandmarks(updated);
		if (study && onSaveStudy) {
			onSaveStudy({ ...study, landmarks: updated });
		}
	};

	// Dose calculations
	const doseInfo = useMemo(() => {
		return formatRadiationDose(study?.effectiveDoseMicrosv ?? 25.0);
	}, [study?.effectiveDoseMicrosv]);

	if (!isOpen || typeof document === "undefined") return null;

	const studyTitle = study?.anatomicalArea || "Рентгенологическое исследование";
	const studyDateFormatted = study?.studyDate || "15.08.2026";
	const patientName = study?.patientName || "Пациент";
	const doctorName = study?.doctorName || "Врач-рентгенолог";
	const modalityLabel = study?.modalityLabel || "3D КЛКТ / ОПТГ";

	return createPortal(
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Кибер-просмотрщик лучевой диагностики"
			data-testid="radiology-viewer-modal"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP CYBER HUD BAR (Ergonomic Header)
			    ═══════════════════════════════════════════════════════════════════ */}
			<header className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 backdrop-blur-md z-30 shrink-0">
				{/* Left: Study Title, Modality & Patient Info */}
				<div className="flex items-center gap-3 min-w-0">
					<button
						type="button"
						onClick={onClose}
						className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-slate-700/60 active:scale-95 transition-all"
						title="Закрыть просмотрщик (Esc)"
						data-testid="radiology-viewer-close-btn"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>

					<div className="flex flex-col min-w-0">
						<div className="flex items-center gap-2 flex-wrap">
							<span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-bold uppercase tracking-wide">
								{modalityLabel}
							</span>
							<h1 className="text-sm md:text-base font-bold text-slate-100 truncate">
								{studyTitle}
							</h1>
						</div>
						<div className="flex items-center gap-3 text-xs text-slate-400 truncate mt-0.5">
							<span className="font-semibold text-slate-200">
								Пациент: {patientName}
							</span>
							<span>•</span>
							<span>Врач: {doctorName}</span>
							<span>•</span>
							<span className="font-bold text-cyan-400">
								Дата: {studyDateFormatted}
							</span>
						</div>
					</div>
				</div>

				{/* Center: High-contrast Radiation Dose Badge & Tooth FDI */}
				<div className="hidden lg:flex items-center gap-3">
					{study?.teethFdi && study.teethFdi.length > 0 && (
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 shadow-sm">
							<Target className="w-4 h-4 text-cyan-400" />
							<span className="text-xs font-medium text-slate-300">Зубы FDI:</span>
							<span className="text-sm font-bold text-cyan-300">
								{study.teethFdi.join(", ")}
							</span>
						</div>
					)}

					{/* Radiation Dose Badge (>= 13-14px bold per mandate) */}
					<div
						className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border shadow-sm ${doseInfo.badgeClass}`}
						title="Эффективная эквивалентная доза по СанПиН"
						data-testid="radiation-dose-hud-badge"
					>
						<Activity className="w-4 h-4" />
						<span className="text-xs uppercase font-medium">Доза:</span>
						<span className="text-sm font-bold tracking-wide">
							{doseInfo.fullText}
						</span>
					</div>
				</div>

				{/* Right: Action Buttons (>= 44x44px touch targets) */}
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setIsHudVisible((prev) => !prev)}
						className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
							isHudVisible
								? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
								: "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
						}`}
						title={isHudVisible ? "Скрыть HUD метки" : "Показать HUD метки"}
					>
						{isHudVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
					</button>

					{onOpenReferralModal && study && (
						<button
							type="button"
							onClick={() => onOpenReferralModal(study)}
							className="hidden sm:flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-cyan-500/40 text-slate-200 hover:text-cyan-300 text-xs font-bold transition-all"
							title="Оформить направление на дообследование"
						>
							<FileText className="w-4 h-4 text-cyan-400" />
							<span>Направление</span>
						</button>
					)}

					{onOpenDoseSheetModal && study && (
						<button
							type="button"
							onClick={() => onOpenDoseSheetModal(study)}
							className="hidden md:flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:border-emerald-500/40 text-slate-200 hover:text-emerald-300 text-xs font-bold transition-all"
							title="Лист учета дозовых нагрузок (СанПиН)"
						>
							<Activity className="w-4 h-4 text-emerald-400" />
							<span>Лист доз</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => setIsSideDrawerOpen((prev) => !prev)}
						className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
							isSideDrawerOpen
								? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
								: "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
						}`}
						title="Панель сведений и отчета"
						data-testid="toggle-side-drawer-btn"
					>
						<Columns className="w-5 h-5" />
					</button>
				</div>
			</header>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. MAIN WORKSPACE: VIEWPORT + TOOLBAR + SIDE DRAWER
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="relative flex-1 flex min-h-0 bg-black overflow-hidden">
				{/* ── TOOLBAR (Floating Cyber Dock with >= 44x44px targets) ── */}
				<nav
					aria-label="Инструменты управления просмотрщиком"
					className="absolute left-4 top-4 z-40 flex flex-col gap-1.5 p-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-md"
				>
					{/* Primary Interactive Tools */}
					<div className="flex flex-col gap-1 pb-2 border-b border-slate-800">
						<button
							type="button"
							onClick={() => {
								setActiveTool("pan");
								setActiveRulerStart(null);
							}}
							className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
								activeTool === "pan"
									? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20"
									: "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"
							}`}
							title="Панорамирование / Перемещение (P)"
							data-testid="tool-pan-btn"
						>
							<Move className="w-5 h-5" />
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveTool("ruler");
								setPendingLandmarkPos(null);
							}}
							className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
								activeTool === "ruler"
									? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20"
									: "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"
							}`}
							title="Измерительная 2-точечная линейка в мм (M)"
							data-testid="tool-ruler-btn"
						>
							<Ruler className="w-5 h-5" />
						</button>

						<button
							type="button"
							onClick={() => {
								setActiveTool("landmark");
								setActiveRulerStart(null);
							}}
							className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
								activeTool === "landmark"
									? "bg-cyan-500/30 border-cyan-400 text-cyan-200 shadow-lg shadow-cyan-500/20"
									: "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"
							}`}
							title="Установка анатомической метки зуба / апекса (L)"
							data-testid="tool-landmark-btn"
						>
							<Pin className="w-5 h-5" />
						</button>
					</div>

					{/* Zoom Controls */}
					<div className="flex flex-col gap-1 pb-2 border-b border-slate-800">
						<button
							type="button"
							onClick={() => setZoom((prev) => Math.min(prev + 0.25, 6.0))}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 active:scale-95 transition-all"
							title="Увеличить (+)"
						>
							<ZoomIn className="w-5 h-5" />
						</button>

						<button
							type="button"
							onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.2))}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 active:scale-95 transition-all"
							title="Уменьшить (-)"
						>
							<Minus className="w-5 h-5" />
						</button>

						<button
							type="button"
							onClick={() => {
								setZoom(1.0);
								setPan({ x: 0, y: 0 });
							}}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs font-bold text-cyan-400 hover:bg-slate-700 active:scale-95 transition-all"
							title="Сброс масштаба 100% (0)"
						>
							100%
						</button>
					</div>

					{/* Image Transformations (Rotation & Flip) */}
					<div className="flex flex-col gap-1 pb-2 border-b border-slate-800">
						<button
							type="button"
							onClick={() => setRotation((prev) => (prev + 90) % 360)}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 active:scale-95 transition-all"
							title="Поворот по часовой стрелке 90° (R)"
						>
							<RotateCw className="w-5 h-5" />
						</button>

						<button
							type="button"
							onClick={() => setFlipH((prev) => !prev)}
							className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
								flipH
									? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
									: "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"
							}`}
							title="Зеркальное отражение по горизонтали"
						>
							<FlipHorizontal className="w-5 h-5" />
						</button>

						<button
							type="button"
							onClick={() => setInvert((prev) => !prev)}
							className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
								invert
									? "bg-amber-500/30 border-amber-400 text-amber-200"
									: "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-amber-300 hover:bg-slate-700"
							}`}
							title="Инверсия негатив / позитив (I)"
						>
							<Sun className="w-5 h-5" />
						</button>
					</div>

					{/* Sliders and Reset */}
					<div className="flex flex-col gap-1">
						<button
							type="button"
							onClick={() => setIsControlsExpanded((prev) => !prev)}
							className={`flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl border transition-all ${
								isControlsExpanded
									? "bg-cyan-500/30 border-cyan-400 text-cyan-200"
									: "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"
							}`}
							title="Настройка яркости и контраста (WW/WL)"
						>
							<Sliders className="w-5 h-5" />
						</button>

						<button
							type="button"
							onClick={handleResetAll}
							className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 hover:text-rose-100 active:scale-95 transition-all"
							title="Сбросить все настройки снимка"
						>
							<RefreshCcw className="w-5 h-5" />
						</button>
					</div>
				</nav>

				{/* ── WW/WL PRESETS QUICK BAR (Bottom Floating) ── */}
				<div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-2xl backdrop-blur-md">
					<span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-400">
						Пресеты WW/WL:
					</span>
					{DEFAULT_WW_WL_PRESETS.map((preset) => {
						const isSelected = activePresetId === preset.id;
						return (
							<button
								key={preset.id}
								type="button"
								onClick={() => handleSelectPreset(preset)}
								className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
									isSelected
										? "bg-cyan-500/30 border border-cyan-400 text-cyan-200 shadow-md shadow-cyan-500/20"
										: "bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 hover:bg-slate-700"
								}`}
								title={preset.description}
								data-testid={`preset-btn-${preset.id}`}
							>
								{preset.label}
							</button>
						);
					})}
				</div>

				{/* ── EXPANDED CONTROLS POPUP (Sliders for Brightness/Contrast) ── */}
				{isControlsExpanded && (
					<div className="absolute left-20 top-24 z-40 w-72 p-4 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-2xl backdrop-blur-md flex flex-col gap-4 text-xs">
						<div className="flex items-center justify-between border-b border-slate-800 pb-2">
							<span className="font-bold text-slate-200 uppercase tracking-wide">
								Точная калибровка WW/WL
							</span>
							<button
								type="button"
								onClick={() => setIsControlsExpanded(false)}
								className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Brightness Slider */}
						<div>
							<div className="flex justify-between font-semibold text-slate-300 mb-1.5">
								<span>Яркость (WL):</span>
								<span className="font-mono text-cyan-400 font-bold">{brightness}%</span>
							</div>
							<input
								type="range"
								min="20"
								max="200"
								value={brightness}
								onChange={(e) => setBrightness(Number(e.target.value))}
								className="w-full h-2 rounded-lg bg-slate-700 accent-cyan-400 cursor-pointer"
							/>
						</div>

						{/* Contrast Slider */}
						<div>
							<div className="flex justify-between font-semibold text-slate-300 mb-1.5">
								<span>Контрастность (WW):</span>
								<span className="font-mono text-cyan-400 font-bold">{contrast}%</span>
							</div>
							<input
								type="range"
								min="30"
								max="250"
								value={contrast}
								onChange={(e) => setContrast(Number(e.target.value))}
								className="w-full h-2 rounded-lg bg-slate-700 accent-cyan-400 cursor-pointer"
							/>
						</div>

						<div className="flex items-center justify-between pt-2 border-t border-slate-800">
							<label className="flex items-center gap-2 cursor-pointer text-slate-300">
								<input
									type="checkbox"
									checked={invert}
									onChange={(e) => setInvert(e.target.checked)}
									className="w-4 h-4 rounded text-cyan-500 focus:ring-0 bg-slate-800 border-slate-700"
								/>
								<span className="font-semibold">Инверсия (Негатив)</span>
							</label>
							<button
								type="button"
								onClick={() => {
									setBrightness(100);
									setContrast(100);
									setInvert(false);
								}}
								className="px-2.5 py-1 text-[11px] rounded-lg bg-slate-800 text-slate-300 hover:text-white"
							>
								Сброс
							</button>
						</div>
					</div>
				)}

				{/* ── LANDMARK PIN PLACEMENT DIALOG ── */}
				{pendingLandmarkPos && (
					<div
						className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-96 p-5 rounded-2xl bg-slate-900 border-2 border-cyan-500 shadow-2xl flex flex-col gap-4 text-slate-100 animate-in zoom-in-95 duration-150"
						data-testid="landmark-picker-modal"
					>
						<div className="flex items-center justify-between border-b border-slate-800 pb-2">
							<div className="flex items-center gap-2">
								<Pin className="w-5 h-5 text-cyan-400" />
								<span className="font-bold text-sm">Установка метки зуба / структуры</span>
							</div>
							<button
								type="button"
								onClick={() => setPendingLandmarkPos(null)}
								className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Type of Landmark */}
						<div>
							<label
								htmlFor="landmark-type-select"
								className="text-xs font-bold uppercase text-slate-400 mb-1.5 block"
							>
								1. Тип анатомической структуры:
							</label>
							<select
								id="landmark-type-select"
								value={landmarkType}
								onChange={(e) => setLandmarkType(e.target.value as LandmarkPin["type"])}
								className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-semibold focus:outline-none focus:border-cyan-500"
							>
								{Object.entries(LANDMARK_TYPE_LABELS).map(([k, v]) => (
									<option key={k} value={k}>
										{v}
									</option>
								))}
							</select>
						</div>

						{/* FDI Tooth Grid (Adult 11-48 with 44x44px touch targets) */}
						<div>
							<span className="text-xs font-bold uppercase text-slate-400 mb-1.5 block">
								2. Выберите зуб (FDI):
							</span>
							<div className="flex flex-col gap-1 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
								{/* Upper jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pb-1">
									{ADULT_FDI_TEETH.quadrant1.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedFdiTooth(tooth)}
											className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-lg transition-all ${
												selectedFdiTooth === tooth
													? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
													: "bg-slate-800 text-slate-300 hover:bg-slate-700"
											}`}
										>
											{tooth}
										</button>
									))}
									{ADULT_FDI_TEETH.quadrant2.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedFdiTooth(tooth)}
											className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-lg transition-all ${
												selectedFdiTooth === tooth
													? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
													: "bg-slate-800 text-slate-300 hover:bg-slate-700"
											}`}
										>
											{tooth}
										</button>
									))}
								</div>
								{/* Lower jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pt-1 border-t border-slate-800">
									{ADULT_FDI_TEETH.quadrant4.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedFdiTooth(tooth)}
											className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-lg transition-all ${
												selectedFdiTooth === tooth
													? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
													: "bg-slate-800 text-slate-300 hover:bg-slate-700"
											}`}
										>
											{tooth}
										</button>
									))}
									{ADULT_FDI_TEETH.quadrant3.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedFdiTooth(tooth)}
											className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-lg transition-all ${
												selectedFdiTooth === tooth
													? "bg-cyan-500 text-slate-950 shadow-md font-extrabold"
													: "bg-slate-800 text-slate-300 hover:bg-slate-700"
											}`}
										>
											{tooth}
										</button>
									))}
								</div>
							</div>
							<p className="text-[11px] text-cyan-400 mt-1 font-semibold">
								Выбран: {selectedFdiTooth} — {FDI_TOOTH_NAMES[selectedFdiTooth] || "Зуб"}
							</p>
						</div>

						{/* Custom Note/Label */}
						<div>
							<label
								htmlFor="landmark-custom-note"
								className="text-xs font-bold uppercase text-slate-400 mb-1 block"
							>
								3. Дополнительное примечание (опционально):
							</label>
							<input
								id="landmark-custom-note"
								type="text"
								value={landmarkCustomLabel}
								onChange={(e) => setLandmarkCustomLabel(e.target.value)}
								placeholder="Например: Деструкция кости d=3.5мм, апекс..."
								className="w-full px-3 py-2 text-xs rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-500"
							/>
						</div>

						{/* Actions */}
						<div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
							<button
								type="button"
								onClick={() => setPendingLandmarkPos(null)}
								className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 text-slate-300 hover:text-white"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleConfirmLandmark}
								className="min-h-[44px] px-5 py-2 text-xs font-bold rounded-xl bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 font-extrabold"
								data-testid="save-landmark-pin-btn"
							>
								Сохранить метку
							</button>
						</div>
					</div>
				)}

				{/* ── THE CANVAS VIEWPORT ── */}
				<div
					ref={viewportRef}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onWheel={handleWheel}
					className={`relative flex-1 h-full flex items-center justify-center overflow-hidden ${
						activeTool === "pan"
							? isDragging
								? "cursor-grabbing"
								: "cursor-grab"
							: activeTool === "ruler"
								? "cursor-crosshair"
								: "cursor-cell"
					}`}
				>
					{/* Image with Transformations and CSS Filters */}
					<div
						className="relative transition-transform duration-75 origin-center will-change-transform"
						style={{
							transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${
								flipH ? -1 : 1
							})`,
						}}
					>
						<img
							ref={imageRef}
							src={study?.imageUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='800' height='600' fill='%230f172a'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2338bdf8' font-size='24' font-family='sans-serif'>Рентгеновский снимок (Загрузка...)</text></svg>"}
							alt={studyTitle}
							draggable={false}
							className="max-h-[85vh] max-w-[85vw] object-contain select-none pointer-events-none rounded-lg shadow-2xl"
							style={{
								filter: `brightness(${brightness}%) contrast(${contrast}%) ${
									invert ? "invert(100%)" : ""
								}`,
							}}
						/>

						{/* ── SVG HUD OVERLAY FOR MEASUREMENTS & RULERS ── */}
						{isHudVisible && (
							<svg
								aria-hidden="true"
								className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
								viewBox="0 0 100 100"
								preserveAspectRatio="none"
							>
								{/* Existing Measurements */}
								{measurements.map((ruler) => {
									const midX = (ruler.startX + ruler.endX) / 2;
									const midY = (ruler.startY + ruler.endY) / 2;
									return (
										<g key={ruler.id} className="pointer-events-auto">
											<line
												x1={`${ruler.startX}%`}
												y1={`${ruler.startY}%`}
												x2={`${ruler.endX}%`}
												y2={`${ruler.endY}%`}
												stroke="#06b6d4"
												strokeWidth="0.6"
												strokeDasharray="1 0.5"
											/>
											{/* Start and end points */}
											<circle
												cx={`${ruler.startX}%`}
												cy={`${ruler.startY}%`}
												r="1"
												fill="#06b6d4"
											/>
											<circle
												cx={`${ruler.endX}%`}
												cy={`${ruler.endY}%`}
												r="1"
												fill="#06b6d4"
											/>
											{/* Center distance pill */}
											<foreignObject
												x={`${midX}%`}
												y={`${midY}%`}
												width="24"
												height="10"
												className="overflow-visible"
												style={{ transform: "translate(-50%, -50%)" }}
											>
												<div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/90 border border-cyan-400 text-cyan-300 text-[10px] font-bold shadow-lg whitespace-nowrap">
													<span>{ruler.distanceMm} мм</span>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteRuler(ruler.id);
														}}
														className="text-rose-400 hover:text-rose-200 ml-0.5"
														title="Удалить измерение"
													>
														×
													</button>
												</div>
											</foreignObject>
										</g>
									);
								})}

								{/* Active in-progress ruler line */}
								{activeRulerStart && mousePosPercent && (
									<g className="pointer-events-none">
										<line
											x1={`${activeRulerStart.x}%`}
											y1={`${activeRulerStart.y}%`}
											x2={`${mousePosPercent.x}%`}
											y2={`${mousePosPercent.y}%`}
											stroke="#38bdf8"
											strokeWidth="0.7"
										/>
										<circle
											cx={`${activeRulerStart.x}%`}
											cy={`${activeRulerStart.y}%`}
											r="1.2"
											fill="#38bdf8"
										/>
										<circle
											cx={`${mousePosPercent.x}%`}
											cy={`${mousePosPercent.y}%`}
											r="1.2"
											fill="#38bdf8"
										/>
									</g>
								)}
							</svg>
						)}

						{/* ── LANDMARK PINS OVERLAY ── */}
						{isHudVisible &&
							landmarks.map((pin) => (
								<div
									key={pin.id}
									className="absolute z-30 group"
									style={{
										left: `${pin.x}%`,
										top: `${pin.y}%`,
										transform: "translate(-50%, -100%)",
									}}
								>
									<div className="flex flex-col items-center cursor-pointer">
										{/* Badge pill */}
										<div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/90 border border-cyan-400 text-cyan-300 text-[11px] font-bold shadow-lg whitespace-nowrap group-hover:scale-110 transition-transform">
											<span>FDI: {pin.toothFdi}</span>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteLandmark(pin.id);
												}}
												className="text-rose-400 hover:text-rose-200 ml-1"
												title="Удалить метку"
											>
												×
											</button>
										</div>
										{/* Pin Needle Indicator */}
										<div className="w-2.5 h-2.5 rounded-full bg-cyan-400 border border-slate-950 shadow-md -mt-0.5 animate-pulse" />
									</div>
								</div>
							))}
					</div>

					{/* ── BOTTOM-LEFT VIEWPORT HUD STATUS ── */}
					<div className="absolute left-4 bottom-4 z-30 hidden sm:flex flex-col gap-1 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] font-mono text-slate-400 backdrop-blur-sm pointer-events-none">
						<div className="flex items-center gap-2">
							<span className="text-slate-300 font-bold">Масштаб:</span>
							<span className="text-cyan-400 font-bold">{Math.round(zoom * 100)}%</span>
							<span>•</span>
							<span className="text-slate-300 font-bold">Поворот:</span>
							<span className="text-cyan-400 font-bold">{rotation}°</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-slate-300 font-bold">Калибровка:</span>
							<span>{study?.metadata?.pixelSpacingMm || 0.1} мм/пикс</span>
							<span>•</span>
							<span>
								Линеек: {measurements.length}, Меток: {landmarks.length}
							</span>
						</div>
					</div>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    3. SIDE DRAWER: METADATA & CLINICAL DIAGNOSTIC REPORT
				    ═══════════════════════════════════════════════════════════════════ */}
				{isSideDrawerOpen && (
					<aside
						aria-label="Сведения об исследовании и диагностическое заключение"
						className="w-80 md:w-96 bg-slate-900 border-l border-cyan-500/20 flex flex-col shrink-0 z-30 overflow-y-auto"
						data-testid="radiology-viewer-side-drawer"
					>
						{/* Header */}
						<div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-cyan-400" />
								<span className="text-xs font-bold uppercase tracking-wider text-slate-200">
									Сведения об исследовании
								</span>
							</div>
							<button
								type="button"
								onClick={() => setIsSideDrawerOpen(false)}
								className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
								title="Скрыть панель"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="p-5 flex flex-col gap-5 min-w-0">
							{/* Radiation Safety Card (SanPiN Compliant) */}
							<div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col gap-2.5">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
										Лучевая нагрузка
									</span>
									<span
										className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
											doseInfo.safetyZone === "green"
												? "bg-emerald-500/20 text-emerald-400"
												: doseInfo.safetyZone === "yellow"
													? "bg-amber-500/20 text-amber-400"
													: "bg-rose-500/20 text-rose-400"
										}`}
									>
										{doseInfo.safetyZone === "green"
											? "Зеленая зона"
											: doseInfo.safetyZone === "yellow"
												? "Желтая зона"
												: "Внимание"}
									</span>
								</div>
								<div className="text-lg font-bold text-slate-100">
									{doseInfo.fullText}
								</div>
								<p className="text-xs text-slate-400 leading-relaxed">
									Исследование выполнено с соблюдением принципа ALARA. Доза внесена в
									персональный радиационный паспорт пациента.
								</p>
							</div>

							{/* Anatomical Targets & Tooth Numbers */}
							<div className="flex flex-col gap-2">
								<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
									Анатомическая зона (FDI):
								</span>
								<div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
									<div className="text-sm font-bold text-cyan-300">
										{study?.anatomicalArea || "Обзорное исследование челюстей"}
									</div>
									{study?.teethFdi && study.teethFdi.length > 0 && (
										<div className="flex flex-wrap gap-1.5 mt-1">
											{study.teethFdi.map((t) => (
												<span
													key={t}
													className="px-2 py-1 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-bold"
												>
													Зуб {t}
												</span>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Diagnostic Description (Prevent text overflow per mandate) */}
							<div className="flex flex-col gap-2 min-w-0">
								<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
									Диагностическое описание:
								</span>
								<div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 leading-relaxed font-sans min-w-0 break-words">
									{study?.diagnosticNotes ? (
										<div className="whitespace-pre-line">{study.diagnosticNotes}</div>
									) : (
										<span className="text-slate-500 italic">
											Описание рентгенолога не внесено.
										</span>
									)}
								</div>
							</div>

							{/* AI Findings Summary if present */}
							{study?.aiFindings && (
								<div className="p-4 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 flex flex-col gap-2 min-w-0">
									<div className="flex items-center gap-2 text-cyan-300 font-bold text-xs">
										<Activity className="w-4 h-4" />
										<span>AI-Анализ снимка (Shadow Analyst)</span>
									</div>
									<p className="text-xs text-slate-300 min-w-0 break-words leading-relaxed">
										{study.aiFindings.summary || "Признаков скрытых патологий не выявлено."}
									</p>
									{study.aiFindings.confidence && (
										<div className="text-[11px] text-cyan-400 font-semibold mt-1">
											Уверенность модели: {Math.round(study.aiFindings.confidence * 100)}%
										</div>
									)}
								</div>
							)}

							{/* Active Measurements List */}
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
										Измерения ({measurements.length}):
									</span>
									{measurements.length > 0 && (
										<button
											type="button"
											onClick={() => setMeasurements([])}
											className="text-[11px] text-rose-400 hover:text-rose-200"
										>
											Очистить все
										</button>
									)}
								</div>

								{measurements.length === 0 ? (
									<div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 italic text-center">
										Нет активных линеек. Выберите инструмент «Линейка» (M).
									</div>
								) : (
									<div className="flex flex-col gap-1.5">
										{measurements.map((r, idx) => (
											<div
												key={r.id}
												className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
											>
												<span className="font-medium text-slate-300">
													#{idx + 1}. Дистанция:
												</span>
												<div className="flex items-center gap-2">
													<span className="font-bold text-cyan-400 text-sm">
														{r.distanceMm} мм
													</span>
													<button
														type="button"
														onClick={() => handleDeleteRuler(r.id)}
														className="text-slate-500 hover:text-rose-400 p-1"
													>
														<Trash2 className="w-3.5 h-3.5" />
													</button>
												</div>
											</div>
										))}
									</div>
								)}
							</div>

							{/* Landmarks List */}
							<div className="flex flex-col gap-2">
								<div className="flex items-center justify-between">
									<span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
										Метки зубов ({landmarks.length}):
									</span>
									{landmarks.length > 0 && (
										<button
											type="button"
											onClick={() => setLandmarks([])}
											className="text-[11px] text-rose-400 hover:text-rose-200"
										>
											Очистить все
										</button>
									)}
								</div>

								{landmarks.length === 0 ? (
									<div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-500 italic text-center">
										Нет меток. Выберите инструмент «Метка» (L).
									</div>
								) : (
									<div className="flex flex-col gap-1.5">
										{landmarks.map((p) => (
											<div
												key={p.id}
												className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs"
											>
												<div className="flex flex-col min-w-0">
													<span className="font-bold text-cyan-300">
														Зуб FDI: {p.toothFdi}
													</span>
													<span className="text-[11px] text-slate-400 truncate">
														{p.label}
													</span>
												</div>
												<button
													type="button"
													onClick={() => handleDeleteLandmark(p.id)}
													className="text-slate-500 hover:text-rose-400 p-1"
												>
													<Trash2 className="w-3.5 h-3.5" />
												</button>
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</aside>
				)}
			</div>
		</div>,
		document.body,
	);
};
