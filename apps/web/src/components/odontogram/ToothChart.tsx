export type ToothState =
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Missing"
	| "Crown"
	| "Implant"
	| "Filled"
	| "Healthy"
	| "Planned_Implant"
	| "Retained"
	| "Root";

import type React from "react";
import { useCallback, useEffect, memo, useRef, useState, useMemo } from "react";
import { globalDentalVoiceEngine } from "../../services/voice";
import { SoundFeedbackService } from "../../services/audio/SoundFeedbackService";
import { showToast } from "../GlobalToast";
import { loadStoredTeethData } from "./odontogramStorage";
import { getToothConfig } from "../../utils/math/toothGeometry";

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

import {
		type ToothChartProps,
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
	useSurfaces = true,
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
		if (teethData.length > 0) return teethData;
		if (patientId) {
			const cached = loadStoredTeethData(patientId);
			if (cached.length > 0) return cached;
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

	const [localQuadrant, setLocalQuadrant] = useState<OdontogramQuadrantId>("all");
	const currentQuadrant = controlledQuadrant ?? localQuadrant;

	const handleSelectQuadrant = (q: OdontogramQuadrantId) => {
		setLocalQuadrant(q);
		if (onQuadrantChange) onQuadrantChange(q);
	};

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
			SoundFeedbackService.playSuccess();
			showToast("Вся зубная формула отмечена как санированная (интактная)", "success");
		}
	};

	const handleMarkWisdomTeethMissing = () => {
		if (onQuickStateChange) {
			const wisdomTeeth = [18, 28, 38, 48];
			onQuickStateChange(wisdomTeeth, "Missing", []);
			SoundFeedbackService.playSuccess();
			showToast("Зубы мудрости (18, 28, 38, 48) отмечены как отсутствующие", "info");
		}
	};

	const handleMarkMolarsMissing = () => {
		if (onQuickStateChange) {
			const molars = [16, 26, 36, 46];
			onQuickStateChange(molars, "Missing", []);
			SoundFeedbackService.playSuccess();
			showToast("Моляры (16, 26, 36, 46) отмечены как отсутствующие", "info");
		}
	};

	const handleMarkFrontIntact = () => {
		if (onQuickStateChange) {
			const frontTeeth = [13, 12, 11, 21, 22, 23, 43, 42, 41, 31, 32, 33];
			onQuickStateChange(frontTeeth, "Healthy", []);
			SoundFeedbackService.playSuccess();
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
		SoundFeedbackService.playSuccess();
		showToast(
			`1-клик Профгигиена: протокол 043/у ${protocol.icd10} и услуга ${protocol.serviceCode} (${protocol.serviceNameRu}) добавлены`,
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
		SoundFeedbackService.playSuccess();
		showToast(
			`1-клик Кариес зуба ${targetTooth}: протокол ${protocol.icd10} и пломба ${protocol.serviceCode} добавлены`,
			"success",
		);
	};

	// Voice dictation listener
	useEffect(() => {
		const unsub = globalDentalVoiceEngine.addListener({
			onIntent: (intent) => {
				if (!intent.teethUpdates || intent.teethUpdates.length === 0) return;
				if (onQuickStateChange) {
					for (const upd of intent.teethUpdates) {
						if (upd.toothNumber && upd.state) {
							onQuickStateChange([upd.toothNumber], upd.state as ToothState, upd.surfaces);
						}
					}
					SoundFeedbackService.playSuccess();
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
			const available = Math.max(0, el.clientWidth - 16);
			const isQuadrantView = currentQuadrant !== "all";
			const activeTeeth = isQuadrantView
				? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective)
				: topTeethList;
			const baseNaturalWidth = (Array.isArray(activeTeeth) ? activeTeeth : []).reduce((acc, num) => {
				const cfg = getToothConfig(num);
				const w = Number.parseFloat(cfg.width) || 75;
				return acc + w;
			}, 0) || 1200;

			const naturalWidth = isQuadrantView ? baseNaturalWidth + 40 : baseNaturalWidth / 2 + 60;
			const calculated = naturalWidth > 0 ? available / naturalWidth : 1;
			const minScale = isQuadrantView ? 0.8 : 0.28;
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

	const [modalTooth, setModalTooth] = useState<number | null>(null);

	const handleToothClick = useCallback(
		(e: React.MouseEvent, num: number) => {
			if (onToothClick) {
				onToothClick(e, num);
			} else {
				setModalTooth(num);
			}
		},
		[onToothClick],
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
			/>

			{modalTooth !== null && (
				<SurfaceSelector
					selected={toothDataMap.get(modalTooth)?.surfaces ?? []}
					toothState={toothDataMap.get(modalTooth)?.state ?? "Healthy"}
					toothNumber={modalTooth}
					onChange={(nextSurfaces) => {
						if (onSurfacesChange) {
							onSurfacesChange([modalTooth], nextSurfaces);
						}
					}}
					onClose={() => setModalTooth(null)}
				/>
			)}
		</div>
	);
}, areToothChartPropsEqual);
ToothChart.displayName = "ToothChart";

export default ToothChart;
