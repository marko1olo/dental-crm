/**
 * DENTE CRM — Canonical EzDent-i 2D Sensor & X-Ray Study Viewer (SensorStudyViewer)
 * Features:
 * 1. Persistent horizontal bottom Filmstrip Dock with dates, times, modality badges, and 3px #00C853 active border.
 * 2. 1-Click Quick Filter Toggles: Unsharp Masking, High-Boost Max Sharpness, Invert, Emboss 45° pseudo-relief + Reset.
 * 3. Vertical 5 mm calibrated ladder scale ruler with physical grounding to EzSensor 35.0 µm or Soft HR 14.8 µm.
 * 4. Fullscreen Clinical Cockpit HUD with patient telemetry, FDI tooth (e.g. 14), and radiation DAP dose.
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
	FileText,
	Maximize2,
	Minimize2,
	Move,
	RotateCcw,
	Ruler,
	Scan,
	Sliders,
	Sparkles,
	UploadCloud,
	X,
	Zap,
} from "lucide-react";
import {
	calculateCursorCenteredZoom,
	calculatePhysicalDistanceMm,
	calculateScaleRulerHeightPx,
	formatDistanceMm,
	resolveCalibratedPixelSpacing,
	apply2DSpatialConvolution,
	UNSHARP_MASK_KERNEL_3X3,
	HIGH_BOOST_KERNEL_3X3,
	EMBOSS_45_KERNEL_3X3,
	VATECH_DEVICE_CALIBRATION_PRESETS,
	type ViewerPoint2D,
	type ViewerRulerMeasurement,
} from "./dentalViewerMath.js";
import { RadiologyFilmstripDock, type RadiologyFilmstripItem } from "./RadiologyFilmstripDock.js";
import {
	RadiologyQuickFiltersPanel,
	DEFAULT_QUICK_FILTERS_STATE,
	type RadiologyQuickFilterState,
} from "./RadiologyQuickFiltersPanel.js";
import { RadiologyCalibratedScaleRuler } from "./RadiologyCalibratedScaleRuler.js";
import { RadiologyClinicalHud } from "./RadiologyClinicalHud.js";
import {
	RADIOLOGY_STANDARD_PROTOCOLS,
	applyRadiologyProtocolToForm043,
} from "./radiologyProtocols.js";
import { useVisitStore } from "../../store/visitStore.js";
import { showToast } from "../GlobalToast.js";
import type { RadiologyStudy } from "./types.js";

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
	patientName = "Чухрова Лариса",
	patientBirthDate = "01.01.1968",
	patientAge = "58Y",
	patientGender = "Жен.",
	medicalCardNumber = "20190621_101042",
	toothFdiCode = "14",
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
		return "/radiology/sample_rvg_tooth16.jpg";
	}, [activeStudy, initialImageUrl]);

	// Viewport Navigation & Canvas refs
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const rawImageRef = useRef<HTMLImageElement | null>(null);
	const filteredCanvasRef = useRef<HTMLCanvasElement | null>(null);

	// Zoom & Pan state
	const [zoom, setZoom] = useState<number>(1.0);
	const [panX, setPanX] = useState<number>(0);
	const [panY, setPanY] = useState<number>(0);
	const [activeTool, setActiveTool] = useState<"pan" | "ruler" | "window_level">("pan");
	const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

	// Quick Filters State
	const [filters, setFilters] = useState<RadiologyQuickFilterState>(DEFAULT_QUICK_FILTERS_STATE);
	const [brightnessPct, setBrightnessPct] = useState<number>(0);
	const [contrastPct, setContrastPct] = useState<number>(0);

	// 1-Click Norma Protocol state
	const [isNormaApplied, setIsNormaApplied] = useState<boolean>(false);
	const [isProtocolsOpen, setIsProtocolsOpen] = useState<boolean>(false);
	const protocolsDropdownRef = useRef<HTMLDivElement>(null);

	// Interactive ruler measurements
	const [measurements, setMeasurements] = useState<ViewerRulerMeasurement[]>([]);
	const [draftStart, setDraftStart] = useState<ViewerPoint2D | null>(null);
	const [draftCurrent, setDraftCurrent] = useState<ViewerPoint2D | null>(null);

	// Mouse drag tracking
	const isDraggingRef = useRef<boolean>(false);
	const dragStartPosRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });
	const dragStartPanRef = useRef<ViewerPoint2D>({ x: 0, y: 0 });

	// Spatial calibration
	const calibratedMmPerPx = useMemo(() => {
		const device = activeStudy?.apparatusModel || "vatech_ezsensor";
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
			let pixels = imgData.data;

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
			if (filters.maxSharpness && img.width <= 1500) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, HIGH_BOOST_KERNEL_3X3);
			} else if (filters.sharpness && img.width <= 1500) {
				pixels = apply2DSpatialConvolution(pixels, img.width, img.height, UNSHARP_MASK_KERNEL_3X3);
			} else if (filters.pseudoRelief && img.width <= 1500) {
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

		// Draw completed rulers
		for (const r of measurements) {
			drawRuler(ctx, { x: r.startX, y: r.startY }, { x: r.endX, y: r.endY }, r.label || `${r.lengthMm.toFixed(1)} мм`);
		}

		// Draw draft ruler in progress
		if (draftStart && draftCurrent) {
			const distMm = calculatePhysicalDistanceMm(draftStart, draftCurrent, calibratedMmPerPx);
			drawRuler(ctx, draftStart, draftCurrent, `${distMm.toFixed(1)} мм`, "#f59e0b");
		}

		ctx.restore();
	}, [panX, panY, zoom, measurements, draftStart, draftCurrent, calibratedMmPerPx]);

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
				} else if (onClose) {
					onClose();
				}
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isFullscreen, onClose]);

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
		showToast(`Заключение «Норма» внесено в карту 043/у${targetTooth}`, "success");
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
		if (isDraggingRef.current && activeTool === "pan") {
			const dx = e.clientX - dragStartPosRef.current.x;
			const dy = e.clientY - dragStartPosRef.current.y;
			setPanX(dragStartPanRef.current.x + dx);
			setPanY(dragStartPanRef.current.y + dy);
			return;
		}

		// Ruler drafting update
		if (activeTool === "ruler" && draftStart) {
			const canvas = canvasRef.current;
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const currentX = (e.clientX - rect.left - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
			const currentY = (e.clientY - rect.top - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
			setDraftCurrent({ x: currentX, y: currentY });
		}
	};

	const handleMouseUp = () => {
		isDraggingRef.current = false;
	};

	const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (activeTool !== "ruler") return;
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const clickX = (e.clientX - rect.left - (canvas.width / 2 + panX)) / zoom + (rawImageRef.current?.width || 0) / 2;
		const clickY = (e.clientY - rect.top - (canvas.height / 2 + panY)) / zoom + (rawImageRef.current?.height || 0) / 2;
		const pt: ViewerPoint2D = { x: clickX, y: clickY };

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
	};

	const effectiveTooth = activeStudy?.teethFdi?.[0] || toothFdiCode;

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
			{/* Top Desktop Clinical Toolbar (Strict 32-36px density) */}
			<div
				data-testid="sensor-viewer-top-toolbar"
				className="flex items-center justify-between px-3 py-1 bg-[#070b14] border-b border-[#1e293b] text-xs h-9 min-h-[34px] max-h-[36px] shrink-0"
			>
				{/* Left: Brand Badge & Interactive Tools */}
				<div className="flex items-center gap-2">
					<span className="px-2 py-0.5 rounded font-black text-[11px] bg-[#00C853] text-[#022c15] uppercase tracking-wider">
						EzDent-i 2D
					</span>

					{/* Tool Toggle: Pan / Ruler */}
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
					</div>

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
						className={`px-2.5 py-1 rounded font-bold text-[11px] border transition-all cursor-pointer flex items-center gap-1 ${
							isNormaApplied
								? "bg-[#10b981]/25 border-[#10b981] text-[#a7f3d0]"
								: "bg-[#064e3b] border-[#10b981] text-[#a7f3d0] hover:bg-[#047857]"
						}`}
						data-testid="btn-sensor-norma"
						title="Внести норму патологии в карту 043/у в 1 клик"
					>
						{isNormaApplied ? <CheckCircle2 size={12} /> : <Zap size={12} className="text-[#34d399]" />}
						<span>{isNormaApplied ? "Норма внесена" : "Норма (043/у)"}</span>
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
							onClick={onClose}
							className="p-1 rounded bg-transparent hover:bg-slate-800 text-slate-400 hover:text-white border border-[#334155] cursor-pointer"
							title="Закрыть просмотрщик (Esc)"
							data-testid="btn-sensor-close"
						>
							<X size={14} />
						</button>
					)}
				</div>
			</div>

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
				{/* Fullscreen Clinical HUD (Top-Left) */}
				<RadiologyClinicalHud
					patientName={activeStudy?.patientName || patientName}
					patientBirthDate={activeStudy?.patientBirthDate || patientBirthDate}
					patientAge={patientAge}
					patientGender={patientGender}
					medicalCardNumber={activeStudy?.medicalCardNumber || medicalCardNumber}
					toothFdi={effectiveTooth}
					modalityLabel={activeStudy?.modalityLabel || "IO-СЕНСОР (ВНУТРИРОТОВОЙ СЕНСОР)"}
					studyDate={activeStudy?.studyDate || "01.10.2026"}
					voltageKv={activeStudy?.metadata?.kv || 65}
					currentMa={activeStudy?.metadata?.ma || 7.0}
					exposureSec={activeStudy?.metadata?.exposureSec || 0.08}
					dapDoseDgyCm2={0.024}
					apparatusModel={activeStudy?.apparatusModel || "Vatech EzSensor Soft"}
					isFullscreen={isFullscreen}
					onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
					onClose={onClose}
				/>

				{/* Vertical 5 mm Calibrated Ladder Scale Ruler (Right Edge) */}
				<RadiologyCalibratedScaleRuler
					zoom={zoom}
					pixelPitchMicrons={pixelPitchMicrons}
					sensorModelOrDevice={activeStudy?.apparatusModel || "vatech_ezsensor"}
					targetLengthMm={5.0}
					position="right"
				/>

				{/* Active Canvas Layer */}
				<canvas
					ref={canvasRef}
					data-testid="sensor-viewer-canvas"
					style={{
						width: "100%",
						height: "100%",
						display: "block",
						cursor: activeTool === "ruler" ? "crosshair" : "grab",
					}}
					onWheel={handleWheel}
					onMouseDown={handleMouseDown}
					onMouseMove={handleMouseMove}
					onMouseUp={handleMouseUp}
					onClick={handleCanvasClick}
					onContextMenu={(e) => e.preventDefault()}
				/>
			</div>

			{/* Bottom EzDent-i Filmstrip Dock */}
			<RadiologyFilmstripDock
				studies={studiesHistory.length > 0 ? studiesHistory : activeStudy ? [activeStudy] : []}
				activeStudyId={activeStudy?.id || null}
				onSelectStudy={(selected) => {
					setActiveStudy(selected);
					if (onSelectStudy) onSelectStudy(selected);
				}}
			/>
		</div>
	);
};

function drawRuler(
	ctx: CanvasRenderingContext2D,
	p1: ViewerPoint2D,
	p2: ViewerPoint2D,
	label: string,
	color = "#00C853",
) {
	ctx.save();
	ctx.strokeStyle = color;
	ctx.lineWidth = 2.5;
	ctx.beginPath();
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();

	// End ticks
	const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
	const perp = angle + Math.PI / 2;
	const tickLen = 7;

	ctx.beginPath();
	ctx.moveTo(p1.x - Math.cos(perp) * tickLen, p1.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p1.x + Math.cos(perp) * tickLen, p1.y + Math.sin(perp) * tickLen);
	ctx.moveTo(p2.x - Math.cos(perp) * tickLen, p2.y - Math.sin(perp) * tickLen);
	ctx.lineTo(p2.x + Math.cos(perp) * tickLen, p2.y + Math.sin(perp) * tickLen);
	ctx.stroke();

	// Label pill
	const midX = (p1.x + p2.x) / 2;
	const midY = (p1.y + p2.y) / 2;
	ctx.font = "bold 13px monospace";
	const textWidth = ctx.measureText(label).width;
	const padX = 6;

	ctx.fillStyle = "rgba(2, 6, 23, 0.92)";
	ctx.strokeStyle = color;
	ctx.lineWidth = 1;
	ctx.beginPath();
	ctx.rect(midX + 4, midY - 20, textWidth + padX * 2, 22);
	ctx.fill();
	ctx.stroke();

	ctx.fillStyle = "#ffffff";
	ctx.textBaseline = "middle";
	ctx.fillText(label, midX + 4 + padX, midY - 9);
	ctx.restore();
}
