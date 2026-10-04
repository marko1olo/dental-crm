import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	Bot,
	Camera,
	Check,
	ChevronRight,
	Contrast,
	FileText,
	Maximize2,
	Plus,
	RefreshCw,
	RotateCw,
	Ruler,
	Sliders,
	Sparkles,
	UploadCloud,
	X,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { formatShortDate } from "../../AppHelpers";
import { showToast } from "../GlobalToast";
import "./mobileRadiology.css";

export interface MobileChairsideStudyItem {
	id: string;
	title: string;
	kind: string;
	region?: string | null;
	toothCode?: string | null;
	capturedAt: string;
	previewUrl?: string | null;
	storagePath?: string | null;
	sourceKind?: string | null;
	sourceName?: string | null;
	aiSummary?: string | null;
}

export interface MobileChairsideRadiologyViewerProps {
	selectedImagingStudy: MobileChairsideStudyItem | null;
	activeImagingStudies: MobileChairsideStudyItem[];
	activePatient: {
		id?: string | null;
		fullName?: string | null;
		name?: string | null;
	} | null;
	onSelectStudy: (studyId: string) => void;
	effectivePreviewUrl: string | null;
	isPreviewLoading: boolean;
	previewLoadError: boolean;
	selectedStudyHasFile: boolean;
	imagingKindLabels: Record<string, string>;
	onCaptureCamera: () => void;
	onPickFiles: () => void;
	onAnalyzeAI: () => void;
	isAnalyzingAI: boolean;
	onOpenCbctStudio?: () => void;
	onOpenPanoramic?: () => void;
	onOpenRadiologyModule?: () => void;
	onClose?: () => void;
}

export const MobileChairsideRadiologyViewer: React.FC<MobileChairsideRadiologyViewerProps> = ({
	selectedImagingStudy,
	activeImagingStudies = [],
	activePatient,
	onSelectStudy,
	effectivePreviewUrl,
	isPreviewLoading,
	previewLoadError,
	selectedStudyHasFile,
	imagingKindLabels = {},
	onCaptureCamera,
	onPickFiles,
	onAnalyzeAI,
	isAnalyzingAI,
	onOpenCbctStudio,
	onOpenPanoramic,
	onOpenRadiologyModule,
	onClose,
}) => {
	// Viewport transformations & filters
	const [zoom, setZoom] = useState<number>(1.0);
	const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
	const [rotationDeg, setRotationDeg] = useState<number>(0);
	const [inverted, setInverted] = useState<boolean>(false);
	const [contrast, setContrast] = useState<number>(1.0);
	const [brightness, setBrightness] = useState<number>(1.0);
	const [enhancementClahe, setEnhancementClahe] = useState<boolean>(false);

	// Measurement caliper (Ruler in mm)
	const [isRulerActive, setIsRulerActive] = useState<boolean>(false);
	const [rulerStart, setRulerStart] = useState<{ x: number; y: number } | null>(null);
	const [rulerCurrent, setRulerCurrent] = useState<{ x: number; y: number } | null>(null);
	const [savedRulerDistanceMm, setSavedRulerDistanceMm] = useState<number | null>(null);

	// Drawers and panels
	const [isStudiesSheetOpen, setIsStudiesSheetOpen] = useState<boolean>(false);
	const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState<boolean>(false);
	const [studiesSheetFilter, setStudiesSheetFilter] = useState<string>("all");

	// Container refs
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const touchStartRef = useRef<{
		x: number;
		y: number;
		panX: number;
		panY: number;
		dist: number;
		initialZoom: number;
		lastTapTime: number;
	}>({
		x: 0,
		y: 0,
		panX: 0,
		panY: 0,
		dist: 0,
		initialZoom: 1.0,
		lastTapTime: 0,
	});

	// Pixel spacing for clinical caliper (0.04 mm/px for RVG, 0.1 mm/px for OPG)
	const pixelSpacingMm = useMemo(() => {
		const kind = selectedImagingStudy?.kind;
		if (kind === "periapical" || kind === "bitewing") return 0.04;
		if (kind === "opg") return 0.1;
		if (kind === "cbct") return 0.125;
		return 0.04;
	}, [selectedImagingStudy?.kind]);

	// Format study metadata
	const toothCode = selectedImagingStudy?.toothCode;
	const region = selectedImagingStudy?.region;
	const toothBadge = toothCode ? `Зуб #${toothCode}` : region ? region : "Интраорально";
	const modalityTitle = selectedImagingStudy
		? imagingKindLabels[selectedImagingStudy.kind] || selectedImagingStudy.kind
		: "Рентгенодиагностика";
	const studyDateStr = selectedImagingStudy?.capturedAt
		? formatShortDate(selectedImagingStudy.capturedAt)
		: "Сегодня";

	// Filtered list of studies for bottom sheet
	const filteredStudies = useMemo(() => {
		if (studiesSheetFilter === "all") return activeImagingStudies;
		return activeImagingStudies.filter((s) => s.kind === studiesSheetFilter);
	}, [activeImagingStudies, studiesSheetFilter]);

	// Haptic feedback trigger helper
	const triggerHaptic = useCallback(() => {
		try {
			if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
				navigator.vibrate(10);
			}
		} catch {
			// ignore
		}
	}, []);

	// Reset pan, zoom and orientation
	const handleResetTransform = useCallback(() => {
		triggerHaptic();
		setZoom(1.0);
		setPan({ x: 0, y: 0 });
		setRotationDeg(0);
		setIsRulerActive(false);
		setRulerStart(null);
		setRulerCurrent(null);
		setSavedRulerDistanceMm(null);
		showToast("Масштаб и положение сброшены", "info");
	}, [triggerHaptic]);

	// Quick step zoom
	const handleCycleZoom = useCallback(() => {
		triggerHaptic();
		setZoom((prev) => {
			if (prev < 1.4) return 1.5;
			if (prev < 1.9) return 2.0;
			if (prev < 2.4) return 2.5;
			setPan({ x: 0, y: 0 });
			return 1.0;
		});
	}, [triggerHaptic]);

	// Toggle inversion (Negative)
	const handleToggleInvert = useCallback(() => {
		triggerHaptic();
		setInverted((prev) => !prev);
	}, [triggerHaptic]);

	// Cycle contrast
	const handleCycleContrast = useCallback(() => {
		triggerHaptic();
		setContrast((prev) => {
			if (prev < 1.25) return 1.35;
			if (prev < 1.55) return 1.7;
			return 1.0;
		});
	}, [triggerHaptic]);

	// Touch gesture handlers for Touch Pan, Pinch-to-zoom and Ruler
	const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			if (!touch) return;
			const now = Date.now();
			const isDoubleTap = now - touchStartRef.current.lastTapTime < 280;
			touchStartRef.current.lastTapTime = now;

			if (isDoubleTap && !isRulerActive) {
				// Double tap toggle between 1.0x and 2.0x
				triggerHaptic();
				setZoom((prev) => (prev > 1.2 ? 1.0 : 2.0));
				setPan({ x: 0, y: 0 });
				return;
			}

			if (isRulerActive && viewportRef.current) {
				const rect = viewportRef.current.getBoundingClientRect();
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				setRulerStart({ x, y });
				setRulerCurrent({ x, y });
				return;
			}

			touchStartRef.current = {
				x: touch.clientX,
				y: touch.clientY,
				panX: pan.x,
				panY: pan.y,
				dist: 0,
				initialZoom: zoom,
				lastTapTime: now,
			};
		} else if (e.touches.length === 2) {
			// Pinch start
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (!t1 || !t2) return;
			const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
			touchStartRef.current.dist = dist;
			touchStartRef.current.initialZoom = zoom;
		}
	};

	const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
		if (e.touches.length === 1) {
			const touch = e.touches[0];
			if (!touch) return;
			if (isRulerActive && rulerStart && viewportRef.current) {
				const rect = viewportRef.current.getBoundingClientRect();
				const x = touch.clientX - rect.left;
				const y = touch.clientY - rect.top;
				setRulerCurrent({ x, y });
				return;
			}

			const dx = touch.clientX - touchStartRef.current.x;
			const dy = touch.clientY - touchStartRef.current.y;
			setPan({
				x: touchStartRef.current.panX + dx,
				y: touchStartRef.current.panY + dy,
			});
		} else if (e.touches.length === 2) {
			// Pinch zoom
			const t1 = e.touches[0];
			const t2 = e.touches[1];
			if (!t1 || !t2) return;
			const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
			if (touchStartRef.current.dist > 0) {
				const scale = dist / touchStartRef.current.dist;
				const nextZoom = Math.max(0.8, Math.min(4.5, touchStartRef.current.initialZoom * scale));
				setZoom(Number(nextZoom.toFixed(2)));
			}
		}
	};

	const handleTouchEnd = () => {
		if (isRulerActive && rulerStart && rulerCurrent) {
			const dx = rulerCurrent.x - rulerStart.x;
			const dy = rulerCurrent.y - rulerStart.y;
			const distPx = Math.hypot(dx, dy);
			if (distPx > 10) {
				const distMm = Number(((distPx / zoom) * pixelSpacingMm).toFixed(1));
				setSavedRulerDistanceMm(distMm);
				triggerHaptic();
				showToast(`Измерение: ${distMm} мм`, "success");
			} else {
				setRulerStart(null);
				setRulerCurrent(null);
			}
		}
	};

	// Computed CSS filter string
	const computedFilter = useMemo(() => {
		const parts: string[] = [];
		if (inverted) parts.push("invert(1)");
		if (contrast !== 1.0) parts.push(`contrast(${contrast})`);
		if (brightness !== 1.0) parts.push(`brightness(${brightness})`);
		if (enhancementClahe) parts.push("contrast(1.4) drop-shadow(0 0 1px #2dd4bf)");
		return parts.length > 0 ? parts.join(" ") : "none";
	}, [inverted, contrast, brightness, enhancementClahe]);

	// Computed transform style
	const computedTransform = useMemo(() => {
		return `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotationDeg}deg)`;
	}, [pan.x, pan.y, zoom, rotationDeg]);

	return (
		<div
			className="mobile-radiology-container"
			data-testid="mobile-chairside-radiology-container"
		>
			{/* ═══════════════════════════════════════════════════════════════════
			    1. APPLE TOP BAR (Safe Area + Quick Switcher & Clinical Meta)
			    ═══════════════════════════════════════════════════════════════════ */}
			<header className="mobile-radiology-topbar" data-testid="mobile-radiology-topbar">
				{/* Left: Button to open Patient Studies Bottom Sheet */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic();
						setIsStudiesSheetOpen(true);
					}}
					className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer"
					data-testid="btn-open-mobile-studies-sheet"
					aria-label="Открыть список всех снимков пациента"
					title="Все снимки пациента"
				>
					<span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
					<span>Снимки</span>
					<span className="px-1.5 py-0.2 rounded-full bg-teal-500/25 text-teal-300 font-mono text-[10px] font-bold">
						{activeImagingStudies.length}
					</span>
				</button>

				{/* Center: Active Tooth / Region & Study Type / Date */}
				<div className="mobile-radiology-topbar-title truncate px-1">
					<div className="flex items-center justify-center gap-1.5">
						<span
							className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 truncate"
							title={toothBadge}
						>
							{toothBadge}
						</span>
					</div>
					<div className="text-[11px] text-slate-400 truncate mt-0.5">
						{studyDateStr} · {modalityTitle}
					</div>
				</div>

				{/* Right: Camera Shot & Reset Button */}
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={onCaptureCamera}
						className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-400 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
						data-testid="btn-mobile-camera-capture"
						aria-label="Сделать снимок с камеры смартфона"
						title="Снимок с камеры"
					>
						<Camera size={17} />
					</button>

					<button
						type="button"
						onClick={handleResetTransform}
						className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
						data-testid="btn-mobile-reset-transform"
						aria-label="Сбросить масштаб и положение"
						title="Сброс (1:1)"
					>
						<RefreshCw size={15} />
					</button>

					<button
						type="button"
						onClick={() => {
							if (onClose) {
								onClose();
							} else {
								window.location.hash = "visit";
							}
						}}
						className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/10 cursor-pointer"
						data-testid="btn-mobile-close-viewer"
						aria-label="Закрыть просмотрщик"
						title="Закрыть (к визиту)"
					>
						<X size={17} />
					</button>
				</div>
			</header>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. CHAIRSIDE VIEWPORT (DOMINANT BLACK CANVAS WITH TOUCH GESTURES)
			    ═══════════════════════════════════════════════════════════════════ */}
			<main
				ref={viewportRef}
				className="mobile-radiology-viewport"
				data-testid="mobile-radiology-viewport"
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
			>
				{/* Scale HUD Badge */}
				<div className="mobile-radiology-scale-badge" data-testid="mobile-scale-hud">
					{zoom.toFixed(1)}x {rotationDeg !== 0 ? `· ${rotationDeg}°` : ""}
				</div>

				{/* Ruler Caliper Banner when Ruler is active */}
				{isRulerActive && (
					<div className="mobile-radiology-ruler-banner" data-testid="mobile-ruler-banner">
						<Ruler size={13} className="text-white shrink-0" />
						<span>
							{savedRulerDistanceMm !== null
								? `Длина: ${savedRulerDistanceMm} мм`
								: "Проведите пальцем для замера (мм)"}
						</span>
						{savedRulerDistanceMm !== null && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									setSavedRulerDistanceMm(null);
									setRulerStart(null);
									setRulerCurrent(null);
								}}
								className="ml-1 p-0.5 rounded text-white/80 hover:text-white"
								title="Сбросить замер"
							>
								<X size={12} />
							</button>
						)}
					</div>
				)}

				{/* Active Image or RVG Vector Fallback */}
				<div
					className="mobile-radiology-canvas-wrap"
					style={{
						transform: computedTransform,
						transition: touchStartRef.current.dist > 0 ? "none" : "transform 0.15s ease-out",
					}}
				>
					{effectivePreviewUrl && !previewLoadError ? (
						<img
							src={effectivePreviewUrl}
							alt={selectedImagingStudy?.title || "Рентген-снимок"}
							className="mobile-radiology-img"
							style={{ filter: computedFilter }}
							data-testid="mobile-active-xray-image"
						/>
					) : (
						<div
							className="w-72 h-80 rounded-2xl border-2 border-dashed border-teal-500/30 bg-slate-900/80 p-5 flex flex-col items-center justify-center text-center gap-3 select-none"
							data-testid="mobile-rvg-vector-placeholder"
						>
							<div className="w-14 h-14 rounded-2xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400">
								<UploadCloud size={28} />
							</div>
							<div className="text-sm font-bold text-white">
								{selectedImagingStudy?.title || "Интраоральный RVG снимок"}
							</div>
							<div className="text-xs text-slate-400">
								{selectedStudyHasFile
									? "Снимок готов к просмотру"
									: "Файл визиографа не прикреплен к карточке"}
							</div>
							<button
								type="button"
								onClick={onPickFiles}
								className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
								data-testid="btn-mobile-attach-xray"
							>
								<UploadCloud size={14} />
								<span>Загрузить снимок</span>
							</button>
						</div>
					)}

					{/* Caliper Measurement Overlay Line */}
					{isRulerActive && rulerStart && rulerCurrent && (
						<svg
							className="absolute inset-0 w-full h-full pointer-events-none"
							style={{ overflow: "visible" }}
						>
							<line
								x1={rulerStart.x}
								y1={rulerStart.y}
								x2={rulerCurrent.x}
								y2={rulerCurrent.y}
								stroke="#10b981"
								strokeWidth="2.5"
								strokeDasharray="4 2"
							/>
							<circle cx={rulerStart.x} cy={rulerStart.y} r="4" fill="#10b981" />
							<circle cx={rulerCurrent.x} cy={rulerCurrent.y} r="4" fill="#10b981" />
						</svg>
					)}
				</div>

				{/* AI Loading indicator */}
				{isAnalyzingAI && (
					<div
						className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center text-center p-4 z-40"
						data-testid="mobile-ai-analyzing-modal"
					>
						<div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 animate-spin mb-3">
							<RefreshCw size={24} />
						</div>
						<div className="text-sm font-bold text-white mb-1">
							ShadowAnalyst ИИ анализирует снимок...
						</div>
						<div className="text-xs text-slate-400">
							Выявление кариеса дентина, периапикальных очагов и резорбции
						</div>
					</div>
				)}
			</main>

			{/* ═══════════════════════════════════════════════════════════════════
			    3. FLOATING THUMB ACTION BAR (NATURAL THUMB ZONE >=44px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<nav
				className="mobile-radiology-thumb-bar"
				data-testid="mobile-radiology-thumb-bar"
				role="toolbar"
				aria-label="Инструменты управления снимком"
			>
				{/* 1. Invert (Negative / Positive) */}
				<button
					type="button"
					onClick={handleToggleInvert}
					className={`mobile-radiology-thumb-btn ${inverted ? "active" : ""}`}
					data-testid="btn-mobile-thumb-invert"
					aria-label="Инвертировать рентген (Негатив/Позитив)"
					title="Инверсия (Негатив)"
				>
					<Contrast size={19} />
					<span>Негатив</span>
				</button>

				{/* 2. Contrast presets & popup */}
				<button
					type="button"
					onClick={handleCycleContrast}
					onContextMenu={(e) => {
						e.preventDefault();
						setIsFilterPopoverOpen((prev) => !prev);
					}}
					className={`mobile-radiology-thumb-btn ${contrast > 1.0 || enhancementClahe ? "active" : ""}`}
					data-testid="btn-mobile-thumb-contrast"
					aria-label="Усиление контраста деталей"
					title="Контраст"
				>
					<Sparkles size={19} />
					<span>{contrast > 1.0 ? `${Math.round(contrast * 100)}%` : "Контраст"}</span>
				</button>

				{/* 3. Measurement Caliper (Ruler) */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic();
						setIsRulerActive((prev) => !prev);
					}}
					className={`mobile-radiology-thumb-btn ${isRulerActive ? "active" : ""}`}
					data-testid="btn-mobile-thumb-ruler"
					aria-label="Калиброванная линейка (измерение в мм)"
					title="Линейка"
				>
					<Ruler size={19} />
					<span>Линейка</span>
				</button>

				{/* 4. Zoom cycle (1.0x -> 1.5x -> 2.0x -> 2.5x) */}
				<button
					type="button"
					onClick={handleCycleZoom}
					className={`mobile-radiology-thumb-btn ${zoom > 1.0 ? "active" : ""}`}
					data-testid="btn-mobile-thumb-zoom"
					aria-label="Увеличить снимок"
					title="Зум"
				>
					<ZoomIn size={19} />
					<span>{zoom > 1.0 ? `${zoom.toFixed(1)}x` : "Зум"}</span>
				</button>

				{/* 5. Rotate 90° CW */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic();
						setRotationDeg((prev) => (prev + 90) % 360);
					}}
					className={`mobile-radiology-thumb-btn ${rotationDeg !== 0 ? "active" : ""}`}
					data-testid="btn-mobile-thumb-rotate"
					aria-label="Повернуть снимок на 90 градусов"
					title="Поворот"
				>
					<RotateCw size={19} />
					<span>{rotationDeg !== 0 ? `${rotationDeg}°` : "Поворот"}</span>
				</button>

				{/* 6. Settings popover (Sliders for brightness & contrast) */}
				<button
					type="button"
					onClick={() => {
						triggerHaptic();
						setIsFilterPopoverOpen((prev) => !prev);
					}}
					className={`mobile-radiology-thumb-btn ${isFilterPopoverOpen ? "active" : ""}`}
					data-testid="btn-mobile-thumb-sliders"
					aria-label="Тонкая настройка яркости и контраста"
					title="Фильтры"
				>
					<Sliders size={19} />
					<span>Фильтр</span>
				</button>
			</nav>

			{/* ═══════════════════════════════════════════════════════════════════
			    4. CONTRAST & BRIGHTNESS POPOVER
			    ═══════════════════════════════════════════════════════════════════ */}
			{isFilterPopoverOpen && (
				<div
					className="mobile-radiology-slider-popover"
					data-testid="mobile-contrast-popover"
				>
					<div className="flex items-center justify-between pb-1 border-b border-white/10">
						<span className="text-xs font-bold text-white flex items-center gap-1.5">
							<Sliders size={14} className="text-teal-400" />
							<span>Тонкая настройка видимости</span>
						</span>
						<button
							type="button"
							onClick={() => setIsFilterPopoverOpen(false)}
							className="text-slate-400 hover:text-white p-1"
							aria-label="Закрыть настройки"
						>
							<X size={15} />
						</button>
					</div>

					<div className="space-y-3 pt-1">
						<label className="flex flex-col gap-1 text-xs text-slate-300">
							<div className="flex justify-between font-semibold">
								<span>Яркость:</span>
								<span className="text-teal-400 font-mono">{Math.round(brightness * 100)}%</span>
							</div>
							<input
								type="range"
								min="0.6"
								max="1.5"
								step="0.05"
								value={brightness}
								onChange={(e) => setBrightness(Number(e.target.value))}
								className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
							/>
						</label>

						<label className="flex flex-col gap-1 text-xs text-slate-300">
							<div className="flex justify-between font-semibold">
								<span>Контраст:</span>
								<span className="text-teal-400 font-mono">{Math.round(contrast * 100)}%</span>
							</div>
							<input
								type="range"
								min="0.7"
								max="2.0"
								step="0.05"
								value={contrast}
								onChange={(e) => setContrast(Number(e.target.value))}
								className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
							/>
						</label>

						<div className="flex items-center justify-between pt-1">
							<button
								type="button"
								onClick={() => {
									setBrightness(1.0);
									setContrast(1.0);
									setEnhancementClahe(false);
								}}
								className="text-xs font-semibold text-slate-400 hover:text-white underline cursor-pointer"
							>
								Сброс фильтров
							</button>

							<button
								type="button"
								onClick={() => setEnhancementClahe((prev) => !prev)}
								className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
									enhancementClahe ? "bg-teal-600 text-white" : "bg-white/10 text-slate-200"
								}`}
							>
								CLAHE четкость
							</button>
						</div>
					</div>
				</div>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    5. NATIVE BOTTOM SHEET (PATIENT STUDIES DRAWER)
			    ═══════════════════════════════════════════════════════════════════ */}
			{isStudiesSheetOpen && (
				<div
					className="mobile-radiology-drawer-overlay"
					data-testid="mobile-studies-drawer-overlay"
					onClick={() => setIsStudiesSheetOpen(false)}
				>
					<div
						className="mobile-radiology-drawer"
						data-testid="mobile-studies-drawer"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Tactile Drag Handle */}
						<div className="mobile-radiology-drag-handle" />

						{/* Header */}
						<div className="mobile-radiology-drawer-header">
							<div>
								<h3 className="text-base font-bold text-[var(--ink)]">
									Снимки пациента ({activeImagingStudies.length})
								</h3>
								<p className="text-xs text-[var(--muted)] truncate max-w-[260px]">
									{activePatient?.fullName || activePatient?.name || "Пациент не выбран"}
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsStudiesSheetOpen(false)}
								className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] active:scale-95 transition-transform"
								aria-label="Закрыть шторку"
							>
								<X size={18} />
							</button>
						</div>

						{/* Modality Filter Chips (Horizontal Segments) */}
						<div className="px-4 py-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b border-[var(--line-subtle)]">
							<button
								type="button"
								onClick={() => setStudiesSheetFilter("all")}
								className={`mobile-radiology-filter-chip ${studiesSheetFilter === "all" ? "active" : ""}`}
							>
								Все ({activeImagingStudies.length})
							</button>
							<button
								type="button"
								onClick={() => setStudiesSheetFilter("periapical")}
								className={`mobile-radiology-filter-chip ${studiesSheetFilter === "periapical" ? "active" : ""}`}
							>
								Прицельные
							</button>
							<button
								type="button"
								onClick={() => setStudiesSheetFilter("opg")}
								className={`mobile-radiology-filter-chip ${studiesSheetFilter === "opg" ? "active" : ""}`}
							>
								ОПТГ
							</button>
							<button
								type="button"
								onClick={() => setStudiesSheetFilter("cbct")}
								className={`mobile-radiology-filter-chip ${studiesSheetFilter === "cbct" ? "active" : ""}`}
							>
								КТ 3D
							</button>
						</div>

						{/* Studies Grouped List Cards */}
						<div className="mobile-radiology-drawer-body">
							{filteredStudies.length === 0 ? (
								<div className="py-12 text-center text-slate-400 text-xs">
									Снимков в этой категории нет
								</div>
							) : (
								filteredStudies.map((study) => {
									const isSelected = selectedImagingStudy?.id === study.id;
									const sTooth = study.toothCode;
									const sRegion = study.region;
									const sBadge = sTooth ? `Зуб #${sTooth}` : sRegion || null;

									return (
										<div
											key={study.id}
											onClick={() => {
												triggerHaptic();
												onSelectStudy(study.id);
												setIsStudiesSheetOpen(false);
											}}
											className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
												isSelected
													? "bg-teal-500/15 border-teal-500 shadow-sm"
													: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/40"
											}`}
											data-testid={`mobile-study-item-${study.id}`}
										>
											<div className="flex items-center gap-3 min-w-0 flex-1">
												{/* Study Thumbnail */}
												<div className="w-12 h-12 rounded-xl bg-slate-900 border border-[var(--line)] overflow-hidden shrink-0 flex items-center justify-center">
													{study.previewUrl ? (
														<img
															src={study.previewUrl}
															alt=""
															className="w-full h-full object-cover"
														/>
													) : (
														<span className="text-[10px] font-bold text-teal-400 uppercase">
															{study.kind.slice(0, 3)}
														</span>
													)}
												</div>

												{/* Study Details */}
												<div className="min-w-0 flex-1">
													<div className="flex items-center gap-2">
														<strong className="text-xs font-bold text-[var(--ink)] truncate">
															{study.title || "Исследование"}
														</strong>
														{sBadge && (
															<span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-teal-500/20 text-teal-300 shrink-0">
																{sBadge}
															</span>
														)}
													</div>
													<div className="text-[11px] text-[var(--muted)] truncate mt-0.5">
														{formatShortDate(study.capturedAt)} ·{" "}
														{imagingKindLabels[study.kind] || study.kind}
													</div>
												</div>
											</div>

											{/* Trailing Selection Indicator */}
											<div className="shrink-0 pl-2">
												{isSelected ? (
													<span className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-xs">
														<Check size={14} />
													</span>
												) : (
													<ChevronRight size={18} className="text-[var(--muted)]" />
												)}
											</div>
										</div>
									);
								})
							)}
						</div>

						{/* Footer Actions */}
						<div className="mobile-radiology-drawer-footer">
							<button
								type="button"
								onClick={() => {
									setIsStudiesSheetOpen(false);
									onCaptureCamera();
								}}
								className="flex-1 min-h-[46px] rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
								data-testid="btn-mobile-sheet-camera"
							>
								<Camera size={16} className="text-teal-400" />
								<span>Камера</span>
							</button>

							<button
								type="button"
								onClick={() => {
									setIsStudiesSheetOpen(false);
									onPickFiles();
								}}
								className="mobile-radiology-btn-primary flex-1 min-h-[46px] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
								data-testid="btn-mobile-sheet-upload"
							>
								<UploadCloud size={16} />
								<span>Загрузить</span>
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};
