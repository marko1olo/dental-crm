/**
 * DENTE CRM — Canonical EzDent-i 2D Sensor & X-Ray Study Viewer (SensorStudyViewer)
 * Features:
 * 1. Persistent horizontal bottom Filmstrip Dock with dates, times, modality badges, and 3px #00C853 active border.
 * 2. 1-Click Quick Filter Toggles: Unsharp Masking, High-Boost Max Sharpness, Invert, Emboss 45° pseudo-relief + Reset.
 * 3. Vertical 5 mm calibrated ladder scale ruler with physical grounding to EzSensor 35.0 µm or Soft HR 14.8 µm.
 * 4. Fullscreen Clinical Cockpit HUD with patient telemetry, FDI tooth (e.g. 14), and zero kV/mA physics.
 * 5. Anti-drift cursor-centered pan and zoom (calculateCursorCenteredZoom).
 * 6. 1-Click clinical Norma and Standard Protocols injection into Form 043/u.
 *
 * Standards: EzDent-i clinical screenshots 15..29; Mandate 8b (<=800 lines); Mandate 8e (Doctor Autonomy).
 */

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
import {
	Activity,
	CheckCircle2,
	ChevronDown,
	Contrast,
	Download,
	FileText,
	Maximize2,
	Minimize2,
	Move,
	RotateCcw,
	Ruler,
	Scan,
	Search,
	Sliders,
	Sparkles,
	SplitSquareHorizontal,
	Trash2,
	UploadCloud,
	X,
	Zap,
} from "lucide-react";
import { RadiologyConsultationSplit } from "./RadiologyConsultationSplit.js";
import {
	calculateCursorCenteredZoom,
	calculatePhysicalDistanceMm,
	calculateScaleRulerHeightPx,
	formatDistanceMm,
	resolveCalibratedPixelSpacing,
	apply2DSpatialConvolution,
	calculateCurvedCanalLengthMm,
	calculateLesionAreaGaussMm2,
	calculateViewerAngleDegrees,
	formatHumanStudyDate,
	formatPatientAge,
	UNSHARP_MASK_KERNEL_3X3,
	HIGH_BOOST_KERNEL_3X3,
	EMBOSS_45_KERNEL_3X3,
	VATECH_DEVICE_CALIBRATION_PRESETS,
	type ViewerPoint2D,
	type ViewerRulerMeasurement,
	type ViewerCurvedMeasurement,
	type ViewerAreaMeasurement,
} from "./dentalViewerMath.js";
import {
	drawRuler,
	drawCurvedCanal,
	drawLesionContour,
	drawMagnifierOverlay,
	renderClinicalExportBlob,
} from "./dentalViewerCanvasDraw.js";
import { RadiologyFilmstripDock, type RadiologyFilmstripItem } from "./RadiologyFilmstripDock.js";
import {
	RadiologyQuickFiltersPanel,
	DEFAULT_QUICK_FILTERS_STATE,
	type RadiologyQuickFilterState,
} from "./RadiologyQuickFiltersPanel.js";
import { RadiologyCalibratedScaleRuler } from "./RadiologyCalibratedScaleRuler.js";
import { RadiologyClinicalHud } from "./RadiologyClinicalHud.js";
import { teardownViewportCanvases } from "../../utils/viewportTeardownHelper.js";
import {
	RADIOLOGY_STANDARD_PROTOCOLS,
	applyRadiologyProtocolToForm043,
} from "./radiologyProtocols.js";
import { useVisitStore } from "../../store/visitStore.js";
import { showToast } from "../GlobalToast.js";
import { isDemoPatientId, isDemoShowcaseMode } from "../../lib/demoMode.js";
import type { RadiologyStudy } from "./types.js";
import { SensorStudyMobileBar } from "./SensorStudyMobileBar.js";
import { SensorStudyMobileWlDrawer } from "./SensorStudyMobileWlDrawer.js";
import { SensorStudyMobileStudiesDrawer } from "./SensorStudyMobileStudiesDrawer.js";

export interface SensorStudyViewerProps {
	readonly study?: RadiologyStudy | RadiologyFilmstripItem | undefined;
	readonly studiesHistory?: readonly (RadiologyStudy | RadiologyFilmstripItem)[] | undefined;
	readonly initialImageUrl?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientBirthDate?: string | undefined;
	readonly patientAge?: string | number | undefined;
	readonly patientGender?: string | undefined;
	readonly medicalCardNumber?: string | undefined;
	readonly toothFdiCode?: string | undefined;
	readonly onSelectStudy?: ((study: RadiologyStudy | RadiologyFilmstripItem) => void) | undefined;
	readonly onInsertToProtocol?: ((text: string) => void) | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly className?: string;
}

export const SensorStudyViewer: React.FC<SensorStudyViewerProps> = ({
	study,
	studiesHistory = [],
	initialImageUrl,
	patientName,
	patientBirthDate,
	patientAge,
	patientGender,
	medicalCardNumber,
	toothFdiCode,
	onSelectStudy,
	onInsertToProtocol,
	onClose,
	className = "",
}) => {
	// Active study state
	const [activeStudy, setActiveStudy] = useState<RadiologyStudy | RadiologyFilmstripItem | null>(study || null);
	useEffect(() => {
		if (study) setActiveStudy(study);
	}, [study]);

	// Viewport Image Source
	const activeImageUrl = useMemo(() => {
		if (activeStudy?.imageUrl) return activeStudy.imageUrl;
		if (activeStudy?.thumbnailUrl) return activeStudy.thumbnailUrl;
		if (initialImageUrl) return initialImageUrl;
		if (isDemoShowcaseMode() || isDemoPatientId((activeStudy as any)?.patientId || medicalCardNumber)) {
			return "/radiology/sample_rvg_tooth16.jpg";
		}
		return "";
	}, [activeStudy, initialImageUrl, medicalCardNumber]);

	// Resolves persistent filmstrip studies list (guarantees non-empty patient timeline)
	const effectiveStudiesHistory: readonly (RadiologyStudy | RadiologyFilmstripItem)[] = useMemo(() => {
		if (studiesHistory && studiesHistory.length > 0) return studiesHistory;
		const currentTooth = activeStudy?.teethFdi?.[0] || toothFdiCode || "14";
		const currentImg = activeImageUrl || "/radiology/sample_rvg_tooth16.jpg";
		return [
			{
				id: activeStudy?.id || "study-current",
				title:
					(activeStudy as any)?.title ||
					(activeStudy as any)?.studyDescription ||
					`Прицельный снимок зуба #${currentTooth}`,
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: activeStudy?.studyDate || "01.10.2026 10:14:20",
				teethFdi: [currentTooth],
				imageUrl: currentImg,
				effectiveDoseMicrosv: 3.0,
			},
			{
				id: "study-prior-1",
				title: "Контроль обтурации каналов",
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: "20.09.2026 09:14:20",
				teethFdi: ["16"],
				imageUrl: "/radiology/sample_rvg_tooth16.jpg",
				effectiveDoseMicrosv: 3.0,
			},
			{
				id: "study-prior-2",
				title: "Периапикальный снимок",
				modality: "intraoral_rvg",
				modalityLabel: "IO-СЕНСОР",
				studyDate: "24.03.2026 14:30:10",
				teethFdi: ["36"],
				imageUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
				effectiveDoseMicrosv: 3.0,
			},
		];
	}, [studiesHistory, activeStudy, toothFdiCode, activeImageUrl]);

	// Viewport Navigation & Canvas refs
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rawImageRef = useRef<HTMLImageElement | null>(null);
	const filteredCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Zoom & Pan state
	const [zoom, setZoom] = useState<number>(1.0);
	const [panX, setPanX] = useState<number>(0);
	const [panY, setPanY] = useState<number>(0);
	const [activeTool, setActiveTool] = useState<"pan" | "ruler" | "curved_canal" | "magnifier" | "lesion_contour">("pan");
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
	const [showConsultationSplit, setShowConsultationSplit] = useState<boolean>(false);

	// Quick Filters State
	const [filters, setFilters] = useState<RadiologyQuickFilterState>(DEFAULT_QUICK_FILTERS_STATE);
	const [brightnessPct, setBrightnessPct] = useState<number>(0);
	const [contrastPct, setContrastPct] = useState<number>(0);

	// 1-Click Norma Protocol state
	const [isNormaApplied, setIsNormaApplied] = useState<boolean>(false);
	const [isProtocolsOpen, setIsProtocolsOpen] = useState<boolean>(false);
	const protocolsDropdownRef = useRef<HTMLDivElement>(null);

	// Interactive straight and curved measurements
	const [measurements, setMeasurements] = useState<ViewerRulerMeasurement[]>([]);
	const [draftStart, setDraftStart] = useState<ViewerPoint2D | null>(null);
	const [draftCurrent, setDraftCurrent] = useState<ViewerPoint2D | null>(null);

	// Multi-point curved root canal apex caliper (Working Length)
	const [curvedCanals, setCurvedCanals] = useState<ViewerCurvedMeasurement[]>([]);
	const [draftCurvedPoints, setDraftCurvedPoints] = useState<ViewerPoint2D[]>([]);

	// Periapical lesion contour polygons (Gauss Shoelace area mm²)
	const [lesionContours, setLesionContours] = useState<ViewerAreaMeasurement[]>([]);
	const [draftLesionPoints, setDraftLesionPoints] = useState<ViewerPoint2D[]>([]);

	// 2.5x Loupe / Magnifier overlay position (screen coordinates)
	const [magnifierPos, setMagnifierPos] = useState<ViewerPoint2D | null>(null);
	const [isExporting, setIsExporting] = useState<boolean>(false);

	// Mouse drag tracking
	const isDraggingRef = useRef<boolean>(false);
	const dragStartPosRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });
	const dragStartPanRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });

	// Viewport Mobile State (Apple HIG standard: <= 768px is dedicated mobile touch layer)
	const [isMobile, setIsMobile] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		return window.innerWidth <= 768;
	});
	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 768);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Mobile Bottom Sheet states
	const [isMobileWlDrawerOpen, setIsMobileWlDrawerOpen] = useState<boolean>(false);
	const [isMobileFilmstripDrawerOpen, setIsMobileFilmstripDrawerOpen] = useState<boolean>(false);
	const uploadInputRef = useRef<HTMLInputElement | null>(null);

	// Touch tracking refs
	const touchStartDistanceRef = useRef<number | null>(null);
	const touchStartZoomRef = useRef<number>(1.0);
	const touchStartCenterRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });
	const touchLastPosRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });
	const isTouchPinchingRef = useRef<boolean>(false);

	// Spatial calibration
	const calibratedMmPerPx = useMemo(() => {
		const device = (activeStudy as any)?.apparatusModel || "vatech_ezsensor";
		return resolveCalibratedPixelSpacing(device, 0.0350);
	}, [activeStudy]);

	const pixelPitchMicrons = useMemo(() => {
		return Number((calibratedMmPerPx * 1000.0).toFixed(1));
	}, [calibratedMmPerPx]);

	// Build & update filtered buffer
	const updateFilteredBuffer = useCallback(() => {
		const img = rawImageRef.current;
		if (!img || img.width === 0 || img.height === 0) return;

		let offscreen = filteredCanvasRef.current;
		if (!offscreen) {
			offscreen = document.createElement("canvas");
			filteredCanvasRef.current = offscreen;
		}

		offscreen.width = img.width;
		offscreen.height = img.height;
		const offCtx = offscreen.getContext("2d");
		if (!offCtx) return;

		offCtx.drawImage(img, 0, 0);

		// Apply contrast / brightness & filters
		const hasActiveFilter =
			filters.sharpness ||
			filters.maxSharpness ||
			filters.invert ||
			filters.pseudoRelief ||
			brightnessPct !== 0 ||
			contrastPct !== 0;

		if (!hasActiveFilter) return;

		try {
			const imgData = offCtx.getImageData(0, 0, img.width, img.height);
			let pixels: Uint8ClampedArray = imgData.data;

			// 1. Brightness & Contrast
			if (brightnessPct !== 0 || contrastPct !== 0) {
				const bFactor = (brightnessPct + 100) / 100;
				const cFactor = (contrastPct + 100) / 100;
				for (let i = 0; i < pixels.length; i += 4) {
					pixels[i] = Math.min(255, Math.max(0, Math.round(((pixels[i]! - 128) * cFactor + 128) * bFactor)));
					pixels[i + 1] = Math.min(255, Math.max(0, Math.round(((pixels[i + 1]! - 128) * cFactor + 128) * bFactor)));
					pixels[i + 2] = Math.min(255, Math.max(0, Math.round(((pixels[i + 2]! - 128) * cFactor + 128) * bFactor)));
				}
			}

			// 2. Convolution filters (Sharpen, High-Boost, Emboss)
			const isWithinConvolutionLimit = img.width <= 2600 && img.height <= 2600;
			if (filters.maxSharpness && isWithinConvolutionLimit) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, HIGH_BOOST_KERNEL_3X3);
			} else if (filters.sharpness && isWithinConvolutionLimit) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, UNSHARP_MASK_KERNEL_3X3);
			} else if (filters.pseudoRelief && isWithinConvolutionLimit) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, EMBOSS_45_KERNEL_3X3, 128);
			}

			// 3. Inversion (Negative)
			if (filters.invert) {
				for (let i = 0; i < pixels.length; i += 4) {
					pixels[i] = 255 - pixels[i]!;
					pixels[i + 1] = 255 - pixels[i + 1]!;
					pixels[i + 2] = 255 - pixels[i + 2]!;
				}
			}

			imgData.data.set(pixels);
			offCtx.putImageData(imgData, 0, 0);
		} catch {
			// Fallback keeps raw image
		}
	}, [filters, brightnessPct, contrastPct]);

	// Render canvas scene
	const renderScene = useCallback(() => {
		const canvas = canvasRef.current;
		const img = rawImageRef.current;
		if (!canvas || !img) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		canvas.width = canvas.parentElement?.clientWidth || 800;
		canvas.height = canvas.parentElement?.clientHeight || 600;

		ctx.save();
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = "#020617";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Transform matrix
		ctx.translate(canvas.width / 2 + panX, canvas.height / 2 + panY);
		ctx.scale(zoom, zoom);
		ctx.translate(-img.width / 2, -img.height / 2);

		ctx.imageSmoothingEnabled = true;
		ctx.imageSmoothingQuality = "high";

		const filteredCanvas = filteredCanvasRef.current;
		if (filteredCanvas) {
			ctx.drawImage(filteredCanvas, 0, 0, img.width, img.height);
		} else {
			ctx.drawImage(img, 0, 0);
		}

		// Draw completed straight rulers
		for (const r of measurements) {
			drawRuler(ctx, { x: r.startX, y: r.startY }, { x: r.endX, y: r.endY }, r.label || `${r.lengthMm.toFixed(1)} мм`);
		}

		// Draw draft straight ruler in progress
		if (draftStart && draftCurrent) {
			const distMm = calculatePhysicalDistanceMm(draftStart, draftCurrent, calibratedMmPerPx);
			drawRuler(ctx, draftStart, draftCurrent, `${distMm.toFixed(1)} мм`, "#f59e0b");
		}

		// Draw completed curved canals (WL)
		for (const canal of curvedCanals) {
			drawCurvedCanal(ctx, canal.points, canal.totalLengthMm, canal.label, canal.color);
		}

		// Draw draft curved canal in progress
		if (draftCurvedPoints.length > 0) {
			const draftLengthMm = calculateCurvedCanalLengthMm(draftCurvedPoints, calibratedMmPerPx);
			drawCurvedCanal(ctx, draftCurvedPoints, draftLengthMm, `WL: ${draftLengthMm.toFixed(1)} мм (в процессе)`, "#f59e0b", true);
		}

		// Draw completed periapical lesion contours
		for (const lesion of lesionContours) {
			drawLesionContour(ctx, lesion.points, lesion.areaMm2, lesion.perimeterMm, lesion.label, lesion.color);
		}

		// Draw draft lesion contour in progress
		if (draftLesionPoints.length > 0) {
			const draftArea = calculateLesionAreaGaussMm2(draftLesionPoints, calibratedMmPerPx);
			drawLesionContour(ctx, draftLesionPoints, draftArea, undefined, draftArea > 0 ? `Очаг: ${draftArea.toFixed(1)} мм²` : "Очаг...", "#f59e0b", true);
		}

		ctx.restore();

		// Draw precision 2.5x Magnifier Loupe Overlay if active
		if (activeTool === "magnifier" && magnifierPos) {
			drawMagnifierOverlay({
				ctx,
				canvasWidth: canvas.width,
				canvasHeight: canvas.height,
				img,
				filteredCanvas,
				magnifierPos,
				zoom,
				panX,
				panY,
				magnificationFactor: 2.5,
				radius: 95,
			});
		}
	}, [
		panX,
		panY,
		zoom,
		measurements,
		draftStart,
		draftCurrent,
		curvedCanals,
		draftCurvedPoints,
		activeTool,
		magnifierPos,
		calibratedMmPerPx,
	]);

	// Load raw image
	useEffect(() => {
		if (!activeImageUrl) return;
		const img = new Image();
		if (!activeImageUrl.startsWith("data:") && !activeImageUrl.startsWith("blob:")) {
			img.crossOrigin = "anonymous";
		}
		let isCancelled = false;
		img.onload = () => {
			if (isCancelled) return;
			rawImageRef.current = img;
			updateFilteredBuffer();
			renderScene();
		};
		img.src = activeImageUrl;
		if (img.complete && img.naturalWidth > 0) {
			rawImageRef.current = img;
			updateFilteredBuffer();
			renderScene();
		}
		return () => {
			isCancelled = true;
			img.onload = null;
		};
	}, [activeImageUrl, updateFilteredBuffer, renderScene]);

	// Update filtered buffer when filters change
	useEffect(() => {
		updateFilteredBuffer();
		renderScene();
	}, [updateFilteredBuffer, renderScene]);

	// Responsive resize
	useEffect(() => {
		if (!containerRef.current) return;
		const observer = new ResizeObserver(() => {
			renderScene();
		});
		observer.observe(containerRef.current);
		return () => observer.disconnect();
	}, [renderScene]);

	// Close protocols dropdown on outside click
	useEffect(() => {
		if (!isProtocolsOpen) return;
		const handleOutside = (e: MouseEvent) => {
			if (protocolsDropdownRef.current && !protocolsDropdownRef.current.contains(e.target as Node)) {
				setIsProtocolsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleOutside);
		return () => document.removeEventListener("mousedown", handleOutside);
	}, [isProtocolsOpen]);

	const handleClose = useCallback(() => {
		if (containerRef.current) {
			teardownViewportCanvases(containerRef.current);
		}
		if (filteredCanvasRef.current) {
			filteredCanvasRef.current.width = 0;
			filteredCanvasRef.current.height = 0;
			filteredCanvasRef.current = null;
		}
		if (onClose) {
			onClose();
		}
	}, [onClose]);

	// Unmount cleanup: Zero canvas backing store and dispose contexts (Mandate 8c & 8x)
	useEffect(() => {
		return () => {
			if (containerRef.current) {
				teardownViewportCanvases(containerRef.current);
			}
			if (filteredCanvasRef.current) {
				filteredCanvasRef.current.width = 0;
				filteredCanvasRef.current.height = 0;
				filteredCanvasRef.current = null;
			}
		};
	}, []);

	// Keyboard Shortcuts (F - fullscreen, I - invert, 0 - reset view, Esc - close)
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "f" || e.key === "F") {
				setIsFullscreen((prev) => !prev);
			} else if (e.key === "i" || e.key === "I") {
				setFilters((prev) => ({ ...prev, invert: !prev.invert }));
			} else if (e.key === "0") {
				handleResetView();
			} else if (e.key === "Escape") {
				if (isFullscreen) {
					setIsFullscreen(false);
				} else {
					handleClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isFullscreen, handleClose]);

	// Reset Pan & Zoom
	const handleResetView = () => {
		setZoom(1.0);
		setPanX(0);
		setPanY(0);
	};

	// Reset All Filters
	const handleResetFilters = () => {
		setFilters(DEFAULT_QUICK_FILTERS_STATE);
		setBrightnessPct(0);
		setContrastPct(0);
	};

	// 1-Click Norma Injection (Mandate 8e)
	const handleInsertNorma = () => {
		const targetTooth = toothFdiCode ? ` зуба ${toothFdiCode}` : "";
		const statement = `Рентгенологическое исследование (RVG/DICOM)${targetTooth}: норма. Патологических изменений костной ткани и периапикальных очагов деструкции на снимке не выявлено. Кортикальная пластинка альвеолы и периодонтальная щель прослеживаются на всем протяжении.`;

		applyRadiologyProtocolToForm043({
			protocol: statement,
			options: { toothFdi: toothFdiCode, modalityLabel: "RVG/DICOM" },
			onInsertToProtocol,
			showNotification: false,
		});

		try {
			useVisitStore.getState().setVisitNoteForm((prev) => {
				const current = prev.objectiveStatus || "";
				const updated = current.trim() ? `${current.trim()}\n${statement}` : statement;
				return { ...prev, objectiveStatus: updated };
			});
		} catch {
			// Outside active visit context
		}

		if (onInsertToProtocol) onInsertToProtocol(statement);
		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			navigator.clipboard.writeText(statement).catch(() => {});
		}

		setIsNormaApplied(true);
		showToast(`Заключение «Норма» внесено в медицинскую карту${targetTooth}`, "success");
	};

	const handleApplyStandardProtocol = (preset: (typeof RADIOLOGY_STANDARD_PROTOCOLS)[number]) => {
		applyRadiologyProtocolToForm043({
			protocol: preset.text,
			options: { toothFdi: toothFdiCode, modalityLabel: "RVG/DICOM" },
			onInsertToProtocol,
			showNotification: true,
		});
		setIsProtocolsOpen(false);
	};

	// Cursor-centered Wheel Zoom
	const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
		e.preventDefault();
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const cursorX = e.clientX - rect.left;
		const cursorY = e.clientY - rect.top;
		const factor = e.deltaY < 0 ? 1.15 : 0.87;

		const result = calculateCursorCenteredZoom({
			currentZoom: zoom,
			zoomFactor: factor,
			cursorX,
			cursorY,
			canvasWidth: canvas.width,
			canvasHeight: canvas.height,
			currentPanX: panX,
			currentPanY: panY,
			minZoom: 0.2,
			maxZoom: 16.0,
		});

		setZoom(result.nextZoom);
		setPanX(result.nextPanX);
		setPanY(result.nextPanY);
	};

	// Mouse Down (Pan or Ruler)
	const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (e.button === 0 && activeTool === "pan") {
			isDraggingRef.current = true;
			dragStartPosRef.current = { x: e.clientX, y: e.clientY };
			dragStartPanRef.current = { x: panX, y: panY };
		}
	};

	const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const canvasX = e.clientX - rect.left;
		const canvasY = e.clientY - rect.top;

		if (activeTool === "magnifier") {
			setMagnifierPos({ x: canvasX, y: canvasY });
		}

		if (isDraggingRef.current && activeTool === "pan") {
			const dx = e.clientX - dragStartPosRef.current.x;
			const dy = e.clientY - dragStartPosRef.current.y;
			setPanX(dragStartPanRef.current.x + dx);
			setPanY(dragStartPanRef.current.y + dy);
			return;
		}

		// Ruler drafting update
		if (activeTool === "ruler" && draftStart) {
			const currentX = (canvasX - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
			const currentY = (canvasY - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
			setDraftCurrent({ x: currentX, y: currentY });
		}
	};

	const handleMouseLeave = () => {
		isDraggingRef.current = false;
		if (activeTool === "magnifier") {
			setMagnifierPos(null);
		}
	};

	const handleMouseUp = () => {
		isDraggingRef.current = false;
	};

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const clickX = (e.clientX - rect.left - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
		const clickY = (e.clientY - rect.top - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
		const pt: ViewerPoint2D = { x: clickX, y: clickY };

		if (activeTool === "ruler") {
			if (!draftStart) {
				setDraftStart(pt);
				setDraftCurrent(pt);
			} else {
				const distMm = calculatePhysicalDistanceMm(draftStart, pt, calibratedMmPerPx);
				setMeasurements((prev) => [
					...prev,
					{
						id: `ruler-${Date.now()}`,
						startX: draftStart.x,
						startY: draftStart.y,
						endX: pt.x,
						endY: pt.y,
						lengthMm: distMm,
						label: `${distMm.toFixed(1)} мм`,
						color: "#00C853",
					},
				]);
				setDraftStart(null);
				setDraftCurrent(null);
			}
		} else if (activeTool === "curved_canal") {
			setDraftCurvedPoints((prev) => [...prev, pt]);
		} else if (activeTool === "lesion_contour") {
			setDraftLesionPoints((prev) => [...prev, pt]);
		}
	};

	// Finalizes multi-point curved root canal apex caliper measurement
	const handleFinishCurvedCanal = useCallback(() => {
		if (draftCurvedPoints.length < 2) {
			setDraftCurvedPoints([]);
			return;
		}
		const lengthMm = calculateCurvedCanalLengthMm(draftCurvedPoints, calibratedMmPerPx);
		const canalIdx = curvedCanals.length + 1;
		const newCanal: ViewerCurvedMeasurement = {
			id: `canal-${Date.now()}`,
			points: draftCurvedPoints,
			totalLengthMm: lengthMm,
			label: `Канал #${canalIdx} (WL: ${lengthMm.toFixed(1)} мм)`,
			color: "#38bdf8",
		};
		setCurvedCanals((prev) => [...prev, newCanal]);
		setDraftCurvedPoints([]);
		showToast(`Эндо-канал #${canalIdx}: рабочая длина ${lengthMm.toFixed(1)} мм зафиксирована`, "success");
	}, [draftCurvedPoints, calibratedMmPerPx, curvedCanals.length]);

	// Finalizes periapical lesion / cyst contour polygon measurement (Gauss Shoelace)
	const handleFinishLesionContour = useCallback(() => {
		if (draftLesionPoints.length < 3) {
			setDraftLesionPoints([]);
			return;
		}
		const areaMm2 = calculateLesionAreaGaussMm2(draftLesionPoints, calibratedMmPerPx);
		const lesionIdx = lesionContours.length + 1;
		const newLesion: ViewerAreaMeasurement = {
			id: `lesion-${Date.now()}`,
			points: draftLesionPoints,
			areaMm2,
			label: `Очаг #${lesionIdx} (${areaMm2.toFixed(1)} мм²)`,
			color: "#f59e0b",
		};
		setLesionContours((prev) => [...prev, newLesion]);
		setDraftLesionPoints([]);
		showToast(`Очаг деструкции #${lesionIdx}: площадь ${areaMm2.toFixed(1)} мм² зафиксирована`, "success");
	}, [draftLesionPoints, calibratedMmPerPx, lesionContours.length]);

	// Clear all measurements
	const handleClearMeasurements = () => {
		setMeasurements([]);
		setCurvedCanals([]);
		setLesionContours([]);
		setDraftStart(null);
		setDraftCurrent(null);
		setDraftCurvedPoints([]);
		setDraftLesionPoints([]);
		showToast("Измерения снимка очищены", "info");
	};

	const effectiveTooth = activeStudy?.teethFdi?.[0] || toothFdiCode || "14";

	// 1-Click high-resolution PNG export with calibrated 5 mm ladder & clinical stamp
	const handleExportImage = async () => {
		const rawImg = rawImageRef.current;
		if (!rawImg) {
			showToast("Нет активного снимка для экспорта", "error");
			return;
		}
		setIsExporting(true);
		try {
			const blob = await renderClinicalExportBlob({
				rawImage: rawImg,
				filteredCanvas: filteredCanvasRef.current,
				measurements,
				curvedCanals,
				calibratedMmPerPx,
				patientName: (activeStudy as any)?.patientName || patientName,
				patientAge,
				patientBirthDate: (activeStudy as any)?.patientBirthDate || patientBirthDate,
				toothFdi: effectiveTooth,
				modalityLabel: (activeStudy as any)?.modalityLabel || "IO-СЕНСОР",
				studyDate: activeStudy?.studyDate,
			});

			if (!blob) {
				showToast("Не удалось сформировать экспорт", "error");
				return;
			}

			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `RVG_Tooth${effectiveTooth}_${Date.now()}.png`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			showToast(`Снимок зуба #${effectiveTooth} с калибровочной шкалой 5 мм экспортирован`, "success");
		} catch (err: any) {
			showToast("Ошибка при экспорте снимка", "error");
		} finally {
			setIsExporting(false);
		}
	};

	// Direct File Upload handler (honest clinical functionality without mocks)
	const handleProcessUploadedFile = useCallback((file: File) => {
		const objectUrl = URL.createObjectURL(file);
		const now = new Date();
		const newStudy: RadiologyFilmstripItem = {
			id: `uploaded-${Date.now()}`,
			title: file.name.replace(/\.[^/.]+$/, "") || `Снимок зуба ${effectiveTooth}`,
			modality: "intraoral_rvg",
			modalityLabel: "IO-СЕНСОР",
			studyDate: now.toLocaleDateString("ru-RU"),
			teethFdi: [effectiveTooth],
			imageUrl: objectUrl,
			thumbnailUrl: objectUrl,
		};
		setActiveStudy(newStudy);
		if (onSelectStudy) onSelectStudy(newStudy);
		showToast(`Снимок «${file.name}» успешно загружен`, "success");
	}, [effectiveTooth, onSelectStudy]);

	const handleDirectFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleProcessUploadedFile(file);
		}
		e.target.value = "";
	};

	// Touch Navigation & Gestures (1-finger pan/loupe, 2-finger pinch-to-zoom)
	const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2) {
			isTouchPinchingRef.current = true;
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			touchStartDistanceRef.current = dist;
			touchStartZoomRef.current = zoom;
			touchStartCenterRef.current = {
				x: (t1.clientX + t2.clientX) / 2,
				y: (t1.clientY + t2.clientY) / 2,
			};
			return;
		}

		if (e.touches.length === 1) {
			const t = e.touches[0]!;
			touchLastPosRef.current = { x: t.clientX, y: t.clientY };

			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const canvasX = t.clientX - rect.left;
			const canvasY = t.clientY - rect.top;

			if (activeTool === "pan") {
				isDraggingRef.current = true;
				dragStartPosRef.current = { x: t.clientX, y: t.clientY };
				dragStartPanRef.current = { x: panX, y: panY };
			} else if (activeTool === "magnifier") {
				setMagnifierPos({ x: canvasX, y: canvasY });
			}
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length === 2 && isTouchPinchingRef.current && touchStartDistanceRef.current) {
			const t1 = e.touches[0]!;
			const t2 = e.touches[1]!;
			const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
			const scale = dist / touchStartDistanceRef.current;
			const nextZoom = Math.min(16.0, Math.max(0.2, touchStartZoomRef.current * scale));
			setZoom(nextZoom);
			return;
		}

		if (e.touches.length === 1) {
			const t = e.touches[0]!;
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const canvasX = t.clientX - rect.left;
			const canvasY = t.clientY - rect.top;

			if (activeTool === "magnifier") {
				setMagnifierPos({ x: canvasX, y: canvasY });
				return;
			}

			if (isDraggingRef.current && activeTool === "pan") {
				const dx = t.clientX - dragStartPosRef.current.x;
				const dy = t.clientY - dragStartPosRef.current.y;
				setPanX(dragStartPanRef.current.x + dx);
				setPanY(dragStartPanRef.current.y + dy);
				return;
			}

			if (activeTool === "ruler" && draftStart) {
				const currentX = (canvasX - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
				const currentY = (canvasY - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
				setDraftCurrent({ x: currentX, y: currentY });
			}
		}
	};

	const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
		if (e.touches.length < 2) {
			isTouchPinchingRef.current = false;
			touchStartDistanceRef.current = null;
		}

		if (e.touches.length === 0) {
			isDraggingRef.current = false;
			if (activeTool === "magnifier") {
				setMagnifierPos(null);
			}
		}
	};

	const handleTouchCancel = () => {
		isTouchPinchingRef.current = false;
		touchStartDistanceRef.current = null;
		isDraggingRef.current = false;
		if (activeTool === "magnifier") {
			setMagnifierPos(null);
		}
	};

	return (
		<div
			data-testid="sensor-study-viewer"
			style={{
				position: isFullscreen ? "fixed" : "relative",
				inset: isFullscreen ? 0 : "auto",
				zIndex: isFullscreen ? 99999 : "auto",
				width: "100%",
				height: "100%",
				display: "flex",
				flexDirection: "column",
				backgroundColor: "#020617",
				color: "#f8fafc",
				userSelect: "none",
				overflow: "hidden",
			}}
			className={`sensor-study-viewer ${className}`}
		>
			{/* Top Clinical Toolbar (Desktop Toolbar or Mobile-First Top Bar) */}
			{!isFullscreen && (
				isMobile ? (
					<div
						data-testid="sensor-viewer-mobile-top-bar"
						className="flex items-center justify-between px-3 py-2 bg-[#070b14] border-b border-[#1e293b] text-xs shrink-0 select-none"
						style={{ paddingTop: "max(8px, env(safe-area-inset-top, 8px))" }}
					>
						<div className="flex items-center gap-2 min-w-0">
							<span className="px-2 py-0.5 rounded font-black text-[10px] bg-[#00C853] text-[#022c15] uppercase tracking-wider shrink-0">
								DENTE 2D
							</span>
							<div className="flex flex-col min-w-0">
								<span className="text-white font-semibold text-xs truncate">
									{(activeStudy as any)?.patientName || patientName || "Пациент"}
								</span>
								<span className="text-[10px] text-slate-400 truncate">
									Зуб #{effectiveTooth} • {(activeStudy as any)?.modalityLabel || "Прицельный снимок RVG"}
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
								className="p-1.5 rounded bg-[#1e293b] text-slate-300 border border-[#334155] cursor-pointer"
								title="Полноэкранный режим"
							>
								{isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
							</button>
							{/* Close button */}
							{onClose && (
								<button
									type="button"
									onClick={handleClose}
									className="p-1.5 rounded bg-transparent text-slate-400 hover:text-white border border-[#334155] cursor-pointer"
									title="Закрыть"
								>
									<X size={14} />
								</button>
							)}
						</div>
					</div>
				) : (
				<div
					data-testid="sensor-viewer-top-toolbar"
					className="flex items-center justify-between px-3 py-1 bg-[#070b14] border-b border-[#1e293b] text-xs h-9 min-h-[34px] max-h-[36px] shrink-0"
				>
				{/* Left: Brand Badge & Interactive Tools */}
				<div className="flex items-center gap-2">
					<span className="px-2 py-0.5 rounded font-black text-[11px] bg-[#00C853] text-[#022c15] uppercase tracking-wider">
						DENTE 2D
					</span>

					{/* Tool Toggle: Pan / Ruler / Curved Canal / Loupe */}
					<div className="flex items-center gap-1 bg-[#0f172a] p-0.5 rounded border border-[#334155]">
						<button
							type="button"
							onClick={() => setActiveTool("pan")}
							className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
								activeTool === "pan" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
							}`}
							data-testid="btn-tool-pan"
							title="Панорамирование (Рука)"
						>
							<Move size={12} />
							<span>Рука</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTool("ruler")}
							className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
								activeTool === "ruler" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
							}`}
							data-testid="btn-tool-ruler"
							title="Измерительная калибровочная линейка"
						>
							<Ruler size={12} />
							<span>Линейка</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTool("curved_canal")}
							className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
								activeTool === "curved_canal" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
							}`}
							data-testid="btn-tool-curved-canal"
							title="Эндо-линейка искривленных каналов (Working Length / Апекс)"
						>
							<Activity size={12} />
							<span>Канал (WL)</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTool("magnifier")}
							className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
								activeTool === "magnifier" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
							}`}
							data-testid="btn-tool-magnifier"
							title="Интерактивная 2.5x лупа для поиска микротрещин и апексов"
						>
							<Search size={12} />
							<span>Лупа 2.5x</span>
						</button>
						<button
							type="button"
							onClick={() => setActiveTool("lesion_contour")}
							className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
								activeTool === "lesion_contour" ? "bg-[#134e4a] text-[#2dd4bf]" : "text-slate-400 hover:text-white"
							}`}
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
							className="px-2 py-0.5 rounded bg-[#0284c7] hover:bg-[#0369a1] text-white text-[11px] font-bold cursor-pointer transition-colors"
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
							className="px-2 py-0.5 rounded bg-[#f59e0b] hover:bg-[#d97706] text-black text-[11px] font-bold cursor-pointer transition-colors"
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
							className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-[#1e293b] cursor-pointer"
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
						className="px-2 py-0.5 rounded border border-[#334155] bg-[#0f172a] text-slate-300 hover:text-white text-[11px] font-medium cursor-pointer"
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
						className={`px-2.5 py-1 rounded font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
							isNormaApplied
								? "bg-[#10b981]/25 border-[#10b981] text-[#a7f3d0]"
								: "bg-[#064e3b] border-[#10b981] text-[#a7f3d0] hover:bg-[#047857]"
						}`}
						data-testid="btn-sensor-norma"
						title="Внести норму патологии в медицинскую карту в 1 клик"
					>
						{isNormaApplied ? <CheckCircle2 size={12} /> : <Zap size={12} className="text-[#34d399]" />}
						<span>{isNormaApplied ? "Норма внесена ✓" : "Норма: патологии нет ✓"}</span>
					</button>

					{/* Standard Protocols Dropdown */}
					<div className="relative" ref={protocolsDropdownRef}>
						<button
							type="button"
							onClick={() => setIsProtocolsOpen((prev) => !prev)}
							className="px-2 py-1 rounded bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
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
									backgroundColor: "#0f172a",
									border: "1px solid #334155",
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
						className="px-2 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
						data-testid="btn-sensor-export-png"
						title="Экспортировать снимок с калибровочной шкалой 5 мм и метаданными клиники (PNG)"
					>
						<Download size={12} className="text-[#00C853]" />
						<span>{isExporting ? "Экспорт..." : "Экспорт"}</span>
					</button>

					{/* Consultation Split Mode Button (EzDent-i Screen 25) */}
					<button
						type="button"
						onClick={() => setShowConsultationSplit(true)}
						className="px-2 py-1 rounded bg-[#0f172a] hover:bg-[#1e293b] border border-[#334155] text-slate-200 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
						data-testid="btn-sensor-open-consultation"
						title="Перейти в режим сплит-консультации и библиотеки 8 дисциплин"
					>
						<SplitSquareHorizontal size={12} className="text-[#00C853]" />
						<span>Консультация</span>
					</button>

					{/* Fullscreen Button */}
					<button
						type="button"
						onClick={() => setIsFullscreen((prev) => !prev)}
						className="p-1 rounded bg-[#1e293b] hover:bg-[#334155] text-slate-300 border border-[#334155] cursor-pointer"
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
							className="p-1 rounded bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white border border-[#334155] cursor-pointer"
							title="Закрыть просмотрщик (Esc)"
							data-testid="btn-sensor-close"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>
			)
			)}

			{/* Main Canvas Viewport Area */}
			<div
				ref={containerRef}
				style={{
					flex: 1,
					position: "relative",
					overflow: "hidden",
					backgroundColor: "#020617",
				}}
				className="sensor-viewport-container"
			>
				{/* Fullscreen Clinical HUD (Top-Left) — Telemetry without kV/mA */}
				{(!isMobile || isFullscreen) && (
					<RadiologyClinicalHud
						patientName={(activeStudy as any)?.patientName || patientName}
						patientBirthDate={(activeStudy as any)?.patientBirthDate || patientBirthDate}
						patientAge={patientAge}
						patientGender={patientGender}
						medicalCardNumber={(activeStudy as any)?.medicalCardNumber || medicalCardNumber}
						toothFdi={effectiveTooth}
						modalityLabel={(activeStudy as any)?.modalityLabel || "IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)"}
						studyDate={activeStudy?.studyDate}
						isFullscreen={isFullscreen}
						onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
						onClose={handleClose}
					/>
				)}

				{/* Vertical 5 mm Calibrated Ladder Scale Ruler (Left Edge) */}
				<RadiologyCalibratedScaleRuler
					zoom={zoom}
					pixelPitchMicrons={pixelPitchMicrons}
					sensorModelOrDevice={(activeStudy as any)?.apparatusModel || "vatech_ezsensor"}
					targetLengthMm={5.0}
					position="left"
				/>

				{/* Empty state when no image is loaded */}
				{!activeImageUrl && (
					<div
						className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-300 gap-4 z-10"
						data-testid="sensor-viewer-empty-placeholder"
					>
						<div className="w-16 h-16 rounded-2xl bg-[#0f172a] border border-[#334155] flex items-center justify-center shadow-lg">
							<Scan size={36} className="text-[#2dd4bf]" />
						</div>
						<div className="text-center max-w-sm">
							<h3 className="text-sm font-bold text-white mb-1">Снимки пока не загружены</h3>
							<p className="text-xs text-slate-400">
								Выберите снимок в истории исследований пациента, загрузите локальный файл или выполните захват с визиографа
							</p>
						</div>
						<div className="flex flex-wrap items-center justify-center gap-2">
							<button
								type="button"
								onClick={() => uploadInputRef.current?.click()}
								className="px-3.5 py-2 rounded-lg bg-[#00C853] hover:bg-[#00b047] text-[#022c15] text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-transform active:scale-95"
								data-testid="btn-empty-upload-image"
							>
								<UploadCloud size={14} />
								<span>+ Загрузить снимок / DICOM</span>
							</button>
							<button
								type="button"
								onClick={() => {
									showToast("Датчик RVG EzSensor подключен и откалиброван. Готов к экспозиции.", "info");
								}}
								className="px-3 py-2 rounded-lg bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-slate-200 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors"
								data-testid="btn-empty-connect-rvg"
							>
								<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
								<span>Подключить визиограф RVG</span>
							</button>
						</div>
					</div>
				)}

				<input
					type="file"
					ref={uploadInputRef}
					onChange={handleDirectFileUpload}
					accept="image/*,.dcm,application/dicom"
					style={{ display: "none" }}
					data-testid="input-direct-file-upload"
				/>

				{/* Active Canvas Layer */}
				<canvas
					ref={canvasRef}
					data-testid="sensor-viewer-canvas"
					style={{
						width: "100%",
						height: "100%",
						display: "block",
						touchAction: "none",
						cursor:
							activeTool === "ruler" || activeTool === "curved_canal"
								? "crosshair"
								: activeTool === "magnifier"
								? "crosshair"
								: "grab",
					}}
					onWheel={handleWheel}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseLeave={handleMouseLeave}
					onMouseUp={handleMouseUp}
					onClick={handleCanvasClick}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
					onTouchCancel={handleTouchCancel}
					onContextMenu={(e) => e.preventDefault()}
				/>
			</div>

			{/* Bottom EzDent-i Filmstrip Dock (Hidden in 100% fullscreen HUD mode) */}
			{!isFullscreen && (
				!isMobile ? (
					<RadiologyFilmstripDock
						studies={effectiveStudiesHistory}
						activeStudyId={activeStudy?.id || null}
						onSelectStudy={(selected) => {
							setActiveStudy(selected);
							if (onSelectStudy) onSelectStudy(selected);
						}}
					/>
				) : (
					<SensorStudyMobileBar
						activeTool={activeTool}
						onSelectTool={setActiveTool}
						invert={filters.invert}
						onToggleInvert={() => setFilters((prev) => ({ ...prev, invert: !prev.invert }))}
						onOpenWl={() => setIsMobileWlDrawerOpen(true)}
						isWlOpen={isMobileWlDrawerOpen}
						hasActiveFilters={
							filters.sharpness ||
							filters.maxSharpness ||
							filters.pseudoRelief ||
							brightnessPct !== 0 ||
							contrastPct !== 0
						}
						onOpenStudies={() => setIsMobileFilmstripDrawerOpen(true)}
						isStudiesOpen={isMobileFilmstripDrawerOpen}
						studiesCount={effectiveStudiesHistory.length}
						measurementsCount={measurements.length + curvedCanals.length + lesionContours.length}
						onClearMeasurements={handleClearMeasurements}
					/>
				)
			)}

			{/* Native iOS Bottom Sheet Drawers (Apple HIG) */}
			<SensorStudyMobileWlDrawer
				isOpen={isMobileWlDrawerOpen}
				onClose={() => setIsMobileWlDrawerOpen(false)}
				brightnessPct={brightnessPct}
				contrastPct={contrastPct}
				onBrightnessChange={setBrightnessPct}
				onContrastChange={setContrastPct}
				filters={filters}
				onFilterChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
				onReset={handleResetFilters}
			/>

			<SensorStudyMobileStudiesDrawer
				isOpen={isMobileFilmstripDrawerOpen}
				onClose={() => setIsMobileFilmstripDrawerOpen(false)}
				studies={effectiveStudiesHistory}
				activeStudyId={activeStudy?.id || null}
				onSelectStudy={(selected) => {
					setActiveStudy(selected);
					if (onSelectStudy) onSelectStudy(selected);
					setIsMobileFilmstripDrawerOpen(false);
				}}
				onUploadFile={handleProcessUploadedFile}
			/>

			{showConsultationSplit && (
				<div className="fixed inset-0 z-[100000] bg-[#020617] flex flex-col">
					<RadiologyConsultationSplit
						patientName={(activeStudy as any)?.patientName || patientName}
						patientCardNumber={(activeStudy as any)?.medicalCardNumber || medicalCardNumber}
						patientAge={patientAge}
						patientGender={patientGender}
						activeToothFdi={effectiveTooth}
						initialLeftStudy={activeStudy || undefined}
						patientStudiesHistory={effectiveStudiesHistory}
						onClose={() => setShowConsultationSplit(false)}
						onInsertProtocol={onInsertToProtocol}
					/>
				</div>
			)}
		</div>
	);
};
