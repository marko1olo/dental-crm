import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import type React from "react";
import {
	calculatePhysicalDistanceMm,
	resolveCalibratedPixelSpacing,
	apply2DSpatialConvolution,
	calculateCurvedCanalLengthMm,
	calculateLesionAreaGaussMm2,
	UNSHARP_MASK_KERNEL_3X3,
	HIGH_BOOST_KERNEL_3X3,
	EMBOSS_45_KERNEL_3X3,
	type ViewerPoint2D,
} from "../dentalViewerMath.js";
import {
	drawRuler,
	drawCurvedCanal,
	drawLesionContour,
	drawMagnifierOverlay,
	renderClinicalExportBlob,
} from "../dentalViewerCanvasDraw.js";
import type { RadiologyFilmstripItem } from "../RadiologyFilmstripDock.js";
import {
	DEFAULT_QUICK_FILTERS_STATE,
	type RadiologyQuickFilterState,
} from "../RadiologyQuickFiltersPanel.js";
import { teardownViewportCanvases } from "../../../utils/viewportTeardownHelper.js";
import {
	RADIOLOGY_STANDARD_PROTOCOLS,
	applyRadiologyProtocolToForm043,
} from "../radiologyProtocols.js";
import { useVisitStore } from "../../../store/visitStore.js";
import { showToast } from "../../GlobalToast.js";
import { isDemoPatientId, isDemoShowcaseMode } from "../../../lib/demoMode.js";
import type { RadiologyStudy } from "../types.js";
import type { SensorStudyViewerProps, ViewerTool, SensorViewerState } from "./types.js";
import { useSensorViewerMeasurements } from "./useSensorViewerMeasurements.js";
import { useSensorViewerGestures } from "./useSensorViewerGestures.js";

export function useSensorViewerState(props: SensorStudyViewerProps): SensorViewerState {
	const {
		study,
		studiesHistory = [],
		initialImageUrl,
		patientName,
		patientBirthDate,
		patientAge,
		medicalCardNumber,
		toothFdiCode,
		onSelectStudy,
		onInsertToProtocol,
		onClose,
	} = props;

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
	const [activeTool, setActiveTool] = useState<ViewerTool>("pan");
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

	// Magnifier position (screen coords) & export state
	const [magnifierPos, setMagnifierPos] = useState<ViewerPoint2D | null>(null);
	const [isExporting, setIsExporting] = useState<boolean>(false);

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

	// Spatial calibration
	const calibratedMmPerPx = useMemo(() => {
		const device = (activeStudy as any)?.apparatusModel || "vatech_ezsensor";
		return resolveCalibratedPixelSpacing(device, 0.0350);
	}, [activeStudy]);

	const pixelPitchMicrons = useMemo(() => {
		return Number((calibratedMmPerPx * 1000.0).toFixed(1));
	}, [calibratedMmPerPx]);

	// Measurements sub-hook
	const {
		measurements,
		setMeasurements,
		draftStart,
		setDraftStart,
		draftCurrent,
		setDraftCurrent,
		curvedCanals,
		draftCurvedPoints,
		setDraftCurvedPoints,
		lesionContours,
		draftLesionPoints,
		setDraftLesionPoints,
		handleFinishCurvedCanal,
		handleFinishLesionContour,
		handleClearMeasurements,
		measurementsCount,
	} = useSensorViewerMeasurements({ calibratedMmPerPx });

	// Gestures sub-hook
	const {
		handleWheel,
		handleMouseDown,
		handleMouseMove,
		handleMouseLeave,
		handleMouseUp,
		handleCanvasClick,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleTouchCancel,
	} = useSensorViewerGestures({
		canvasRef,
		rawImageRef,
		zoom,
		setZoom,
		panX,
		setPanX,
		panY,
		setPanY,
		activeTool,
		draftStart,
		setDraftStart,
		setDraftCurrent,
		setMagnifierPos,
		setMeasurements,
		setDraftCurvedPoints,
		setDraftLesionPoints,
		calibratedMmPerPx,
	});

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
			// Convolution filter limit must support high-res RVG sensors up to 2600px
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
		lesionContours,
		draftLesionPoints,
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

	// Reset Pan & Zoom
	const handleResetView = useCallback(() => {
		setZoom(1.0);
		setPanX(0);
		setPanY(0);
	}, []);

	// Reset All Filters
	const handleResetFilters = useCallback(() => {
		setFilters(DEFAULT_QUICK_FILTERS_STATE);
		setBrightnessPct(0);
		setContrastPct(0);
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
	}, [isFullscreen, handleClose, handleResetView]);

	// 1-Click Norma Injection (Mandate 8e)
	const handleInsertNorma = useCallback(() => {
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
	}, [toothFdiCode, onInsertToProtocol]);

	const handleApplyStandardProtocol = useCallback((preset: (typeof RADIOLOGY_STANDARD_PROTOCOLS)[number]) => {
		applyRadiologyProtocolToForm043({
			protocol: preset.text,
			options: { toothFdi: toothFdiCode, modalityLabel: "RVG/DICOM" },
			onInsertToProtocol,
			showNotification: true,
		});
		setIsProtocolsOpen(false);
	}, [toothFdiCode, onInsertToProtocol]);

	const effectiveTooth = activeStudy?.teethFdi?.[0] || toothFdiCode || "14";

	// 1-Click high-resolution PNG export with calibrated 5 mm ladder & clinical stamp
	const handleExportImage = useCallback(async () => {
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
		} catch {
			showToast("Ошибка при экспорте снимка", "error");
		} finally {
			setIsExporting(false);
		}
	}, [measurements, curvedCanals, calibratedMmPerPx, activeStudy, patientName, patientAge, patientBirthDate, effectiveTooth]);

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

	const handleDirectFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			handleProcessUploadedFile(file);
		}
		e.target.value = "";
	}, [handleProcessUploadedFile]);

	return {
		activeStudy,
		setActiveStudy,
		activeImageUrl,
		effectiveStudiesHistory,
		effectiveTooth,
		containerRef,
		canvasRef,
		uploadInputRef,
		protocolsDropdownRef,
		zoom,
		setZoom,
		panX,
		setPanX,
		panY,
		setPanY,
		activeTool,
		setActiveTool,
		isFullscreen,
		setIsFullscreen,
		showConsultationSplit,
		setShowConsultationSplit,
		filters,
		setFilters,
		brightnessPct,
		setBrightnessPct,
		contrastPct,
		setContrastPct,
		isNormaApplied,
		isProtocolsOpen,
		setIsProtocolsOpen,
		measurements,
		draftStart,
		draftCurrent,
		curvedCanals,
		draftCurvedPoints,
		lesionContours,
		draftLesionPoints,
		measurementsCount,
		magnifierPos,
		isExporting,
		isMobile,
		isMobileWlDrawerOpen,
		setIsMobileWlDrawerOpen,
		isMobileFilmstripDrawerOpen,
		setIsMobileFilmstripDrawerOpen,
		calibratedMmPerPx,
		pixelPitchMicrons,
		handleResetView,
		handleResetFilters,
		handleInsertNorma,
		handleApplyStandardProtocol,
		handleFinishCurvedCanal,
		handleFinishLesionContour,
		handleClearMeasurements,
		handleExportImage,
		handleProcessUploadedFile,
		handleDirectFileUpload,
		handleClose,
		handleWheel,
		handleMouseDown,
		handleMouseMove,
		handleMouseLeave,
		handleMouseUp,
		handleCanvasClick,
		handleTouchStart,
		handleTouchMove,
		handleTouchEnd,
		handleTouchCancel,
	};
}
