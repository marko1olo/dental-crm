import type React from "react";
import { useCallback, useEffect, memo, useRef, useState, useMemo } from "react";
import { X } from "lucide-react";
import { globalDentalVoiceEngine } from "../../services/voice";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import { loadStoredTeethData } from "./odontogramStorage";
import { getToothConfig } from "../../utils/math/toothGeometry";
import { ToothRadialMenu } from "./ToothRadialMenu";

// ============================================================================
// ZERO-DOWNTIME CANONICAL RE-EXPORTS (MANDATES 8e, 8k, 8n)
// ============================================================================
export * from "./chart/toothChartTypes";
export * from "./chart/ToothColors";
export * from "./chart/DenteToothSvgDefs";
export * from "./chart/SurfaceSelector";
export * from "./chart/ToothCardHud";
export * from "./chart/ToothImplantGraphic";
export * from "./chart/ToothStandardGraphic";
export * from "./chart/ToothSvg";
export * from "./chart/ToothChartToolbar";
export * from "./chart/ToothArchGrid";
export * from "./MobileQuadrantTabs";

import {
	type ToothChartProps,
	type ToothState,
	type ToothData,
	type DentitionMode,
	type OdontogramQuadrantId,
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	MIN_ARCH_SCALE,
	splitArchAtMidline,
	isQuadrantTop,
	getQuadrantTeeth,
	getQuadrantForTooth,
	getAdjacentQuadrant,
	getNextFocusedTooth,
	getToothStateFromHotkey,
	areToothChartPropsEqual,
	applyFastCariesK021Protocol,
	applyFastProHygieneProtocol,
} from "./chart/toothChartTypes";
import { DenteToothSvgDefs } from "./chart/DenteToothSvgDefs";
import { SurfaceSelector } from "./chart/SurfaceSelector";
import { ToothChartToolbar } from "./chart/ToothChartToolbar";
import { ToothArchGrid } from "./chart/ToothArchGrid";

/**
 * 1-Click Fast Actions & Autonomy Verification (Mandates 8e, 8k):
 * - "tooth-chart-mark-intact-btn": Интактный зубной ряд (Санирован)
 * - "tooth-chart-mark-wisdom-missing-btn": Адентия 8-ок (Без 8-ок)
 * - "tooth-chart-mark-pro-hygiene-btn": Профгигиена (A16.07.051)
 * - "tooth-chart-apply-fast-caries-btn": Быстрая пломба K02.1
 * - onMarkProHygieneDone: Callback for Form 043/u & Invoice integration
 * - onApplyFastCariesK021: Callback for rapid therapeutic protocol
 * - MIN_ARCH_SCALE = 0.35 baseline for 375px mobile viewport fit
 */

export const ToothChart: React.FC<ToothChartProps> = memo(({
	teethData = [],
	patientId,
	pediatricMode,
	mixedDentition,
	dentitionMode,
	onDentitionModeChange,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	activeQuadrant: controlledQuadrant,
	onQuadrantChange,
	selectedTeeth = [],
	activeStamp,
	useSurfaces = false,
	showPulpAndCanals = false,
	showPeriapicalHalos = false,
	showPeriodontalBoneLoss = false,
	onToothClick,
	onToothContextMenu,
	onQuickStateChange,
	onResorptionChange,
	onSurfacesChange,
	onMarkIntactDentition: externalMarkIntact,
	onMarkProHygieneDone,
	onApplyFastCariesK021,
	className = "",
	hideExpressActions = false,
	hideQuadrantSwitcher = false,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);
	const [archScale, setArchScale] = useState(1);
	const appliedArchScaleRef = useRef(1);

	const resolvedTeethData = useMemo(() => {
		if (teethData && teethData.length > 0) return teethData;
		if (patientId) {
			const cached = loadStoredTeethData(patientId);
			if (cached && cached.length > 0) return cached;
		}
		return [];
	}, [teethData, patientId]);

	const toothDataMap = useMemo(() => {
		const map = new Map<number, ToothData>();
		for (const t of resolvedTeethData) {
			map.set(t.toothNumber, t);
		}
		return map;
	}, [resolvedTeethData]);

	const [localDentitionMode, setLocalDentitionMode] = useState<DentitionMode>(
		dentitionMode ?? (pediatricMode ? "pediatric" : mixedDentition ? "mixed" : "adult")
	);

	const effectiveDentitionMode = dentitionMode ?? localDentitionMode;
	const isPediatricEffective = effectiveDentitionMode === "pediatric";
	const isMixedEffective = effectiveDentitionMode === "mixed";

	const [localQuadrant, setLocalQuadrant] = useState<OdontogramQuadrantId>(() => {
		if (controlledQuadrant !== undefined) return controlledQuadrant;
		if (typeof window !== "undefined" && window.innerWidth <= 768) {
			return isPediatricEffective ? "Q5" : "Q1";
		}
		return "all";
	});
	const currentQuadrant = controlledQuadrant ?? localQuadrant;

	const [mobileDisplayMode, setMobileDisplayMode] = useState<"quadrant" | "carousel">("quadrant");
	const [carouselTooth, setCarouselTooth] = useState<number>(() => {
		return selectedTeeth.length > 0 ? selectedTeeth[0]! : (isPediatricEffective ? 55 : 16);
	});

	const handleSelectQuadrant = (q: OdontogramQuadrantId) => {
		setLocalQuadrant(q);
		if (onQuadrantChange) onQuadrantChange(q);
	};

	useEffect(() => {
		const handleViewportResize = () => {
			if (typeof window !== "undefined" && window.innerWidth <= 768 && controlledQuadrant === undefined) {
				setLocalQuadrant((prev) => (prev === "all" ? (isPediatricEffective ? "Q5" : "Q1") : prev));
			}
		};
		window.addEventListener("resize", handleViewportResize);
		return () => window.removeEventListener("resize", handleViewportResize);
	}, [isPediatricEffective, controlledQuadrant]);

	// 1-Click Fast Actions (Mandate 8e / 8k)
	const handleMarkIntactDentition = () => {
		if (externalMarkIntact) {
			externalMarkIntact();
			return;
		}
		if (onQuickStateChange) {
			const allTargets = isMixedEffective
				? MIXED_TOP_TEETH.concat(MIXED_BOTTOM_TEETH)
				: isPediatricEffective
				? PEDIATRIC_TOP_TEETH.concat(PEDIATRIC_BOTTOM_TEETH)
				: TOP_TEETH.concat(BOTTOM_TEETH);
			onQuickStateChange(allTargets, "Healthy", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Вся зубная формула отмечена как санированная (интактная)", "success");
		}
	};

	const handleMarkWisdomTeethMissing = () => {
		if (onQuickStateChange) {
			const wisdomTeeth = [18, 28, 38, 48];
			onQuickStateChange(wisdomTeeth, "Missing", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Зубы мудрости (18, 28, 38, 48) отмечены как отсутствующие", "info");
		}
	};

	const handleMarkMolarsMissing = () => {
		if (onQuickStateChange) {
			const molars = [16, 26, 36, 46];
			onQuickStateChange(molars, "Missing", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Моляры (16, 26, 36, 46) отмечены как отсутствующие", "info");
		}
	};

	const handleMarkFrontIntact = () => {
		if (onQuickStateChange) {
			const frontTeeth = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];
			onQuickStateChange(frontTeeth, "Healthy", []);
			void SoundFeedbackService.getInstance().playActionSuccess();
			showToast("Фронтальная группа зубов отмечена как интактная", "success");
		}
	};

	const handleMarkProHygieneDone = () => {
		if (onQuickStateChange) {
			const allTargets = isMixedEffective
				? MIXED_TOP_TEETH.concat(MIXED_BOTTOM_TEETH)
				: isPediatricEffective
				? PEDIATRIC_TOP_TEETH.concat(PEDIATRIC_BOTTOM_TEETH)
				: TOP_TEETH.concat(BOTTOM_TEETH);
			onQuickStateChange(allTargets, "Healthy", []);
		}
		const protocol = applyFastProHygieneProtocol();
		if (onMarkProHygieneDone) {
			onMarkProHygieneDone(protocol);
		}
		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`1-клик Профгигиена: протокол ${protocol.diagnosis} и услуга ${protocol.serviceCode} (${protocol.serviceName}) добавлены`,
			"success",
		);
	};

	const handleApplyFastCariesK021 = () => {
		const targetTooth = selectedTeeth.length > 0 ? selectedTeeth[0]! : (isPediatricEffective ? 51 : 16);
		if (onQuickStateChange) {
			onQuickStateChange([targetTooth], "Caries", ["O"]);
		}
		const protocol = applyFastCariesK021Protocol(targetTooth);
		if (onApplyFastCariesK021) {
			onApplyFastCariesK021(protocol);
		}
		void SoundFeedbackService.getInstance().playActionSuccess();
		showToast(
			`1-клик Кариес зуба ${targetTooth}: протокол ${protocol.diagnosis} и пломба ${protocol.serviceCode} добавлены`,
			"success",
		);
	};

	// Voice dictation listener
	useEffect(() => {
		const unsub = globalDentalVoiceEngine.addListener({
			onIntentParsed: (intent) => {
				if (!intent.teethUpdates || intent.teethUpdates.length === 0) return;
				if (onQuickStateChange) {
					for (const upd of intent.teethUpdates) {
						if (upd.toothNumber && upd.state) {
							onQuickStateChange([upd.toothNumber], upd.state as ToothState, upd.surfaces);
						}
					}
					void SoundFeedbackService.getInstance().playActionSuccess();
					showToast(`Голосовой ввод: обновлено зубов: ${intent.teethUpdates.length}`, "success");
				}
			},
		});
		return () => unsub();
	}, [onQuickStateChange]);

	const defaultTopTeeth = isMixedEffective
		? MIXED_TOP_TEETH
		: isPediatricEffective
		? PEDIATRIC_TOP_TEETH
		: TOP_TEETH;
	const defaultBottomTeeth = isMixedEffective
		? MIXED_BOTTOM_TEETH
		: isPediatricEffective
		? PEDIATRIC_BOTTOM_TEETH
		: BOTTOM_TEETH;

	const topTeethList = Array.isArray(customTopTeeth) && customTopTeeth.length > 0 ? customTopTeeth : defaultTopTeeth;
	const bottomTeethList = Array.isArray(customBottomTeeth) && customBottomTeeth.length > 0 ? customBottomTeeth : defaultBottomTeeth;

	// Responsive dynamic scaling for mobile viewports
	useEffect(() => {
		const element = archContainerRef.current;
		if (!element) return;

		const recalculate = () => {
			const el = archContainerRef.current;
			if (!el) return;
			const available = Math.max(0, el.clientWidth - 24);
			const isQuadrantView = currentQuadrant !== "all";
			const activeTeeth = isQuadrantView
				? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective)
				: topTeethList;
			const baseNaturalWidth = (Array.isArray(activeTeeth) ? activeTeeth : []).reduce((acc, num) => {
				const cfg = getToothConfig(num);
				const w = Number.parseFloat(cfg.width) || 75;
				return acc + w;
			}, 0) || 1200;

			// Natural width at 1.0 scale: teeth widths + gaps & sagittal midline
			const naturalWidth = isQuadrantView ? baseNaturalWidth + 30 : baseNaturalWidth + 90;
			const calculated = naturalWidth > 0 ? (available - 16) / naturalWidth : 1;
			const minScale = isQuadrantView ? 0.75 : 0.35;
			const targetScale = Math.min(1.0, Math.max(minScale, calculated));

			if (Math.abs(appliedArchScaleRef.current - targetScale) > 0.02) {
				appliedArchScaleRef.current = targetScale;
				setArchScale(targetScale);
			}
		};

		recalculate();
		const observer = new ResizeObserver(recalculate);
		observer.observe(element);
		return () => observer.disconnect();
	}, [currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective]);

	// Global Keyboard Hotkey Handler
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.isContentEditable)
			) {
				return;
			}

			// Single-key status toggles
			const quickState = getToothStateFromHotkey(e.key);
			if (quickState && onQuickStateChange && selectedTeeth.length > 0) {
				e.preventDefault();
				onQuickStateChange(selectedTeeth, quickState, []);
				return;
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [selectedTeeth, onQuickStateChange]);

	const [localRadialData, setLocalRadialData] = useState<{
		toothNumber: number;
		anchorRect: { x: number; y: number; width: number; height: number };
		currentState?: ToothState;
	} | null>(null);

	const handleToothClick = useCallback(
		(e: React.MouseEvent, num: number, surface?: string) => {
			const isModifierPressed = Boolean(e?.shiftKey || e?.altKey);
			const effectiveSurface = (useSurfaces || isModifierPressed) ? surface : undefined;
			if (effectiveSurface && onSurfacesChange) {
				const current = toothDataMap.get(num)?.surfaces ?? [];
				const nextSurfaces = current.includes(effectiveSurface)
					? current.filter((s) => s !== effectiveSurface)
					: [...current, effectiveSurface];
				onSurfacesChange([num], nextSurfaces);
			}
			const el = (e?.currentTarget as HTMLElement) ?? (e?.target as HTMLElement);
			const rect =
				el && typeof el.getBoundingClientRect === "function"
					? el.getBoundingClientRect()
					: typeof DOMRect !== "undefined"
						? new DOMRect(0, 0, 0, 0)
						: ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect);

			if (onToothClick) {
				(onToothClick as any)(num, rect, effectiveSurface);
			} else if (!effectiveSurface) {
				setLocalRadialData({
					toothNumber: num,
					anchorRect: {
						x: rect?.left ?? 0,
						y: rect?.top ?? 0,
						width: rect?.width || 48,
						height: rect?.height || 90,
					},
					currentState: toothDataMap.get(num)?.state ?? "Healthy",
				});
			}
			setCarouselTooth(num);
		},
		[onToothClick, onSurfacesChange, toothDataMap, useSurfaces],
	);

	const topSplit = useMemo(() => splitArchAtMidline(topTeethList), [topTeethList]);
	const bottomSplit = useMemo(() => splitArchAtMidline(bottomTeethList), [bottomTeethList]);

	const isQuadrantView = currentQuadrant !== "all";
	const activeQuadrantTeeth = isQuadrantView
		? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective)
		: [];
	const isTopQuadrant = isQuadrantTop(currentQuadrant);

	return (
		<div className={`tooth-chart-container ${className}`.trim()} ref={containerRef}>
			<DenteToothSvgDefs />

			<ToothChartToolbar
				hideExpressActions={hideExpressActions}
				hideQuadrantSwitcher={hideQuadrantSwitcher}
				currentQuadrant={currentQuadrant}
				isPediatricEffective={isPediatricEffective}
				isMixedEffective={isMixedEffective}
				pediatricMode={pediatricMode}
				handleMarkIntactDentition={handleMarkIntactDentition}
				handleMarkProHygieneDone={handleMarkProHygieneDone}
				handleApplyFastCariesK021={handleApplyFastCariesK021}
				handleMarkWisdomTeethMissing={handleMarkWisdomTeethMissing}
				handleMarkMolarsMissing={handleMarkMolarsMissing}
				handleMarkFrontIntact={handleMarkFrontIntact}
				handleSelectQuadrant={handleSelectQuadrant}
				mobileDisplayMode={mobileDisplayMode}
				onToggleMobileDisplayMode={setMobileDisplayMode}
			/>

			<ToothArchGrid
				archContainerRef={archContainerRef}
				isQuadrantView={isQuadrantView}
				currentQuadrant={currentQuadrant}
				pediatricMode={pediatricMode}
				isPediatricEffective={isPediatricEffective}
				handleSelectQuadrant={handleSelectQuadrant}
				isTopQuadrant={isTopQuadrant}
				activeQuadrantTeeth={activeQuadrantTeeth}
				toothDataMap={toothDataMap}
				archScale={archScale}
				topSplit={topSplit}
				bottomSplit={bottomSplit}
				useSurfaces={useSurfaces}
				showPulpAndCanals={showPulpAndCanals}
				showPeriapicalHalos={showPeriapicalHalos}
				showPeriodontalBoneLoss={showPeriodontalBoneLoss}
				selectedTeeth={selectedTeeth}
				activeStamp={activeStamp}
				handleToothClick={handleToothClick}
				onQuickStateChange={onQuickStateChange}
				onResorptionChange={onResorptionChange}
				mobileDisplayMode={mobileDisplayMode}
				carouselTooth={carouselTooth}
				onSelectCarouselTooth={(num) => {
					setCarouselTooth(num);
				}}
				onOpenStatusSheet={(num, rect) => {
					setLocalRadialData({
						toothNumber: num,
						anchorRect: {
							x: rect?.left ?? (typeof window !== "undefined" ? window.innerWidth / 2 : 195),
							y: rect?.top ?? (typeof window !== "undefined" ? window.innerHeight / 2 : 400),
							width: rect?.width || 120,
							height: rect?.height || 140,
						},
						currentState: toothDataMap.get(num)?.state ?? "Healthy",
					});
				}}
				onSurfacesChange={onSurfacesChange}
			/>

			{localRadialData && (
				<ToothRadialMenu
					toothNumber={localRadialData.toothNumber}
					anchorRect={localRadialData.anchorRect}
					currentState={localRadialData.currentState}
					surfaces={toothDataMap.get(localRadialData.toothNumber)?.surfaces}
					onSelectState={(state, surfs) => {
						onQuickStateChange?.([localRadialData.toothNumber], state, surfs);
						setLocalRadialData(null);
					}}
					onSelectSurfaces={(surfs) => {
						onSurfacesChange?.([localRadialData.toothNumber], surfs);
					}}
					onClose={() => setLocalRadialData(null)}
				/>
			)}
		</div>
	);
}, areToothChartPropsEqual);
ToothChart.displayName = "ToothChart";

export default ToothChart;
