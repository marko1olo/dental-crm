import {
	Activity,
	AlertCircle,
	AlertTriangle,
	ArrowLeft,
	Box,
	Camera,
	Check,
	ChevronRight,
	Columns,
	Compass,
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
	ShieldAlert,
	ShieldCheck,
	Sliders,
	Spline,
	Sun,
	Tag,
	Target,
	Trash2,
	UploadCloud,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
	ADULT_FDI_TEETH,
	calculateCaliperRidgeDimensions,
	calculateDistanceMm,
	calculatePointToNerveDistance2D,
	buildMandibularNerveSpline,
	evaluateNerveClearance,
	FDI_TOOTH_NAMES,
	formatRadiationDose,
	generateNerveSafetyCorridor2D,
	interpolateNerveSpline2D,
	LANDMARK_TYPE_LABELS,
	MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
} from "./radiologyMath";
import { CbctMprImplantStudioModal } from "./CbctMprImplantStudioModal";
import { CbctMprViewer } from "./CbctMprViewer";
import {
	MedicalRadiologyDropzone,
	SAMPLE_PATIENT_RVG_URL,
} from "./MedicalRadiologyDropzone";

import {
	DEFAULT_WW_WL_PRESETS,
	type AlveolarRidgeCaliperMeasurement,
	type LandmarkPin,
	type MandibularNerveSpline,
	type MeasurementRuler,
	type Point2D,
	type RadiologyStudy,
	type RadiologyViewerTool,
	type WindowLevelPreset,
} from "./types";

export interface RadiologyViewerModalProps {
	isOpen: boolean;
	onClose: () => void;
	study: RadiologyStudy | null;
	studyDate?: string | undefined;
	currentReceptionDate?: string | undefined;
	onSaveStudy?: (updatedStudy: RadiologyStudy) => void;
	onOpenReferralModal?: (study: RadiologyStudy) => void;
	onOpenDoseSheetModal?: (study: RadiologyStudy) => void;
}

export const RadiologyViewerModal: React.FC<RadiologyViewerModalProps> = ({
	isOpen,
	onClose,
	study,
	studyDate,
	currentReceptionDate,
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
	const [calipers, setCalipers] = useState<AlveolarRidgeCaliperMeasurement[]>([]);
	const [nerves, setNerves] = useState<MandibularNerveSpline[]>([]);

	// In-progress interactive tool states
	const [activeRulerStart, setActiveRulerStart] = useState<{ x: number; y: number } | null>(null);
	const [activeCaliperStart, setActiveCaliperStart] = useState<{ x: number; y: number } | null>(null);
	const [activeNervePoints, setActiveNervePoints] = useState<Array<{ x: number; y: number }>>([]);
	const [activeNerveSide, setActiveNerveSide] = useState<"left" | "right">("right");
	const [mousePosPercent, setMousePosPercent] = useState<{ x: number; y: number } | null>(null);

	// Landmark Placement Dialog
	const [pendingLandmarkPos, setPendingLandmarkPos] = useState<{ x: number; y: number } | null>(null);
	const [selectedFdiTooth, setSelectedFdiTooth] = useState<string>("36");
	const [landmarkType, setLandmarkType] = useState<LandmarkPin["type"]>("tooth");
	const [landmarkCustomLabel, setLandmarkCustomLabel] = useState<string>("");

	// HUD and Panels (Side drawer collapsed by default on mobile <768px)
	const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
	const [isSideDrawerOpen, setIsSideDrawerOpen] = useState<boolean>(() => {
		if (typeof window !== "undefined") {
			return window.innerWidth >= 768;
		}
		return false;
	});
	const [isControlsExpanded, setIsControlsExpanded] = useState<boolean>(false);
	const [isCbctStudioOpen, setIsCbctStudioOpen] = useState<boolean>(false);
	const [isMprViewerOpen, setIsMprViewerOpen] = useState<boolean>(false);
	const [loadedImageUrl, setLoadedImageUrl] = useState<string | null>(null);
	const [isDropzoneOpen, setIsDropzoneOpen] = useState<boolean>(false);
	const [isMobileToolbarExpanded, setIsMobileToolbarExpanded] = useState<boolean>(false);
	const [isCalipersAccordionOpen, setIsCalipersAccordionOpen] = useState<boolean>(false);
	const [isNervesAccordionOpen, setIsNervesAccordionOpen] = useState<boolean>(false);

	const activeImageUrl = loadedImageUrl !== null ? loadedImageUrl : (study?.imageUrl || "");
	const isImageLoaded = Boolean(activeImageUrl) && !isDropzoneOpen;
	const visibleLandmarks = isImageLoaded ? landmarks : [];
	const visibleMeasurements = isImageLoaded ? measurements : [];
	const visibleCalipers = isImageLoaded ? calipers : [];
	const visibleNerves = isImageLoaded ? nerves : [];

	const handleDropzoneImageLoaded = (
		dataUrl: string,
		meta?: { name: string; size: number; type: string },
	) => {
		setLoadedImageUrl(dataUrl);
		setIsDropzoneOpen(false);
		if (study && onSaveStudy) {
			const syncedDate =
				study.studyDate ||
				studyDate ||
				currentReceptionDate ||
				new Date().toISOString().replace("T", " ").substring(0, 16);
			onSaveStudy({
				...study,
				studyDate: syncedDate,
				imageUrl: dataUrl,
				diagnosticNotes: study.diagnosticNotes || (meta ? `Загружен снимок: ${meta.name}` : ""),
				metadata: {
					...study.metadata,
					pixelSpacingMm: study.metadata?.pixelSpacingMm || 0.05,
				},
			});
		}
	};

	const handleLoadSampleRadiograph = () => {
		handleDropzoneImageLoaded(SAMPLE_PATIENT_RVG_URL, {
			name: "SMIRNOVA_E_V_tooth16_RVG_postop.jpg",
			size: 700609,
			type: "image/jpeg",
		});
	};

	// Dragging state
	const [isDragging, setIsDragging] = useState<boolean>(false);
	const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

	// Sync study measurements and landmarks on load
	useEffect(() => {
		if (study) {
			setLoadedImageUrl(study.imageUrl || null);
			setMeasurements(study.measurements || []);
			setLandmarks(study.landmarks || []);
			setCalipers(study.calipers || []);
			setNerves(study.nerves || []);
			// Set initial FDI tooth from study if available
			if (study.teethFdi && study.teethFdi.length > 0 && study.teethFdi[0]) {
				setSelectedFdiTooth(study.teethFdi[0] ?? "16");
			}
		} else {
			setLoadedImageUrl(null);
		}
		setIsDropzoneOpen(false);
		if (typeof window !== "undefined") {
			setIsSideDrawerOpen(window.innerWidth >= 768);
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
		setActiveCaliperStart(null);
		setActiveNervePoints([]);
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
				} else if (activeCaliperStart) {
					setActiveCaliperStart(null);
				} else if (activeNervePoints.length > 0) {
					setActiveNervePoints([]);
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
			} else if (e.key.toLowerCase() === "c") {
				setActiveTool("caliper");
			} else if (e.key.toLowerCase() === "n") {
				setActiveTool("nerve_tracer");
			} else if (e.key.toLowerCase() === "l") {
				setActiveTool("landmark");
			} else if (e.key.toLowerCase() === "p") {
				setActiveTool("pan");
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, pendingLandmarkPos, activeRulerStart, activeCaliperStart, activeNervePoints, onClose]);

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
					color: "var(--teal, #06b6d4)",
				};

				const updated = [...measurements, newRuler];
				setMeasurements(updated);
				setActiveRulerStart(null);

				if (study && onSaveStudy) {
					onSaveStudy({ ...study, measurements: updated });
				}
			}
		} else if (activeTool === "caliper") {
			if (!activeCaliperStart) {
				setActiveCaliperStart(coords);
			} else {
				const pixelSpacing = study?.metadata?.pixelSpacingMm || 0.1;
				const imgW = imageRef.current?.naturalWidth || 1200;
				const imgH = imageRef.current?.naturalHeight || 1200;

				const dx = coords.x - activeCaliperStart.x;
				const dy = coords.y - activeCaliperStart.y;
				const len = Math.hypot(dx, dy) || 1;
				const nx = -dy / len;
				const ny = dx / len;
				const halfWidthMm = 3.5;
				const halfWidthPctX = ((halfWidthMm / pixelSpacing) / imgW) * 100;
				const halfWidthPctY = ((halfWidthMm / pixelSpacing) / imgH) * 100;

				const newCaliper = calculateCaliperRidgeDimensions({
					crestPoint: activeCaliperStart,
					basePoint: coords,
					crestWidthLeft: {
						x: Number((activeCaliperStart.x - nx * halfWidthPctX).toFixed(2)),
						y: Number((activeCaliperStart.y - ny * halfWidthPctY).toFixed(2)),
					},
					crestWidthRight: {
						x: Number((activeCaliperStart.x + nx * halfWidthPctX).toFixed(2)),
						y: Number((activeCaliperStart.y + ny * halfWidthPctY).toFixed(2)),
					},
					imageWidthPx: imgW,
					imageHeightPx: imgH,
					pixelSpacingMm: pixelSpacing,
					fdiTooth: selectedFdiTooth,
				});

				const updated = [...calipers, newCaliper];
				setCalipers(updated);
				setActiveCaliperStart(null);

				if (study && onSaveStudy) {
					onSaveStudy({ ...study, calipers: updated });
				}
			}
		} else if (activeTool === "nerve_tracer") {
			const nextPts = [...activeNervePoints, coords];
			setActiveNervePoints(nextPts);
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

		const coords = getImagePercentCoords(e);
		if (coords) {
			setMousePosPercent(coords);
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

	// Finish Nerve Spline
	const handleFinishNerveSpline = () => {
		if (activeNervePoints.length < 2) return;
		const pixelSpacing = study?.metadata?.pixelSpacingMm || 0.1;
		const imgW = imageRef.current?.naturalWidth || 1200;
		const imgH = imageRef.current?.naturalHeight || 1200;

		const newNerve = buildMandibularNerveSpline({
			side: activeNerveSide,
			controlPoints: activeNervePoints,
			imageWidthPx: imgW,
			imageHeightPx: imgH,
			pixelSpacingMm: pixelSpacing,
			safetyMarginMm: MANDIBULAR_NERVE_SAFETY_MARGIN_MM,
		});

		const updated = [...nerves, newNerve];
		setNerves(updated);
		setActiveNervePoints([]);

		if (study && onSaveStudy) {
			onSaveStudy({ ...study, nerves: updated });
		}
	};

	// Delete Caliper
	const handleDeleteCaliper = (caliperId: string) => {
		const updated = calipers.filter((c) => c.id !== caliperId);
		setCalipers(updated);
		if (study && onSaveStudy) {
			onSaveStudy({ ...study, calipers: updated });
		}
	};

	// Delete Nerve
	const handleDeleteNerve = (nerveId: string) => {
		const updated = nerves.filter((n) => n.id !== nerveId);
		setNerves(updated);
		if (study && onSaveStudy) {
			onSaveStudy({ ...study, nerves: updated });
		}
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
			color: landmarkType === "caries" ? "var(--danger, #ef4444)" : landmarkType === "apex" ? "var(--ok, #10b981)" : "var(--teal, #06b6d4)",
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

	// Dynamic jaw check (Upper jaw: teeth 11-28, 51-65 => Maxillary Sinus; Lower jaw: 31-48, 71-85 => Mandibular Canal)
	const isUpperJaw = useMemo(() => {
		const toothStr = selectedFdiTooth || (study?.teethFdi && study.teethFdi[0]) || "16";
		const toothNum = Number.parseInt(toothStr, 10);
		return (toothNum >= 11 && toothNum <= 28) || (toothNum >= 51 && toothNum <= 65);
	}, [selectedFdiTooth, study?.teethFdi]);

	// Nerve & Maxillary sinus proximity clearance calculation
	const nerveClearanceInfo = useMemo(() => {
		if (nerves.length === 0) return null;
		const pixelSpacing = study?.metadata?.pixelSpacingMm || 0.1;
		const imgW = imageRef.current?.naturalWidth || 1200;
		const imgH = imageRef.current?.naturalHeight || 1200;

		let minClearanceMm = Infinity;
		for (const nerve of nerves) {
			for (const cal of calipers) {
				const res = calculatePointToNerveDistance2D(cal.basePoint, nerve.interpolatedCurve, imgW, imgH, pixelSpacing);
				if (res.distanceMm < minClearanceMm) minClearanceMm = res.distanceMm;
			}
			for (const pin of landmarks) {
				if (pin.type === "implant_site" || pin.type === "apex") {
					const res = calculatePointToNerveDistance2D({ x: pin.x, y: pin.y }, nerve.interpolatedCurve, imgW, imgH, pixelSpacing);
					if (res.distanceMm < minClearanceMm) minClearanceMm = res.distanceMm;
				}
			}
			if (activeCaliperStart && mousePosPercent) {
				const res = calculatePointToNerveDistance2D(mousePosPercent, nerve.interpolatedCurve, imgW, imgH, pixelSpacing);
				if (res.distanceMm < minClearanceMm) minClearanceMm = res.distanceMm;
			}
		}

		if (!Number.isFinite(minClearanceMm)) return null;
		const clearance = evaluateNerveClearance(minClearanceMm, MANDIBULAR_NERVE_SAFETY_MARGIN_MM);
		if (isUpperJaw) {
			return {
				...clearance,
				messageRu: clearance.isDanger
					? `ОПАСНОСТЬ: Расстояние до дна гайморовой пазухи ${minClearanceMm.toFixed(1)} мм < 2.0 мм!`
					: `Субантральный зазор до дна гайморовой пазухи: ${minClearanceMm.toFixed(1)} мм (Безопасная зона)`,
			};
		}
		return clearance;
	}, [nerves, calipers, landmarks, activeCaliperStart, mousePosPercent, study?.metadata?.pixelSpacingMm, isUpperJaw]);

	// Dose calculations
	const doseInfo = useMemo(() => {
		return formatRadiationDose(study?.effectiveDoseMicrosv ?? 25.0);
	}, [study?.effectiveDoseMicrosv]);

	if (!isOpen) return null;

	const studyTitle = study?.anatomicalArea || "Рентгенологическое исследование";
	const studyDateFormatted = useMemo(() => {
		const rawDate = study?.studyDate || studyDate || currentReceptionDate;
		if (rawDate && rawDate.trim()) {
			const str = rawDate.trim();
			// Handle YYYYMMDD DICOM format
			if (/^\d{8}$/.test(str)) {
				const y = str.slice(0, 4);
				const m = str.slice(4, 6);
				const d = str.slice(6, 8);
				return `${d}.${m}.${y}`;
			}
			// Handle ISO date format YYYY-MM-DD or YYYY-MM-DD HH:mm
			if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
				const [datePart, timePart] = str.replace("T", " ").split(" ");
				const [y, m, d] = (datePart ?? "").split("-");
				return timePart ? `${d}.${m}.${y} ${timePart.substring(0, 5)}` : `${d}.${m}.${y}`;
			}
			return str;
		}
		const now = new Date();
		const d = String(now.getDate()).padStart(2, "0");
		const m = String(now.getMonth() + 1).padStart(2, "0");
		const y = now.getFullYear();
		return `${d}.${m}.${y}`;
	}, [study?.studyDate, studyDate, currentReceptionDate]);
	const patientName = study?.patientName || "Пациент";
	const doctorName = study?.doctorName || "Врач-рентгенолог";
	const modalityLabel = study?.modalityLabel || "3D КЛКТ / ОПТГ";

	const modalContent = (
		<div
			id={modalId}
			className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-[var(--ink,#f8fafc)] select-none overflow-hidden animate-in fade-in duration-200"
			role="dialog"
			aria-modal="true"
			aria-label="Кибер-просмотрщик лучевой диагностики"
			data-testid="radiology-viewer-modal"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. TOP CYBER HUD BAR (Ergonomic Header)
			    ═══════════════════════════════════════════════════════════════════ */}
			<header className="flex items-center justify-between px-4 py-2.5 bg-[var(--paper-soft,#0f172a)] border-b border-[var(--line,#334155)] backdrop-blur-md z-30 shrink-0 text-[var(--ink,#f8fafc)]">
				{/* Left: Study Title, Modality & Patient Info */}
				<div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
					<button
						type="button"
						onClick={onClose}
						className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] text-[var(--ink,#cbd5e1)] hover:text-[var(--teal)] hover:border-[var(--teal-soft)] active:scale-95 transition-all shrink-0"
						title="Закрыть просмотрщик (Esc)"
						data-testid="radiology-viewer-close-btn"
					>
						<ArrowLeft className="w-5 h-5" />
					</button>

					<div className="flex flex-col min-w-0 flex-1">
						<div className="flex items-center gap-2 flex-wrap min-w-0">
							<span className="whitespace-nowrap text-[11px] px-2.5 py-1 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] font-bold uppercase tracking-wide shrink-0">
								{modalityLabel}
							</span>
							<h1 className="text-xs sm:text-sm md:text-base font-bold text-[var(--ink,#f8fafc)] min-w-0 truncate">
								{studyTitle}
							</h1>
						</div>
						<div className="flex items-center gap-2 sm:gap-3 text-xs text-[var(--muted,#94a3b8)] min-w-0 flex-wrap mt-0.5">
							<span className="font-semibold text-[var(--ink,#e2e8f0)] whitespace-nowrap shrink-0">
								Пациент: {patientName}
							</span>
							<span className="hidden xs:inline text-[var(--line,#475569)]">•</span>
							<span className="hidden sm:inline whitespace-nowrap">Врач: {doctorName}</span>
							<span className="hidden md:inline text-[var(--line,#475569)]">•</span>
							<span className="hidden md:inline font-bold text-[var(--teal)] whitespace-nowrap">
								Дата: {studyDateFormatted}
							</span>
						</div>
					</div>
				</div>

				{/* Center: High-contrast Radiation Dose Badge & Tooth FDI */}
				<div className="hidden lg:flex items-center gap-3">
					{study?.teethFdi && study.teethFdi.length > 0 && (
						<div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] shadow-sm">
							<Target className="w-4 h-4 text-[var(--teal)] shrink-0" />
							<span className="text-xs font-medium text-[var(--muted,#cbd5e1)]">Зубы FDI:</span>
							<span className="text-sm font-bold text-[var(--teal)]">
								{study.teethFdi.map((t) => (FDI_TOOTH_NAMES[t] ? `Зуб ${t} (${FDI_TOOTH_NAMES[t]})` : `Зуб ${t}`)).join(", ")}
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
								? "bg-[var(--teal-surface)] border-[var(--teal-soft)] text-[var(--teal)]"
								: "bg-[var(--paper,#1e293b)] border-[var(--line,#334155)] text-[var(--muted,#94a3b8)] hover:text-[var(--ink)]"
						}`}
						title={isHudVisible ? "Скрыть аннотации" : "Показать аннотации"}
						aria-label={isHudVisible ? "Скрыть аннотации" : "Показать аннотации"}
						data-testid="toggle-annotations-hud-btn"
					>
						{isHudVisible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
					</button>

					{onOpenReferralModal && study && (
						<button
							type="button"
							onClick={() => onOpenReferralModal(study)}
							className="hidden sm:flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] hover:border-[var(--teal-soft)] text-[var(--ink,#cbd5e1)] hover:text-[var(--teal)] text-xs font-bold transition-all"
							title="Оформить направление на дообследование"
						>
							<FileText className="w-4 h-4 text-[var(--teal)]" />
							<span>Направление</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => setIsMprViewerOpen(true)}
						className="flex items-center gap-2 min-h-[44px] px-2.5 sm:px-3.5 py-2 rounded-xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] hover:bg-[var(--teal)] text-[var(--teal)] hover:text-[var(--on-teal,#ffffff)] text-xs font-bold transition-all shadow-sm"
						title="Открыть 3D MPR мультипланарную реконструкцию и панораму зубной дуги"
						data-testid="open-mpr-viewer-modal-btn"
					>
						<Layers className="w-4 h-4" />
						<span className="hidden sm:inline">3D MPR / ОПТГ</span>
					</button>

					{study?.modality === "cbct_3d" && (
						<button
							type="button"
							onClick={() => setIsCbctStudioOpen(true)}
							className="flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--teal-fill,var(--teal))] hover:opacity-90 text-[var(--on-teal,#ffffff)] text-xs font-bold shadow-md transition-all"
							title="Открыть 3D MPR имплант-планировщик"
							data-testid="open-cbct-mpr-studio-from-viewer-btn"
						>
							<Box className="w-4 h-4" />
							<span>Имплант-студия</span>
						</button>
					)}

					{onOpenDoseSheetModal && study && (
						<button
							type="button"
							onClick={() => onOpenDoseSheetModal(study)}
							className="hidden md:flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] hover:border-[var(--teal-soft)] text-[var(--ink,#cbd5e1)] hover:text-[var(--teal)] text-xs font-bold transition-all"
							title="Лист учета дозовых нагрузок (СанПиН)"
						>
							<Activity className="w-4 h-4 text-[var(--teal)]" />
							<span>Лист доз</span>
						</button>
					)}

					{/* Mobile/Desktop Sidebar Toggle (Collapsed by default on <768px with compact "Инфо" button) */}
					<button
						type="button"
						onClick={() => setIsSideDrawerOpen((prev) => !prev)}
						className={`flex items-center gap-1.5 min-h-[44px] px-3 py-2 rounded-xl border transition-all ${
							isSideDrawerOpen
								? "bg-[var(--teal-surface)] border-[var(--teal-soft)] text-[var(--teal)]"
								: "bg-[var(--paper,#1e293b)] border-[var(--line,#334155)] text-[var(--ink,#cbd5e1)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft,#0f172a)]"
						}`}
						title="Сведения об исследовании и заключение"
						data-testid="toggle-side-drawer-btn"
					>
						<Info className="w-4 h-4 text-[var(--teal)]" />
						<span className="text-xs font-bold sm:hidden">Инфо</span>
						<span className="hidden sm:inline text-xs font-bold">Сведения</span>
					</button>
				</div>
			</header>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. MAIN WORKSPACE: VIEWPORT + TOOLBAR + SIDE DRAWER
			    ═══════════════════════════════════════════════════════════════════ */}
			<div className="relative flex-1 flex min-h-0 bg-slate-900 border border-slate-700 overflow-hidden">
				{/* Mobile Toolbar Toggle Button (< md) */}
				{activeImageUrl && !isDropzoneOpen && (
					<button
						type="button"
						onClick={() => setIsMobileToolbarExpanded((prev) => !prev)}
						className="md:hidden absolute left-3 top-3 z-40 flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/95 border border-teal-500/50 text-teal-300 shadow-xl cursor-pointer"
						title="Панель инструментов"
						data-testid="toggle-mobile-toolbar-btn"
					>
						<Sliders className="w-5 h-5" />
					</button>
				)}

				{/* ── TOOLBAR (Floating Cyber Dock: Compact 44px width, 34x34px buttons, 18px icons) ── */}
				<nav
					aria-label="Инструменты управления просмотрщиком"
					className={`absolute left-2 sm:left-3 top-14 sm:top-4 z-40 w-11 flex flex-col gap-1 p-1 rounded-xl bg-slate-900/95 border border-slate-700/70 shadow-2xl backdrop-blur-md ${
						!activeImageUrl || isDropzoneOpen
							? "hidden md:flex"
							: isMobileToolbarExpanded
								? "flex"
								: "hidden md:flex"
					}`}
				>
					{/* Primary Interactive Tools */}
					<div className={`flex flex-col gap-1 pb-1.5 border-b border-slate-700/70 ${!isImageLoaded ? "opacity-40 pointer-events-none" : ""}`}>
						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => {
								setActiveTool("pan");
								setActiveRulerStart(null);
								setActiveCaliperStart(null);
							}}
							className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
								activeTool === "pan"
									? "bg-teal-950/70 border-2 border-teal-400 text-teal-300 shadow-sm"
									: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
							}`}
							title="Панорамирование / Перемещение (P)"
							data-testid="tool-pan-btn"
						>
							<Move className="w-[18px] h-[18px]" />
						</button>

						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => {
								setActiveTool("caliper");
								setActiveRulerStart(null);
								setPendingLandmarkPos(null);
							}}
							className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
								activeTool === "caliper"
									? "bg-teal-950/70 border-2 border-teal-400 text-teal-300 shadow-sm"
									: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
							}`}
							title="Электронный штангенциркуль альвеолярного гребня (C)"
							data-testid="tool-caliper-btn"
						>
							<Compass className="w-[18px] h-[18px]" />
						</button>

						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => {
								setActiveTool("nerve_tracer");
								setActiveRulerStart(null);
								setActiveCaliperStart(null);
								setPendingLandmarkPos(null);
							}}
							className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
								activeTool === "nerve_tracer"
									? "bg-amber-950/70 border-2 border-amber-400 text-amber-300 shadow-sm"
									: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-amber-300 hover:bg-slate-700"
							}`}
							title={
								isUpperJaw
									? "Трассировщик дна гайморовой пазухи (Sinus maxillaris) (N)"
									: "Трассировщик нижнечелюстного канала (Safety Margin 2.0 мм) (N)"
							}
							data-testid="tool-nerve-tracer-btn"
						>
							<Spline className="w-[18px] h-[18px]" />
						</button>

						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => {
								setActiveTool("ruler");
								setActiveCaliperStart(null);
								setPendingLandmarkPos(null);
							}}
							className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
								activeTool === "ruler"
									? "bg-teal-950/70 border-2 border-teal-400 text-teal-300 shadow-sm"
									: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
							}`}
							title="Измерительная 2-точечная линейка в мм (M)"
							data-testid="tool-ruler-btn"
						>
							<Ruler className="w-[18px] h-[18px]" />
						</button>

						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => {
								setActiveTool("landmark");
								setActiveRulerStart(null);
								setActiveCaliperStart(null);
							}}
							className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
								activeTool === "landmark"
									? "bg-teal-950/70 border-2 border-teal-400 text-teal-300 shadow-sm"
									: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
							}`}
							title="Установка анатомической метки зуба / апекса (L)"
							data-testid="tool-landmark-btn"
						>
							<Pin className="w-[18px] h-[18px]" />
						</button>
					</div>

					{/* Zoom Controls */}
					<div className={`flex flex-col gap-1 pb-1.5 border-b border-slate-700/70 ${!isImageLoaded ? "opacity-40 pointer-events-none" : ""}`}>
						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => setZoom((prev) => Math.min(prev + 0.25, 6.0))}
							className="w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
							title="Увеличить (+)"
						>
							<ZoomIn className="w-[18px] h-[18px]" />
						</button>

						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => setZoom((prev) => Math.max(prev - 0.25, 0.2))}
							className="w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
							title="Уменьшить (-)"
						>
							<Minus className="w-[18px] h-[18px]" />
						</button>

						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => {
								setZoom(1.0);
								setPan({ x: 0, y: 0 });
							}}
							className="w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1 rounded-lg flex items-center justify-center bg-slate-800/90 border border-slate-700/80 text-[10px] font-mono font-bold text-teal-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
							title="Сброс масштаба 100% (0)"
						>
							100%
						</button>
					</div>

					{/* Image Transformations (Rotation & Flip) */}
					<div className="flex flex-col gap-1 pb-1.5 border-b border-slate-700/70">
						<div className={`flex flex-col gap-1 ${!isImageLoaded ? "opacity-40 pointer-events-none" : ""}`}>
							<button
								type="button"
								disabled={!isImageLoaded}
								onClick={() => setRotation((prev) => (prev + 90) % 360)}
								className="w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
								title={`Поворот по часовой стрелке 90° (R) — текущий: ${rotation}°`}
								data-testid="tool-rotate-btn"
							>
								<RotateCw className="w-[18px] h-[18px]" />
							</button>

							<button
								type="button"
								disabled={!isImageLoaded}
								onClick={() => setFlipH((prev) => !prev)}
								className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
									flipH
										? "bg-teal-950/70 border-2 border-teal-400 text-teal-300"
										: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
								}`}
								title="Зеркальное отражение по горизонтали"
							>
								<FlipHorizontal className="w-[18px] h-[18px]" />
							</button>

							<button
								type="button"
								disabled={!isImageLoaded}
								onClick={() => setInvert((prev) => !prev)}
								className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
									invert
										? "bg-amber-950/70 border-2 border-amber-400 text-amber-300"
										: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
								}`}
								title="Инверсия негатив / позитив (I)"
							>
								<Sun className="w-[18px] h-[18px]" />
							</button>
						</div>

						<button
							type="button"
							onClick={() => setIsDropzoneOpen((prev) => !prev)}
							className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer ${
								isDropzoneOpen
									? "bg-teal-950/70 border-2 border-teal-400 text-teal-300 shadow-sm"
									: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
							}`}
							title="Загрузить снимок (DICOM / RVG Дропзона)"
							data-testid="viewer-toggle-dropzone-btn"
						>
							<UploadCloud className="w-[18px] h-[18px]" />
						</button>
					</div>

					{/* Sliders and Reset */}
					<div className={`flex flex-col gap-1 ${!isImageLoaded ? "opacity-40 pointer-events-none" : ""}`}>
						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={() => setIsControlsExpanded((prev) => !prev)}
							className={`w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
								isControlsExpanded
									? "bg-teal-950/70 border-2 border-teal-400 text-teal-300"
									: "bg-slate-800/90 border border-slate-700/80 text-slate-200 hover:text-white hover:bg-slate-700"
							}`}
							title="Настройка яркости и контраста (WW/WL)"
						>
							<Sliders className="w-[18px] h-[18px]" />
						</button>

						<button
							type="button"
							disabled={!isImageLoaded}
							onClick={handleResetAll}
							className="w-[34px] h-[34px] min-h-[34px] min-w-[34px] p-1.5 rounded-lg flex items-center justify-center bg-rose-950/40 border border-rose-800/50 text-rose-300 hover:bg-rose-900/60 hover:text-rose-100 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
							title="Сбросить все настройки снимка"
						>
							<RefreshCcw className="w-[18px] h-[18px]" />
						</button>
					</div>
				</nav>


				{/* ── EXPANDED CONTROLS POPUP (Sliders for Brightness/Contrast) ── */}
				{isControlsExpanded && (
					<div className="absolute left-20 top-24 z-40 w-72 p-4 rounded-2xl bg-[var(--paper-soft,#0f172a)]/95 border border-[var(--teal-soft)]/40 shadow-2xl backdrop-blur-md flex flex-col gap-4 text-xs text-[var(--ink,#f8fafc)]">
						<div className="flex items-center justify-between border-b border-[var(--line,#334155)] pb-2">
							<span className="font-bold text-[var(--ink,#f8fafc)] uppercase tracking-wide">
								Точная калибровка WW/WL
							</span>
							<button
								type="button"
								onClick={() => setIsControlsExpanded(false)}
								className="p-1 rounded-lg text-[var(--muted,#94a3b8)] hover:text-[var(--ink)]"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Brightness Slider */}
						<div>
							<div className="flex justify-between font-semibold text-[var(--ink,#f8fafc)] mb-1.5">
								<span>Яркость (WL):</span>
								<span className="font-mono text-[var(--teal)] font-bold">{brightness}%</span>
							</div>
							<input
								type="range"
								min="20"
								max="200"
								value={brightness}
								onChange={(e) => setBrightness(Number(e.target.value))}
								className="w-full h-2 rounded-lg bg-[var(--line,#334155)] accent-[var(--teal)] cursor-pointer"
							/>
						</div>

						{/* Contrast Slider */}
						<div>
							<div className="flex justify-between font-semibold text-[var(--ink,#f8fafc)] mb-1.5">
								<span>Контрастность (WW):</span>
								<span className="font-mono text-[var(--teal)] font-bold">{contrast}%</span>
							</div>
							<input
								type="range"
								min="30"
								max="250"
								value={contrast}
								onChange={(e) => setContrast(Number(e.target.value))}
								className="w-full h-2 rounded-lg bg-[var(--line,#334155)] accent-[var(--teal)] cursor-pointer"
							/>
						</div>

						<div className="flex items-center justify-between pt-2 border-t border-[var(--line,#334155)]">
							<label className="flex items-center gap-2 cursor-pointer text-[var(--ink,#f8fafc)]">
								<input
									type="checkbox"
									checked={invert}
									onChange={(e) => setInvert(e.target.checked)}
									className="w-4 h-4 rounded text-[var(--teal)] focus:ring-0 bg-[var(--paper,#1e293b)] border-[var(--line,#334155)]"
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
								className="px-2.5 py-1 text-[11px] rounded-lg bg-[var(--paper,#1e293b)] text-[var(--ink,#cbd5e1)] hover:text-[var(--ink)]"
							>
								Сброс
							</button>
						</div>
					</div>
				)}

				{/* ── LANDMARK PIN PLACEMENT DIALOG ── */}
				{pendingLandmarkPos && (
					<div
						className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-[calc(100vw-24px)] sm:max-w-md p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft,#0f172a)] border-2 border-[var(--teal)] shadow-2xl flex flex-col gap-3 sm:gap-4 text-[var(--ink,#f8fafc)] animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
						data-testid="landmark-picker-modal"
					>
						<div className="flex items-center justify-between border-b border-[var(--line,#334155)] pb-2">
							<div className="flex items-center gap-2">
								<Pin className="w-5 h-5 text-[var(--teal)]" />
								<span className="font-bold text-sm">Установка метки зуба / структуры</span>
							</div>
							<button
								type="button"
								onClick={() => setPendingLandmarkPos(null)}
								className="p-1 rounded-lg text-[var(--muted,#94a3b8)] hover:text-[var(--ink)]"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						{/* Type of Landmark */}
						<div>
							<label
								htmlFor="landmark-type-select"
								className="text-xs font-bold uppercase text-[var(--muted,#94a3b8)] mb-1.5 block"
							>
								1. Тип анатомической структуры:
							</label>
							<select
								id="landmark-type-select"
								value={landmarkType}
								onChange={(e) => setLandmarkType(e.target.value as LandmarkPin["type"])}
								className="w-full px-3 py-2.5 text-xs rounded-xl bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] font-semibold focus:outline-none focus:border-[var(--teal)]"
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
							<span className="text-xs font-bold uppercase text-[var(--muted,#94a3b8)] mb-1.5 block">
								2. Выберите зуб (FDI):
							</span>
							<div className="flex flex-col gap-1 bg-[var(--paper,#020617)]/80 p-2 rounded-xl border border-[var(--line,#1e293b)]">
								{/* Upper jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pb-1">
									{ADULT_FDI_TEETH.quadrant1.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedFdiTooth(tooth)}
											className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-lg transition-all ${
												selectedFdiTooth === tooth
													? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md font-extrabold"
													: "bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#cbd5e1)] hover:bg-[var(--paper,#0f172a)]"
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
													? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md font-extrabold"
													: "bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#cbd5e1)] hover:bg-[var(--paper,#0f172a)]"
											}`}
										>
											{tooth}
										</button>
									))}
								</div>
								{/* Lower jaw */}
								<div className="flex justify-between gap-1 overflow-x-auto pt-1 border-t border-[var(--line,#1e293b)]">
									{ADULT_FDI_TEETH.quadrant4.map((tooth) => (
										<button
											key={tooth}
											type="button"
											onClick={() => setSelectedFdiTooth(tooth)}
											className={`min-h-[44px] min-w-[44px] p-2 text-xs font-bold rounded-lg transition-all ${
												selectedFdiTooth === tooth
													? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md font-extrabold"
													: "bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#cbd5e1)] hover:bg-[var(--paper,#0f172a)]"
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
													? "bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-md font-extrabold"
													: "bg-[var(--paper-soft,#1e293b)] text-[var(--ink,#cbd5e1)] hover:bg-[var(--paper,#0f172a)]"
											}`}
										>
											{tooth}
										</button>
									))}
								</div>
							</div>
							<p className="text-xs text-[var(--teal)] mt-1.5 font-bold min-w-0 break-words leading-relaxed">
								{selectedFdiTooth ? `Зуб ${selectedFdiTooth} (${FDI_TOOTH_NAMES[selectedFdiTooth] || "Зуб"})` : "Зуб не выбран"}
							</p>
						</div>

						{/* Custom Note/Label */}
						<div>
							<label
								htmlFor="landmark-custom-note"
								className="text-xs font-bold uppercase text-[var(--muted,#94a3b8)] mb-1 block"
							>
								3. Дополнительное примечание (опционально):
							</label>
							<input
								id="landmark-custom-note"
								type="text"
								value={landmarkCustomLabel}
								onChange={(e) => setLandmarkCustomLabel(e.target.value)}
								placeholder="Например: Деструкция кости d=3.5мм, апекс..."
								className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--paper,#1e293b)] border border-[var(--line,#334155)] text-[var(--ink,#f8fafc)] focus:outline-none focus:border-[var(--teal)]"
							/>
						</div>

						{/* Actions */}
						<div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line,#334155)]">
							<button
								type="button"
								onClick={() => setPendingLandmarkPos(null)}
								className="min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl bg-[var(--paper,#1e293b)] text-[var(--ink,#cbd5e1)] hover:text-[var(--ink)]"
							>
								Отмена
							</button>
							<button
								type="button"
								onClick={handleConfirmLandmark}
								className="min-h-[44px] px-5 py-2 text-xs font-bold rounded-xl bg-[var(--teal-fill,var(--teal))] text-[var(--on-teal,#ffffff)] shadow-lg hover:opacity-90 font-extrabold"
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
					{/* Dropzone State (When no image is loaded or doctor requested file upload) */}
					{!activeImageUrl || isDropzoneOpen ? (
						<div
							className="w-full max-w-2xl p-6 z-20 flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-150"
							data-testid="viewer-dropzone-wrapper"
						>
							<MedicalRadiologyDropzone
								onImageLoaded={handleDropzoneImageLoaded}
								onLoadSample={handleLoadSampleRadiograph}
							/>
							{activeImageUrl && (
								<button
									type="button"
									onClick={() => setIsDropzoneOpen(false)}
									className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-[var(--muted,#94a3b8)] hover:text-[var(--teal)] underline cursor-pointer"
								>
									Вернуться к текущему снимку
								</button>
							)}
						</div>
					) : (
						/* Image with Transformations and CSS Filters */
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
								src={activeImageUrl}
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
						{isHudVisible && isImageLoaded && (
							<svg
								aria-hidden="true"
								className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
								viewBox="0 0 100 100"
								preserveAspectRatio="none"
							>
								{/* Existing Measurements */}
								{visibleMeasurements.map((ruler) => {
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
												<div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal)] text-[10px] font-bold shadow-lg whitespace-nowrap">
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
											stroke="var(--teal, #38bdf8)"
											strokeWidth="0.7"
										/>
										<circle
											cx={`${activeRulerStart.x}%`}
											cy={`${activeRulerStart.y}%`}
											r="1.2"
											fill="var(--teal, #38bdf8)"
										/>
										<circle
											cx={`${mousePosPercent.x}%`}
											cy={`${mousePosPercent.y}%`}
											r="1.2"
											fill="var(--teal, #38bdf8)"
										/>
									</g>
								)}

								{/* ── 2. MANDIBULAR NERVE CANAL SPLINES (2.0 MM SAFETY CORRIDOR) ── */}
								{visibleNerves.map((nerve) => {
									const polyString = nerve.safetyCorridorPolygon.map((p) => `${p.x},${p.y}`).join(" ");
									const polylineString = nerve.interpolatedCurve.map((p) => `${p.x},${p.y}`).join(" ");
									const midIdx = Math.floor(nerve.interpolatedCurve.length / 2);
									const midPoint = nerve.interpolatedCurve[midIdx] || nerve.controlPoints[0] || { x: 50, y: 50 };

									return (
										<g key={nerve.id} className="pointer-events-auto" data-testid="mandibular-nerve-spline-group">
											{/* 2.0 mm Safety Corridor Ribbon */}
											{nerve.safetyCorridorPolygon.length >= 3 && (
												<polygon
													points={polyString}
													fill="rgba(239, 68, 68, 0.18)"
													stroke="var(--danger, #ef4444)"
													strokeWidth="0.4"
													strokeDasharray="1.5 1"
													opacity="0.85"
												/>
											)}

											{/* Core Nerve Canal Line (Glowing Yellow/Amber) */}
											<polyline
												points={polylineString}
												fill="none"
												stroke="var(--warn-fg, #f59e0b)"
												strokeWidth="0.8"
												strokeLinecap="round"
												strokeLinejoin="round"
												style={{ filter: "drop-shadow(0 0 3px rgba(245, 158, 11, 0.6))" }}
											/>

											{/* Nerve Control Points */}
											{nerve.controlPoints.map((cp, cIdx) => (
												<circle
													key={cIdx}
													cx={`${cp.x}%`}
													cy={`${cp.y}%`}
													r="1.1"
													fill="var(--warn-fg, #f59e0b)"
													stroke="#000"
													strokeWidth="0.3"
												/>
											))}

											{/* Nerve Info Badge */}
											<foreignObject
												x={`${midPoint.x}%`}
												y={`${midPoint.y}%`}
												width="32"
												height="12"
												className="overflow-visible"
												style={{ transform: "translate(-50%, -50%)" }}
											>
												<div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500 text-amber-300 text-[10px] font-bold shadow-lg whitespace-nowrap">
													<span>Нерв ({nerve.side === "left" ? "Лев." : "Прав."}): {nerve.lengthMm} мм</span>
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															handleDeleteNerve(nerve.id);
														}}
														className="text-rose-400 hover:text-rose-200 ml-0.5"
														title="Удалить трассировку нерва"
													>
														×
													</button>
												</div>
											</foreignObject>
										</g>
									);
								})}

								{/* In-progress Active Nerve Tracer Points & Spline */}
								{activeNervePoints.length > 0 && (
									<g className="pointer-events-none">
										{activeNervePoints.length >= 2 && (
											<polyline
												points={interpolateNerveSpline2D(activeNervePoints).map((p) => `${p.x},${p.y}`).join(" ")}
												fill="none"
												stroke="var(--warn-fg, #f59e0b)"
												strokeWidth="0.8"
												strokeDasharray="1 0.5"
											/>
										)}
										{mousePosPercent && activeNervePoints.length >= 1 && activeNervePoints[activeNervePoints.length - 1] && (
											<line
												x1={`${activeNervePoints[activeNervePoints.length - 1]?.x ?? 0}%`}
												y1={`${activeNervePoints[activeNervePoints.length - 1]?.y ?? 0}%`}
												x2={`${mousePosPercent.x}%`}
												y2={`${mousePosPercent.y}%`}
												stroke="var(--warn-fg, #f59e0b)"
												strokeWidth="0.6"
												strokeDasharray="0.8 0.8"
											/>
										)}
										{activeNervePoints.map((pt, pIdx) => (
											<circle
												key={pIdx}
												cx={`${pt.x}%`}
												cy={`${pt.y}%`}
												r="1.3"
												fill="var(--warn-fg, #f59e0b)"
												className="animate-pulse"
											/>
										))}
									</g>
								)}

								{/* ── 3. ALVEOLAR RIDGE CALIPER MEASUREMENTS ── */}
								{visibleCalipers.map((caliper) => {
									const midX = (caliper.crestPoint.x + caliper.basePoint.x) / 2;
									const midY = (caliper.crestPoint.y + caliper.basePoint.y) / 2;

									// Calculate perpendicular vector for crossbar caliper jaws
									const dx = caliper.basePoint.x - caliper.crestPoint.x;
									const dy = caliper.basePoint.y - caliper.crestPoint.y;
									const len = Math.hypot(dx, dy) || 1;
									const nx = -dy / len;
									const ny = dx / len;
									const jawHalfPct = 3.5;

									return (
										<g key={caliper.id} className="pointer-events-auto" data-testid="alveolar-caliper-group">
											{/* Vertical Ridge Axis Line */}
											<line
												x1={`${caliper.crestPoint.x}%`}
												y1={`${caliper.crestPoint.y}%`}
												x2={`${caliper.basePoint.x}%`}
												y2={`${caliper.basePoint.y}%`}
												stroke="var(--teal, #06b6d4)"
												strokeWidth="0.8"
											/>

											{/* Crest Width Jaws Bracket */}
											<line
												x1={`${caliper.crestPoint.x - nx * jawHalfPct}%`}
												y1={`${caliper.crestPoint.y - ny * jawHalfPct}%`}
												x2={`${caliper.crestPoint.x + nx * jawHalfPct}%`}
												y2={`${caliper.crestPoint.y + ny * jawHalfPct}%`}
												stroke="var(--teal, #06b6d4)"
												strokeWidth="0.7"
											/>

											{/* Base Width Jaws Bracket */}
											<line
												x1={`${caliper.basePoint.x - nx * (jawHalfPct * 1.2)}%`}
												y1={`${caliper.basePoint.y - ny * (jawHalfPct * 1.2)}%`}
												x2={`${caliper.basePoint.x + nx * (jawHalfPct * 1.2)}%`}
												y2={`${caliper.basePoint.y + ny * (jawHalfPct * 1.2)}%`}
												stroke="var(--teal, #06b6d4)"
												strokeWidth="0.7"
											/>

											{/* Crest point tip */}
											<circle
												cx={`${caliper.crestPoint.x}%`}
												cy={`${caliper.crestPoint.y}%`}
												r="1.2"
												fill="var(--teal, #06b6d4)"
											/>

											{/* Base point tip */}
											<circle
												cx={`${caliper.basePoint.x}%`}
												cy={`${caliper.basePoint.y}%`}
												r="1.2"
												fill="var(--teal, #06b6d4)"
											/>

											{/* Caliper Floating Diagnostic Badge */}
											<foreignObject
												x={`${midX}%`}
												y={`${midY}%`}
												width="36"
												height="14"
												className="overflow-visible"
												style={{ transform: "translate(-50%, -50%)" }}
											>
												<div className="flex flex-col gap-0.5 p-1.5 rounded-xl bg-slate-950/95 border border-[var(--teal)] text-slate-100 text-[10px] font-bold shadow-2xl whitespace-nowrap backdrop-blur-md">
													<div className="flex items-center justify-between gap-1.5">
														<span className="text-[var(--teal)]">
															H={caliper.heightMm} мм | W={caliper.crestWidthMm} мм
														</span>
														<button
															type="button"
															onClick={(e) => {
																e.stopPropagation();
																handleDeleteCaliper(caliper.id);
															}}
															className="text-rose-400 hover:text-rose-200"
															title="Удалить замер"
														>
															×
														</button>
													</div>
													<div className={`text-[9px] font-semibold ${
														caliper.implantFeasibility.isAdequate ? "text-emerald-400" : "text-amber-400"
													}`}>
														{caliper.implantFeasibility.isAdequate ? "✓ Кость достаточна" : "⚠️ Дефицит кости"}
													</div>
												</div>
											</foreignObject>
										</g>
									);
								})}

								{/* In-progress Active Caliper Line */}
								{activeCaliperStart && mousePosPercent && (
									<g className="pointer-events-none">
										<line
											x1={`${activeCaliperStart.x}%`}
											y1={`${activeCaliperStart.y}%`}
											x2={`${mousePosPercent.x}%`}
											y2={`${mousePosPercent.y}%`}
											stroke="var(--teal, #38bdf8)"
											strokeWidth="0.8"
										/>
										<circle
											cx={`${activeCaliperStart.x}%`}
											cy={`${activeCaliperStart.y}%`}
											r="1.4"
											fill="var(--teal, #38bdf8)"
										/>
										<circle
											cx={`${mousePosPercent.x}%`}
											cy={`${mousePosPercent.y}%`}
											r="1.4"
											fill="var(--teal, #38bdf8)"
										/>
									</g>
								)}
							</svg>
						)}

						{/* ── LANDMARK PINS OVERLAY (Style radiological marker: dark compact badge with fine contrast leader line) ── */}
						{isHudVisible && isImageLoaded &&
							visibleLandmarks.map((pin) => (
								<div
									key={pin.id}
									className="absolute z-30 group pointer-events-auto select-none"
									style={{
										left: `${pin.x}%`,
										top: `${pin.y}%`,
										transform: "translate(-50%, -100%)",
									}}
								>
									<div className="flex flex-col items-center cursor-pointer relative">
										{/* Dark compact badge */}
										<div
											className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono shadow-lg whitespace-nowrap group-hover:scale-105 transition-all"
											style={{
												backgroundColor: "rgba(15, 23, 42, 0.95)",
												color: "#5eead4",
												border: "1px solid rgba(20, 184, 166, 0.6)",
												boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
											}}
										>
											<span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
											<span className="font-bold">FDI {pin.toothFdi}</span>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteLandmark(pin.id);
												}}
												className="text-rose-300 hover:text-white bg-rose-950/60 px-1.5 py-0.5 rounded text-xs font-bold ml-1 cursor-pointer transition-colors leading-none"
												title="Удалить метку"
											>
												×
											</button>
										</div>
										{/* Fine leader line connecting badge to exact anatomical target point */}
										<div className="w-[1px] h-8 bg-teal-400 shadow-xs" style={{ backgroundColor: "#2dd4bf" }} />
										{/* Non-occluding delicate anatomical target needle */}
										<div className="w-2 h-2 rounded-full border border-teal-300 bg-teal-400/60 shadow-sm flex items-center justify-center" style={{ borderColor: "#5eead4", backgroundColor: "rgba(45, 212, 191, 0.6)" }}>
											<div className="w-1 h-1 rounded-full bg-white shadow-xs" />
										</div>
									</div>
								</div>
							))}
						</div>
					)}

					{/* ── FLOATING PROXIMITY ALERT BANNER (SAFETY MARGIN 2.0 MM) ── */}
					{nerveClearanceInfo && (
						<div
							role={nerveClearanceInfo.isDanger ? "alert" : "status"}
							data-testid="nerve-proximity-alert-banner"
							className={`absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-[min(92%,32rem)] px-4 py-2 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold transition-all ${
								nerveClearanceInfo.isDanger
									? "bg-rose-950/90 border-rose-500 text-rose-200 animate-pulse"
									: nerveClearanceInfo.isWarning
										? "bg-amber-950/90 border-amber-500 text-amber-200"
										: "bg-emerald-950/90 border-emerald-500 text-emerald-200"
							}`}
						>
							{nerveClearanceInfo.isDanger ? (
								<ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
							) : (
								<ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
							)}
							<div className="flex flex-col min-w-0">
								<span>{nerveClearanceInfo.messageRu}</span>
							</div>
						</div>
					)}

					{/* ── ACTIVE TRACER FLOATING CONTROLS (MAXILLARY SINUS / MANDIBULAR CANAL) ── */}
					{activeTool === "nerve_tracer" && (
						<div
							className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900/95 border-2 border-amber-500 shadow-2xl backdrop-blur-md text-xs"
							data-testid="nerve-tracer-floating-controls"
						>
							<div className="flex items-center gap-1.5 font-bold text-amber-400 mr-2">
								<Spline className="w-4 h-4" />
								<span>
									{isUpperJaw
										? `Контур пазухи (точек: ${activeNervePoints.length}):`
										: `Трассировка нерва (точек: ${activeNervePoints.length}):`}
								</span>
							</div>
							<div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl">
								<button
									type="button"
									onClick={() => setActiveNerveSide("left")}
									className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
										activeNerveSide === "left"
											? "bg-amber-500 text-slate-950"
											: "text-slate-300 hover:text-white"
									}`}
								>
									Левый
								</button>
								<button
									type="button"
									onClick={() => setActiveNerveSide("right")}
									className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
										activeNerveSide === "right"
											? "bg-amber-500 text-slate-950"
											: "text-slate-300 hover:text-white"
									}`}
								>
									Правый
								</button>
							</div>
							<button
								type="button"
								disabled={activeNervePoints.length < 2}
								onClick={handleFinishNerveSpline}
								className="min-h-[38px] px-3 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
								data-testid="finish-nerve-spline-btn"
							>
								{isUpperJaw ? "Завершить контур пазухи" : "Завершить канал"}
							</button>
							{activeNervePoints.length > 0 && (
								<button
									type="button"
									onClick={() => setActiveNervePoints([])}
									className="px-2.5 py-1 text-slate-400 hover:text-rose-300 cursor-pointer"
								>
									Сбросить
								</button>
							)}
						</div>
					)}

					{/* ── WW/WL PRESETS QUICK BAR (Centered directly inside canvas viewport) ── */}
					<div
						className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md max-w-[calc(100%-16px)] sm:max-w-[calc(100%-32px)] overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none transition-all ${
							!isImageLoaded ? "opacity-40 pointer-events-none" : ""
						}`}
						data-testid="viewer-presets-bar"
					>
						<span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap shrink-0">
							Пресеты WW/WL:
						</span>
						{DEFAULT_WW_WL_PRESETS.map((preset) => {
							const isSelected = activePresetId === preset.id;
							return (
								<button
									key={preset.id}
									type="button"
									disabled={!isImageLoaded}
									onClick={() => handleSelectPreset(preset)}
									className={`h-8 min-h-[32px] min-w-max shrink-0 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:cursor-not-allowed ${
										isSelected
											? "bg-teal-600 border border-teal-300 text-white shadow-md font-bold"
											: "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 border border-slate-600 font-bold"
									}`}
									title={preset.description}
									data-testid={`preset-btn-${preset.id}`}
								>
									{preset.label}
								</button>
							);
						})}
					</div>

					{/* ── BOTTOM-LEFT VIEWPORT HUD STATUS (Semi-transparent dark HUD badge in both themes) ── */}
					<div
						className="absolute left-14 bottom-4 z-30 hidden sm:flex items-center gap-2 px-2 py-1 rounded bg-slate-900/80 text-slate-300 text-xs font-mono border border-slate-700/60 backdrop-blur-xs pointer-events-none whitespace-nowrap shadow-lg"
						data-testid="viewport-hud-status"
					>
						<div className="flex items-center gap-1 whitespace-nowrap">
							<span className="font-bold text-slate-200">Масштаб:</span>
							<span className="text-teal-300 font-bold">{Math.round(zoom * 100)}%</span>
						</div>
						<span className="text-slate-600">•</span>
						<div className="flex items-center gap-1 whitespace-nowrap">
							<span className="font-bold text-slate-200">Поворот:</span>
							<span className="text-teal-300 font-bold">{rotation}°</span>
						</div>
						<span className="text-slate-600 hidden md:inline">•</span>
						<span className="hidden md:inline text-[11px] text-slate-400 whitespace-nowrap">
							{study?.metadata?.pixelSpacingMm || 0.05} мм/пикс · Линеек: {visibleMeasurements.length}, Меток: {visibleLandmarks.length}
						</span>
					</div>
				</div>

				{/* ═══════════════════════════════════════════════════════════════════
				    3. SIDE DRAWER: METADATA & CLINICAL DIAGNOSTIC REPORT
				    ═══════════════════════════════════════════════════════════════════ */}
				{isSideDrawerOpen && (
					<>
						{/* Mobile Backdrop (< md / < 768px): tapping outside closes drawer */}
						<div
							className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-xs"
							onClick={() => setIsSideDrawerOpen(false)}
							aria-hidden="true"
						/>
						<aside
							aria-label="Сведения об исследовании и диагностическое заключение"
							className="absolute inset-y-0 right-0 z-40 w-80 max-w-[90vw] md:static md:w-96 bg-[var(--paper-soft,#0f172a)] border-l border-[var(--line,#334155)] flex flex-col shrink-0 overflow-y-auto shadow-2xl md:shadow-none animate-in slide-in-from-right-4 duration-200 text-[var(--ink,#f8fafc)]"
							data-testid="radiology-viewer-side-drawer"
						>
							{/* Header */}
							<div className="flex items-center justify-between px-5 py-3 border-b border-[var(--line,#334155)] bg-[var(--paper-soft,#0f172a)] sticky top-0 z-10">
								<div className="flex items-center gap-2">
									<FileText className="w-4 h-4 text-[var(--teal)]" />
									<span className="text-xs font-bold uppercase tracking-wider text-[var(--ink,#f8fafc)]">
										Сведения об исследовании
									</span>
								</div>
								<button
									type="button"
									onClick={() => setIsSideDrawerOpen(false)}
									className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 rounded-xl text-[var(--muted,#94a3b8)] hover:text-[var(--ink)] hover:bg-[var(--paper,#1e293b)]"
									title="Скрыть панель"
									data-testid="close-side-drawer-btn"
								>
									<X className="w-4 h-4" />
								</button>
							</div>

							<div className="p-5 flex flex-col gap-5 min-w-0">
								{/* Radiation Safety Card (SanPiN Compliant) */}
								<div className="p-4 rounded-2xl bg-[var(--paper,#020617)] border border-[var(--line,#1e293b)] flex flex-col gap-2.5">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
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
									<div className="text-lg font-bold text-[var(--ink,#f8fafc)]">
										{doseInfo.fullText}
									</div>
									<p className="text-xs text-[var(--muted,#94a3b8)] leading-relaxed">
										Исследование выполнено с соблюдением принципа ALARA. Доза внесена в
										персональный радиационный паспорт пациента.
									</p>
								</div>

								{/* Anatomical Targets & Tooth Numbers */}
								<div className="flex flex-col gap-2">
									<span className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
										Анатомическая зона (FDI):
									</span>
									<div className="p-3 rounded-xl bg-[var(--paper,#020617)] border border-[var(--line,#1e293b)] flex flex-col gap-1.5">
										<div className="text-sm font-bold text-[var(--teal)]">
											{study?.anatomicalArea || "Обзорное исследование челюстей"}
										</div>
										{study?.teethFdi && study.teethFdi.length > 0 && (
											<div className="flex flex-wrap gap-1.5 mt-1">
												{study.teethFdi.map((t) => (
													<span
														key={t}
														className="px-2 py-1 rounded-lg bg-[var(--teal-surface)] border border-[var(--teal-soft)] text-[var(--teal)] text-xs font-bold whitespace-normal break-words"
													>
														Зуб {t} {FDI_TOOTH_NAMES[t] ? `(${FDI_TOOTH_NAMES[t]})` : ""}
													</span>
												))}
											</div>
										)}
									</div>
								</div>

								{/* Diagnostic Description (Prevent text overflow per mandate) */}
								<div className="flex flex-col gap-2 min-w-0">
									<span className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
										Диагностическое описание:
									</span>
									<div className="p-3.5 rounded-xl bg-[var(--paper,#020617)] border border-[var(--line,#1e293b)] text-xs text-[var(--ink,#e2e8f0)] leading-relaxed font-sans min-w-0 break-words">
										{study?.diagnosticNotes ? (
											<div className="whitespace-pre-line">{study.diagnosticNotes}</div>
										) : (
											<span className="text-[var(--muted,#94a3b8)] italic">
												Описание рентгенолога не внесено.
											</span>
										)}
									</div>
								</div>

								{/* AI Findings Summary if present */}
								{study?.aiFindings && (
									<div className="p-4 rounded-2xl bg-[var(--teal-surface)] border border-[var(--teal-soft)] flex flex-col gap-2 min-w-0">
										<div className="flex items-center gap-2 text-[var(--teal)] font-bold text-xs">
											<Activity className="w-4 h-4" />
											<span>AI-Анализ снимка (Shadow Analyst)</span>
										</div>
										<p className="text-xs text-[var(--ink,#e2e8f0)] min-w-0 break-words leading-relaxed">
											{study.aiFindings.summary || "Признаков скрытых патологий не выявлено."}
										</p>
										{study.aiFindings.confidence && (
											<div className="text-[11px] text-[var(--teal)] font-semibold mt-1">
												Уверенность модели: {Math.round(study.aiFindings.confidence * 100)}%
											</div>
										)}
									</div>
								)}

								{/* ── CALIPER MEASUREMENTS (ALVEOLAR RIDGE) ── */}
								<div className="flex flex-col gap-1.5" data-testid="side-drawer-calipers-section">
									<button
										type="button"
										onClick={() => setIsCalipersAccordionOpen((prev) => !prev)}
										className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper,#020617)]/70 hover:bg-[var(--paper,#020617)] border border-[var(--line,#1e293b)] text-xs font-bold text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] transition-colors cursor-pointer"
										data-testid="toggle-caliper-accordion-btn"
									>
										<div className="flex items-center gap-2">
											<Compass className="w-3.5 h-3.5 text-[var(--teal)]" />
											<span className="uppercase tracking-wider">
												Штангенциркуль ({visibleCalipers.length})
											</span>
										</div>
										<div className="flex items-center gap-1.5">
											{visibleCalipers.length > 0 && (
												<span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--teal-surface)] text-[var(--teal)] font-mono">
													{visibleCalipers.length}
												</span>
											)}
											<ChevronRight
												className={`w-4 h-4 text-[var(--muted,#94a3b8)] transition-transform duration-200 ${
													isCalipersAccordionOpen || visibleCalipers.length > 0 ? "rotate-90" : ""
												}`}
											/>
										</div>
									</button>

									{(isCalipersAccordionOpen || visibleCalipers.length > 0) && (
										<div className="flex flex-col gap-2 pt-1">
											{visibleCalipers.length === 0 ? (
												<div className="p-2.5 rounded-xl bg-[var(--paper,#020617)]/40 border border-[var(--line,#1e293b)] text-xs text-[var(--muted,#94a3b8)] italic text-center">
													Нет замеров гребня. Выберите инструмент «Штангенциркуль» (C).
												</div>
											) : (
												<div className="flex flex-col gap-2">
													{visibleCalipers.map((cal, idx) => (
														<div
															key={cal.id}
															className="p-3 rounded-xl bg-[var(--paper,#020617)] border border-[var(--teal-soft)] flex flex-col gap-1.5 text-xs"
														>
															<div className="flex items-center justify-between">
																<span className="font-bold text-[var(--teal)]">
																	#{idx + 1} {cal.label}
																</span>
																<button
																	type="button"
																	onClick={() => handleDeleteCaliper(cal.id)}
																	className="text-[var(--muted,#94a3b8)] hover:text-rose-400 p-0.5 cursor-pointer"
																>
																	<Trash2 className="w-3.5 h-3.5" />
																</button>
															</div>
															<div className="grid grid-cols-2 gap-1.5 text-[11px] text-[var(--ink,#cbd5e1)] font-mono">
																<div>Высота: <strong className="text-[var(--ink,#f8fafc)]">{cal.heightMm} мм</strong></div>
																<div>Вершина: <strong className="text-[var(--ink,#f8fafc)]">{cal.crestWidthMm} мм</strong></div>
																<div>Середина: <strong className="text-[var(--ink,#f8fafc)]">{cal.midWidthMm} мм</strong></div>
																<div>База: <strong className="text-[var(--ink,#f8fafc)]">{cal.baseWidthMm} мм</strong></div>
															</div>
															<p className="text-[11px] text-[var(--muted,#94a3b8)] leading-relaxed border-t border-[var(--line,#1e293b)] pt-1">
																{cal.implantFeasibility.clinicalAdviceRu}
															</p>
														</div>
													))}
												</div>
											)}
										</div>
									)}
								</div>

								{/* ── ANATOMICAL STRUCTURE: MAXILLARY SINUS (UPPER JAW) vs MANDIBULAR NERVE (LOWER JAW) ── */}
								<div className="flex flex-col gap-1.5" data-testid="side-drawer-nerves-section">
									<button
										type="button"
										onClick={() => setIsNervesAccordionOpen((prev) => !prev)}
										className="w-full flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper,#020617)]/70 hover:bg-[var(--paper,#020617)] border border-[var(--line,#1e293b)] text-xs font-bold text-[var(--muted,#94a3b8)] hover:text-[var(--ink,#f8fafc)] transition-colors cursor-pointer"
										data-testid="toggle-nerve-accordion-btn"
									>
										<div className="flex items-center gap-2">
											<Spline className="w-3.5 h-3.5 text-amber-400" />
											<span className="uppercase tracking-wider truncate">
												{isUpperJaw
													? `Гайморова пазуха (${visibleNerves.length})`
													: `Нижнечелюстной канал (${visibleNerves.length})`}
											</span>
										</div>
										<div className="flex items-center gap-1.5 shrink-0">
											{visibleNerves.length > 0 && (
												<span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
													{visibleNerves.length}
												</span>
											)}
											<ChevronRight
												className={`w-4 h-4 text-[var(--muted,#94a3b8)] transition-transform duration-200 ${
													isNervesAccordionOpen || visibleNerves.length > 0 ? "rotate-90" : ""
												}`}
											/>
										</div>
									</button>

									{(isNervesAccordionOpen || visibleNerves.length > 0) && (
										<div className="flex flex-col gap-2 pt-1">
											{visibleNerves.length === 0 ? (
												<div className="p-2.5 rounded-xl bg-[var(--paper,#020617)]/40 border border-[var(--line,#1e293b)] text-xs text-[var(--muted,#94a3b8)] italic text-center">
													{isUpperJaw
														? "Трассировка дна пазухи не выполнена. Выберите инструмент «Контур пазухи» (N)."
														: "Трассировка канала не выполнена. Выберите инструмент «Нерв» (N)."}
												</div>
											) : (
												<div className="flex flex-col gap-2">
													{visibleNerves.map((nerve, idx) => (
														<div
															key={nerve.id}
															className="p-3 rounded-xl bg-[var(--paper,#020617)] border border-amber-500/50 flex flex-col gap-1.5 text-xs"
														>
															<div className="flex items-center justify-between">
																<span className="font-bold text-amber-400">
																	#{idx + 1}{" "}
																	{isUpperJaw
																		? `Дно гайморовой пазухи (${nerve.side === "left" ? "Левая" : "Правая"})`
																		: nerve.label}
																</span>
																<button
																	type="button"
																	onClick={() => handleDeleteNerve(nerve.id)}
																	className="text-[var(--muted,#94a3b8)] hover:text-rose-400 p-0.5 cursor-pointer"
																	title="Удалить"
																>
																	<Trash2 className="w-3.5 h-3.5" />
																</button>
															</div>
															<div className="flex items-center justify-between text-[11px] text-[var(--ink,#cbd5e1)]">
																<span>
																	{isUpperJaw ? "Длина контура: " : "Длина канала: "}
																	<strong className="text-[var(--ink,#f8fafc)]">{nerve.lengthMm} мм</strong>
																</span>
																<span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[10px]">
																	{isUpperJaw ? "Субантральный зазор" : "Коридор безопасности 2.0 мм"}
																</span>
															</div>
														</div>
													))}
												</div>
											)}
										</div>
									)}
								</div>

								{/* Active Measurements List */}
								<div className="flex flex-col gap-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
											Измерения ({visibleMeasurements.length}):
										</span>
										{visibleMeasurements.length > 0 && (
											<button
												type="button"
												onClick={() => setMeasurements([])}
												className="text-[11px] text-rose-400 hover:text-rose-200"
											>
												Очистить все
											</button>
										)}
									</div>

									{visibleMeasurements.length === 0 ? (
										<div className="p-3 rounded-xl bg-[var(--paper,#020617)]/60 border border-[var(--line,#1e293b)] text-xs text-[var(--muted,#94a3b8)] italic text-center">
											Нет активных линеек. Выберите инструмент «Линейка» (M).
										</div>
									) : (
										<div className="flex flex-col gap-1.5">
											{visibleMeasurements.map((r, idx) => (
												<div
													key={r.id}
													className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper,#020617)] border border-[var(--line,#1e293b)] text-xs"
												>
													<span className="font-medium text-[var(--ink,#cbd5e1)]">
														#{idx + 1}. Дистанция:
													</span>
													<div className="flex items-center gap-2">
														<span className="font-bold text-[var(--teal)] text-sm">
															{r.distanceMm} мм
														</span>
														<button
															type="button"
															onClick={() => handleDeleteRuler(r.id)}
															className="text-[var(--muted,#94a3b8)] hover:text-rose-400 p-1 cursor-pointer"
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
										<span className="text-xs font-bold text-[var(--muted,#94a3b8)] uppercase tracking-wider">
											Метки зубов ({visibleLandmarks.length}):
										</span>
										{visibleLandmarks.length > 0 && (
											<button
												type="button"
												onClick={() => setLandmarks([])}
												className="text-[11px] text-rose-400 hover:text-rose-200"
											>
												Очистить все
											</button>
										)}
									</div>

									{visibleLandmarks.length === 0 ? (
										<div className="p-3 rounded-xl bg-[var(--paper,#020617)]/60 border border-[var(--line,#1e293b)] text-xs text-[var(--muted,#94a3b8)] italic text-center">
											Нет меток. Выберите инструмент «Метка» (L).
										</div>
									) : (
										<div className="flex flex-col gap-1.5">
											{visibleLandmarks.map((p) => (
												<div
													key={p.id}
													className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--paper,#020617)] border border-[var(--line,#1e293b)] text-xs"
												>
													<div className="flex flex-col min-w-0">
														<span className="font-bold text-[var(--teal)]">
															Зуб FDI: {p.toothFdi}
														</span>
														<span className="text-[11px] text-[var(--muted,#94a3b8)] truncate">
															{p.label}
														</span>
													</div>
													<button
														type="button"
														onClick={() => handleDeleteLandmark(p.id)}
														className="text-[var(--muted,#94a3b8)] hover:text-rose-400 p-1 cursor-pointer"
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
					</>
				)}
			</div>

			{isCbctStudioOpen && (
				<CbctMprImplantStudioModal
					isOpen={isCbctStudioOpen}
					onClose={() => setIsCbctStudioOpen(false)}
					study={study}
				/>
			)}

			{isMprViewerOpen && (
				<CbctMprViewer
					study={study}
					onClose={() => setIsMprViewerOpen(false)}
				/>
			)}
		</div>
	);

	return typeof document !== "undefined"
		? createPortal(modalContent, document.body)
		: modalContent;
};
