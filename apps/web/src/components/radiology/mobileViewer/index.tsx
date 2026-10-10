import React, { useCallback, useMemo, useRef, useState } from "react";
import {
	Camera,
	FileText,
	RefreshCw,
	X,
} from "lucide-react";
import { formatShortDate } from "../../../AppHelpers.js";
import { showToast } from "../../GlobalToast.js";
import "../mobileRadiology.css";

import type {
	MobileChairsideRadiologyViewerProps,
	TouchGestureState,
} from "./types.js";
import { MobileGestureViewport } from "./MobileGestureViewport.js";
import { MobileRadiologyFilterToolbar } from "./MobileRadiologyFilterToolbar.js";
import { MobileStudiesDrawer } from "./MobileStudiesDrawer.js";
import { MobilePatientShowcaseOverlay } from "./MobilePatientShowcaseOverlay.js";

export * from "./types.js";
export * from "./MobileGestureViewport.js";
export * from "./MobileRadiologyFilterToolbar.js";
export * from "./MobileStudiesDrawer.js";
export * from "./MobilePatientShowcaseOverlay.js";

/**
 * MobileChairsideRadiologyViewer: Master coordinator component for chairside
 * tablet / smartphone radiology viewing. Implements Apple HIG touch ergonomics,
 * natural thumb zone controls, calibrated calipers, CLAHE enhancement, and
 * 1-click patient demonstration with Form 043/u clinical protocol linking.
 */
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
	const [isShowcaseOpen, setIsShowcaseOpen] = useState<boolean>(false);
	const [isProtocol043Attached, setIsProtocol043Attached] = useState<boolean>(false);

	// Container refs
	const viewportRef = useRef<HTMLDivElement | null>(null);
	const touchStartRef = useRef<TouchGestureState>({
		x: 0,
		y: 0,
		panX: 0,
		panY: 0,
		dist: 0,
		initialZoom: 1.0,
		lastTapTime: 0,
	});

	// Pixel spacing for clinical caliper (0.04 mm/px for RVG, 0.1 mm/px for OPG, 0.125 mm/px for CBCT)
	const pixelSpacingMm = useMemo(() => {
		const kind = selectedImagingStudy?.kind;
		if (kind === "periapical" || kind === "bitewing") return 0.04;
		if (kind === "opg") return 0.1;
		if (kind === "cbct") return 0.125;
		return 0.04;
	}, [selectedImagingStudy?.kind]);

	// Format study metadata with compact Russian labels for 390px viewport
	const toothCode = selectedImagingStudy?.toothCode;
	const region = selectedImagingStudy?.region;
	const regionBadgeMap: Record<string, string> = {
		maxilla_mandible: "Обе чел.",
		maxilla: "В/Ч",
		mandible: "Н/Ч",
		anterior: "Фронт",
		posterior: "Жев.",
		tmj: "ВНЧС",
		sinus: "Пазухи",
	};
	const kindShortMap: Record<string, string> = {
		periapical: "RVG",
		bitewing: "Прикус",
		opg: "ОПТГ",
		ceph: "ТРГ",
		cbct: "КТ 3D",
		photo: "Фото",
	};
	const toothBadge = toothCode
		? `#${toothCode}`
		: region
			? regionBadgeMap[region] ?? region
			: "RVG";
	const modalityTitle = selectedImagingStudy
		? imagingKindLabels?.[selectedImagingStudy.kind] ||
			kindShortMap[selectedImagingStudy.kind] ||
			selectedImagingStudy.kind
		: "Рентгенодиагностика";
	const studyDateStr = selectedImagingStudy?.capturedAt
		? formatShortDate(selectedImagingStudy.capturedAt)
		: "Сегодня";

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

	// Potential comparison study for Showcase mode (e.g. earlier study of the same tooth/region)
	const comparisonStudy = useMemo(() => {
		if (!selectedImagingStudy) return null;
		return (
			activeImagingStudies.find(
				(s) =>
					s.id !== selectedImagingStudy.id &&
					((selectedImagingStudy.toothCode && s.toothCode === selectedImagingStudy.toothCode) ||
						(selectedImagingStudy.region && s.region === selectedImagingStudy.region))
			) ||
			activeImagingStudies.find((s) => s.id !== selectedImagingStudy.id) ||
			null
		);
	}, [selectedImagingStudy, activeImagingStudies]);

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
					className="h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-xs font-semibold text-white flex items-center gap-1.5 transition-all border border-white/10 cursor-pointer shrink-0"
					data-testid="btn-open-mobile-studies-sheet"
					aria-label="Открыть список всех снимков пациента"
					title="Все снимки пациента"
				>
					<span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
					<span>Снимки</span>
					<span className="px-1.5 py-0.2 rounded-full bg-teal-500/25 text-teal-300 font-mono text-[10px] font-bold shrink-0">
						{activeImagingStudies.length}
					</span>
				</button>

				{/* Center: Active Tooth / Region & Study Type / Date & Showcase Trigger */}
				<div className="mobile-radiology-topbar-title min-w-0 flex-1 px-1">
					<div className="flex items-center justify-center gap-1.5 flex-nowrap">
						<span
							className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-teal-500/20 text-teal-300 border border-teal-500/30 shrink-0"
							title={toothBadge}
						>
							{toothBadge}
						</span>
						<button
							type="button"
							onClick={() => {
								triggerHaptic();
								setIsShowcaseOpen(true);
							}}
							className="mobile-radiology-showcase-btn rounded-full font-bold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 transition-all cursor-pointer flex items-center gap-1 shrink-0 whitespace-nowrap"
							title="Режим демонстрации пациенту (До/После и 043/у)"
						>
							<FileText size={10} className="text-teal-400 shrink-0" />
							<span>Пациенту</span>
						</button>
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
						className="mobile-radiology-icon-btn rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-teal-400 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
						data-testid="btn-mobile-camera-capture"
						aria-label="Сделать снимок с камеры смартфона"
						title="Снимок с камеры"
					>
						<Camera size={16} />
					</button>

					<button
						type="button"
						onClick={handleResetTransform}
						className="mobile-radiology-icon-btn rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 flex items-center justify-center transition-all border border-white/10 cursor-pointer"
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
						className="mobile-radiology-icon-btn rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all border border-white/10 cursor-pointer"
						data-testid="btn-mobile-close-viewer"
						aria-label="Закрыть просмотрщик"
						title="Закрыть (к визиту)"
					>
						<X size={16} />
					</button>
				</div>
			</header>

			{/* ═══════════════════════════════════════════════════════════════════
			    2. CHAIRSIDE VIEWPORT (DOMINANT BLACK CANVAS WITH TOUCH GESTURES)
			    ═══════════════════════════════════════════════════════════════════ */}
			<MobileGestureViewport
				selectedImagingStudy={selectedImagingStudy}
				effectivePreviewUrl={effectivePreviewUrl}
				previewLoadError={previewLoadError}
				selectedStudyHasFile={selectedStudyHasFile}
				zoom={zoom}
				pan={pan}
				rotationDeg={rotationDeg}
				computedFilter={computedFilter}
				computedTransform={computedTransform}
				isRulerActive={isRulerActive}
				rulerStart={rulerStart}
				rulerCurrent={rulerCurrent}
				savedRulerDistanceMm={savedRulerDistanceMm}
				pixelSpacingMm={pixelSpacingMm}
				isAnalyzingAI={isAnalyzingAI}
				viewportRef={viewportRef}
				touchStartRef={touchStartRef}
				setZoom={setZoom}
				setPan={setPan}
				setRulerStart={setRulerStart}
				setRulerCurrent={setRulerCurrent}
				setSavedRulerDistanceMm={setSavedRulerDistanceMm}
				triggerHaptic={triggerHaptic}
				onPickFiles={onPickFiles}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    2.5. HORIZONTAL PREVIEW CAROUSEL (>=56x56px, Apple HIG Thumb Zone)
			    ═══════════════════════════════════════════════════════════════════ */}
			{activeImagingStudies.length > 0 && (
				<aside
					className="mobile-radiology-preview-carousel"
					data-testid="mobile-radiology-preview-carousel"
					aria-label="Лента снимков пациента"
				>
					{activeImagingStudies.map((study) => {
						const isSelected = selectedImagingStudy?.id === study.id;
						const toothLabel = study.toothCode
							? `#${study.toothCode}`
							: study.region
								? (regionBadgeMap[study.region] ?? study.region)
								: (kindShortMap[study.kind] ?? "RVG");
						const thumbCode = study.toothCode
							? `#${study.toothCode}`
							: (kindShortMap[study.kind] ?? "RVG");
						return (
							<button
								key={study.id}
								type="button"
								onClick={() => {
									triggerHaptic();
									onSelectStudy(study.id);
								}}
								className={`mobile-radiology-carousel-item ${isSelected ? "active" : ""}`}
								data-testid={`mobile-carousel-study-${study.id}`}
								aria-label={`Снимок ${study.title || toothLabel}`}
								aria-current={isSelected ? "true" : undefined}
							>
								<div className="mobile-radiology-carousel-thumb">
									<span className="text-[11px] font-bold text-teal-400 font-mono select-none">
										{thumbCode}
									</span>
									{study.previewUrl && (
										<img
											src={study.previewUrl}
											alt=""
											className="absolute inset-0 w-full h-full object-cover"
											onError={(e) => {
												(e.target as HTMLElement).style.display = "none";
											}}
										/>
									)}
									<span className="mobile-radiology-carousel-badge">
										{toothLabel}
									</span>
								</div>
							</button>
						);
					})}
				</aside>
			)}

			{/* ═══════════════════════════════════════════════════════════════════
			    3. FLOATING THUMB ACTION BAR & FILTER CONTROLS (>=44px)
			    ═══════════════════════════════════════════════════════════════════ */}
			<MobileRadiologyFilterToolbar
				inverted={inverted}
				contrast={contrast}
				brightness={brightness}
				enhancementClahe={enhancementClahe}
				zoom={zoom}
				rotationDeg={rotationDeg}
				isRulerActive={isRulerActive}
				isFilterPopoverOpen={isFilterPopoverOpen}
				onToggleInvert={handleToggleInvert}
				onCycleContrast={handleCycleContrast}
				onToggleRuler={() => {
					triggerHaptic();
					setIsRulerActive((prev) => !prev);
				}}
				onCycleZoom={handleCycleZoom}
				onRotate={() => {
					triggerHaptic();
					setRotationDeg((prev) => (prev + 90) % 360);
				}}
				onToggleFilterPopover={() => {
					triggerHaptic();
					setIsFilterPopoverOpen((prev) => !prev);
				}}
				onChangeBrightness={(val) => setBrightness(val)}
				onChangeContrast={(val) => setContrast(val)}
				onToggleClahe={() => setEnhancementClahe((prev) => !prev)}
				onResetFilters={() => {
					setBrightness(1.0);
					setContrast(1.0);
					setEnhancementClahe(false);
				}}
				onCloseFilterPopover={() => setIsFilterPopoverOpen(false)}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    4. NATIVE BOTTOM SHEET (PATIENT STUDIES DRAWER)
			    ═══════════════════════════════════════════════════════════════════ */}
			<MobileStudiesDrawer
				isOpen={isStudiesSheetOpen}
				onClose={() => setIsStudiesSheetOpen(false)}
				studies={activeImagingStudies}
				selectedStudyId={selectedImagingStudy?.id}
				activePatient={activePatient}
				imagingKindLabels={imagingKindLabels}
				onSelectStudy={onSelectStudy}
				onCaptureCamera={onCaptureCamera}
				onPickFiles={onPickFiles}
				triggerHaptic={triggerHaptic}
			/>

			{/* ═══════════════════════════════════════════════════════════════════
			    5. PATIENT SHOWCASE OVERLAY (1-CLICK BEFORE/AFTER & 043/U LINK)
			    ═══════════════════════════════════════════════════════════════════ */}
			<MobilePatientShowcaseOverlay
				isOpen={isShowcaseOpen}
				onClose={() => setIsShowcaseOpen(false)}
				selectedStudy={selectedImagingStudy}
				activePatient={activePatient}
				effectivePreviewUrl={effectivePreviewUrl}
				computedFilter={computedFilter}
				modalityTitle={modalityTitle}
				toothBadge={toothBadge}
				studyDateStr={studyDateStr}
				comparisonStudy={comparisonStudy}
				allStudies={activeImagingStudies}
				isProtocol043Attached={isProtocol043Attached}
				onToggleProtocol043Attach={() => setIsProtocol043Attached((prev) => !prev)}
				triggerHaptic={triggerHaptic}
			/>
		</div>
	);
};
