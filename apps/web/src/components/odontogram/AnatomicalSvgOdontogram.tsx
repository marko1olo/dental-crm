/**
 * DENTE Dental CRM — Anatomical SVG Odontogram
 *
 * Renders high-fidelity dual-arch (Maxilla & Mandible) or single-quadrant anatomical
 * dental charts with interactive tooth selection, ICDAS surface diagnostics,
 * bridge span indicators, periodontal bone loss, and global treatment overlays.
 */

import { Sparkles } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	DenteToothSvgDefs,
	type ToothData,
	type ToothState,
	TOOTH_STATE_LABELS,
	type ToothVisualProps,
	type OdontogramQuadrantId,
	getQuadrantForTooth,
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
	getQuadrantTeeth,
} from "./ToothChart";
import {
	ANATOMICAL_SURFACE_LABELS_RU,
	type AnatomicalSurfaceKey,
	type BridgeSpanInfo,
	type CanalObturationMaterial,
	detectBridgeSpans,
	type FurcationGrade,
	getAnatomicalToothGeometry,
	getBridgeSpanForTooth,
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	getPhysiologicalRootResorptionGeometry,
	getSurfaceShading,
	isSurfaceActive,
	type PeriodontalBoneLossPattern,
	type PostCoreType,
	type RestorativeMaterialKey,
	type RootResorptionStage,
	ROOT_RESORPTION_STAGES,
} from "./anatomicalToothGeometries";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "./ClassicGostOdontogram";
import { useIsTouchScreen } from "./useIsTouchScreen";
import {
	GlobalTreatmentsStrip,
	type GlobalTreatmentItem,
} from "./GlobalTreatmentsStrip";
import { PERIAPICAL_LESION_SIZES } from "./ToothSVGPaths";
import {
	BOTTOM_SURFACE_KEYS,
	BOTTOM_TEETH,
	getAnatomicalToothColors,
	isLowSpecFilterDisabled,
	MIN_ARCH_SCALE,
	MIXED_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	scaleCssPx,
	splitArchAtMidline,
	TOP_SURFACE_KEYS,
	TOP_TEETH,
} from "./AnatomicalToothColors";
import {
	ToothWrapper,
	type ToothWrapperProps,
	areSurfacesEqual,
	areToothDataEqual,
	areToothWrapperPropsEqual,
} from "./ToothWrapper";
import {
	AnatomicalQuadrantSwitcher,
	QuadrantFocusedHeader,
} from "./AnatomicalQuadrantSwitcher";
import { AnatomicalDualArchView } from "./AnatomicalDualArchView";

// Re-export tooth wrapper and helper submodules for complete backward compatibility
export {
	ToothWrapper,
	type ToothWrapperProps,
	areSurfacesEqual,
	areToothDataEqual,
	areToothWrapperPropsEqual,
};
export * from "./AnatomicalToothColors";
export * from "./AnatomicalToothSVG";
export * from "./AnatomicalToothSurfacesLayer";
export * from "./AnatomicalQuadrantSwitcher";
export * from "./AnatomicalDualArchView";

export interface AnatomicalSvgOdontogramProps {
	teethData?: ToothData[] | undefined;
	pediatricMode?: boolean | undefined;
	mixedDentition?: boolean | undefined;
	topTeeth?: number[] | undefined;
	bottomTeeth?: number[] | undefined;
	selectedTeeth?: number[] | undefined;
	activeStamp?: ToothState | null | undefined;
	onToothClick: (num: number, rect: DOMRect, surface?: string | undefined) => void;
	onQuickStateChange?: ((targets: number[], state: ToothState, surfaces?: readonly string[] | undefined) => void) | undefined;
	useSurfaces?: boolean | undefined;
	hideHeader?: boolean | undefined;
	hideLegend?: boolean | undefined;
	showWisdomTeeth?: boolean | undefined;
	showPulpAndCanals?: boolean | undefined;
	showPeriapicalHalos?: boolean | undefined;
	showPeriodontalBoneLoss?: boolean | undefined;
	activeQuadrant?: OdontogramQuadrantId | undefined;
	onQuadrantChange?: ((quadrant: OdontogramQuadrantId) => void) | undefined;
	hideQuadrantSwitcher?: boolean | undefined;
	dentitionMode?: "adult" | "pediatric" | "mixed" | undefined;
	globalTreatments?: GlobalTreatmentItem[] | undefined;
	onGlobalTreatmentsChange?: ((items: GlobalTreatmentItem[]) => void) | undefined;
	className?: string | undefined;
}

export function areAnatomicalSvgOdontogramPropsEqual(
	prev: AnatomicalSvgOdontogramProps,
	next: AnatomicalSvgOdontogramProps,
): boolean {
	if (prev.pediatricMode !== next.pediatricMode) return false;
	if (prev.mixedDentition !== next.mixedDentition) return false;
	if (prev.dentitionMode !== next.dentitionMode) return false;
	if (prev.activeStamp !== next.activeStamp) return false;
	if (prev.useSurfaces !== next.useSurfaces) return false;
	if (prev.hideHeader !== next.hideHeader) return false;
	if (prev.hideLegend !== next.hideLegend) return false;
	if (prev.showWisdomTeeth !== next.showWisdomTeeth) return false;
	if (prev.showPulpAndCanals !== next.showPulpAndCanals) return false;
	if (prev.showPeriapicalHalos !== next.showPeriapicalHalos) return false;
	if (prev.showPeriodontalBoneLoss !== next.showPeriodontalBoneLoss) return false;
	if (prev.activeQuadrant !== next.activeQuadrant) return false;
	if (prev.hideQuadrantSwitcher !== next.hideQuadrantSwitcher) return false;
	if (prev.className !== next.className) return false;

	// Compare selectedTeeth array
	if (prev.selectedTeeth !== next.selectedTeeth) {
		const prevLen = prev.selectedTeeth?.length ?? 0;
		const nextLen = next.selectedTeeth?.length ?? 0;
		if (prevLen !== nextLen) return false;
		for (let i = 0; i < prevLen; i++) {
			if (prev.selectedTeeth![i] !== next.selectedTeeth![i]) return false;
		}
	}

	// Compare topTeeth & bottomTeeth
	if (prev.topTeeth !== next.topTeeth) {
		const pLen = prev.topTeeth?.length ?? 0;
		const nLen = next.topTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.topTeeth![i] !== next.topTeeth![i]) return false;
		}
	}
	if (prev.bottomTeeth !== next.bottomTeeth) {
		const pLen = prev.bottomTeeth?.length ?? 0;
		const nLen = next.bottomTeeth?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			if (prev.bottomTeeth![i] !== next.bottomTeeth![i]) return false;
		}
	}

	// Compare teethData using granular areToothDataEqual
	if (prev.teethData !== next.teethData) {
		const pLen = prev.teethData?.length ?? 0;
		const nLen = next.teethData?.length ?? 0;
		if (pLen !== nLen) return false;
		if (pLen > 0 && prev.teethData && next.teethData) {
			for (let i = 0; i < pLen; i++) {
				const pt = prev.teethData[i];
				const nt = next.teethData[i];
				if (!pt || !nt) return false;
				if (!areToothDataEqual(pt, nt)) return false;
			}
		}
	}

	// Compare globalTreatments
	if (prev.globalTreatments !== next.globalTreatments) {
		const pLen = prev.globalTreatments?.length ?? 0;
		const nLen = next.globalTreatments?.length ?? 0;
		if (pLen !== nLen) return false;
		for (let i = 0; i < pLen; i++) {
			const p = prev.globalTreatments![i];
			const n = next.globalTreatments![i];
			if (!p || !n) return false;
			if (
				p.id !== n.id ||
				p.title !== n.title ||
				p.clinicalType !== n.clinicalType ||
				p.status !== n.status
			)
				return false;
		}
	}

	return true;
}

export const AnatomicalSvgOdontogram: React.FC<AnatomicalSvgOdontogramProps> = React.memo(({
	teethData = [],
	pediatricMode,
	mixedDentition,
	dentitionMode,
	topTeeth: customTopTeeth,
	bottomTeeth: customBottomTeeth,
	selectedTeeth = [],
	activeStamp = null,
	onToothClick,
	onQuickStateChange,
	useSurfaces,
	hideHeader = false,
	hideLegend = false,
	hideQuadrantSwitcher = false,
	showWisdomTeeth = true,
	showPulpAndCanals = false,
	showPeriapicalHalos = true,
	showPeriodontalBoneLoss = true,
	activeQuadrant: controlledQuadrant,
	onQuadrantChange,
	globalTreatments,
	onGlobalTreatmentsChange,
	className = "",
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);
	const [archScale, setArchScale] = useState(1);
	const appliedArchScaleRef = useRef(1);
	const [hoveredArch, setHoveredArch] = useState<"upper" | "lower" | null>(null);
	const [internalGlobals, setInternalGlobals] = useState<GlobalTreatmentItem[]>([]);
	const currentGlobals = globalTreatments ?? internalGlobals;

	const teethDataMap = useMemo(() => {
		const map = new Map<number, ToothData>();
		if (Array.isArray(teethData)) {
			for (let i = 0; i < teethData.length; i++) {
				const t = teethData[i];
				if (t && typeof t.toothNumber === "number") {
					map.set(t.toothNumber, t);
				}
			}
		}
		return map;
	}, [teethData]);

	const effectiveDentition = dentitionMode ?? (mixedDentition ? "mixed" : pediatricMode ? "pediatric" : "adult");
	const isPediatricEffective = effectiveDentition === "pediatric";
	const isMixedEffective = effectiveDentition === "mixed";

	const [localQuadrant, setLocalQuadrant] = useState<OdontogramQuadrantId>(() => {
		if (controlledQuadrant !== undefined) return controlledQuadrant;
		if (typeof window !== "undefined" && window.innerWidth < 640) {
			return isPediatricEffective ? "Q5" : "Q1";
		}
		return "all";
	});
	const currentQuadrant = controlledQuadrant ?? localQuadrant;

	const handleSelectQuadrant = (q: OdontogramQuadrantId) => {
		setLocalQuadrant(q);
		onQuadrantChange?.(q);
		if (archContainerRef.current) {
			archContainerRef.current.scrollLeft = 0;
		}
	};

	useEffect(() => {
		if (controlledQuadrant !== undefined) {
			setLocalQuadrant(controlledQuadrant);
		}
		if (archContainerRef.current) {
			archContainerRef.current.scrollLeft = 0;
		}
	}, [controlledQuadrant, currentQuadrant]);

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

	const rawTopTeethList =
		Array.isArray(customTopTeeth) && customTopTeeth.length > 0
			? customTopTeeth
			: defaultTopTeeth;
	const rawBottomTeethList =
		Array.isArray(customBottomTeeth) && customBottomTeeth.length > 0
			? customBottomTeeth
			: defaultBottomTeeth;

	const isWisdom = (n: number) => n === 18 || n === 28 || n === 38 || n === 48;
	const topTeethList = Array.isArray(rawTopTeethList)
		? (showWisdomTeeth ? rawTopTeethList : rawTopTeethList.filter((n) => !isWisdom(n)))
		: defaultTopTeeth;
	const bottomTeethList = Array.isArray(rawBottomTeethList)
		? (showWisdomTeeth ? rawBottomTeethList : rawBottomTeethList.filter((n) => !isWisdom(n)))
		: defaultBottomTeeth;

	useEffect(() => {
		const element = archContainerRef.current;
		if (!element) return;

		const recalculate = () => {
			const el = archContainerRef.current;
			if (!el) return;
			// 24px safety buffer so outer molars (18, 28, 48, 38) are never clipped by container boundaries
			const available = Math.max(0, el.clientWidth - 24);
			if (!available) return;

			const isQuadrantView = currentQuadrant !== "all";
			const activeTeeth = isQuadrantView
				? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective)
				: topTeethList;

			// Exact intrinsic base width at scale 1.0 based on anatomical tooth geometries + spacing
			const baseNaturalWidth = (Array.isArray(activeTeeth) ? activeTeeth : []).reduce((acc, num) => {
				const geom = getAnatomicalToothGeometry(num);
				return acc + Math.round(geom.standardWidthPx * 1.3) + 6;
			}, isQuadrantView ? 0 : 28);

			if (baseNaturalWidth <= 0) return;

			const windowHeight = typeof window !== "undefined" ? window.innerHeight : 900;
			const isShortHeight = windowHeight <= 768;
			const heightScaleFactor = isShortHeight ? Math.max(0.68, Math.min(1.0, (windowHeight - 340) / 280)) : 1.0;

			const minScale = isQuadrantView ? (available < 420 ? 0.65 : (isShortHeight ? 0.8 : 0.95)) : (isShortHeight ? 0.52 : 0.65);
			const widthScale = (available / baseNaturalWidth) * (isQuadrantView ? 1.15 : 0.96);
			const targetScale = Math.min(
				1.8,
				Math.max(minScale, widthScale * heightScaleFactor),
			);

			if (Math.abs(appliedArchScaleRef.current - targetScale) < 0.005) return;
			appliedArchScaleRef.current = targetScale;
			setArchScale(targetScale);
		};

		recalculate();
		const observer = new ResizeObserver(recalculate);
		observer.observe(element);
		return () => observer.disconnect();
	}, [currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective]);

	// High-speed keyboard triggers: instant 1-key assigning without opening sub-menus
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement ||
				target?.isContentEditable
			) {
				return;
			}

			if (selectedTeeth.length > 0 && onQuickStateChange) {
				const quickState = getToothStateFromHotkey(e.key);
				if (quickState) {
					e.preventDefault();
					const singleTooth =
						selectedTeeth.length === 1 && selectedTeeth[0] !== undefined
							? teethDataMap.get(selectedTeeth[0])
							: undefined;
					onQuickStateChange(selectedTeeth, quickState, singleTooth?.surfaces);
					return;
				}
			}

			const firstTooth = selectedTeeth[0];
			if (selectedTeeth.length === 1 && firstTooth !== undefined) {
				const dirMap: Record<string, "left" | "right" | "up" | "down" | "home" | "end"> = {
					ArrowLeft: "left",
					ArrowRight: "right",
					ArrowUp: "up",
					ArrowDown: "down",
					Home: "home",
					End: "end",
				};
				const navDir = dirMap[e.key];
				if (navDir) {
					e.preventDefault();
					const nextTooth = getNextFocusedTooth(firstTooth, navDir, isPediatricEffective);
					if (currentQuadrant !== "all") {
						const nextQuad = getQuadrantForTooth(nextTooth, isPediatricEffective);
						if (nextQuad !== currentQuadrant) {
							handleSelectQuadrant(nextQuad);
						}
					}
					const nextEl = document.querySelector<HTMLButtonElement>(`[data-tooth-id="${nextTooth}"]`);
					nextEl?.focus();
				}
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => {
			window.removeEventListener("keydown", handleGlobalKeyDown);
		};
	}, [selectedTeeth, onQuickStateChange, isPediatricEffective, currentQuadrant, teethDataMap]);

	const handleToothClick = React.useCallback(
		(
			e: React.MouseEvent,
			num: number,
			surface?: string,
		) => {
			const wrapper =
				(e.target as HTMLElement)?.closest(".tooth-svg-wrapper") ??
				(e.currentTarget as HTMLElement);
			const rect = wrapper.getBoundingClientRect();
			onToothClick(num, rect, surface);
		},
		[onToothClick],
	);

	const topSplit = React.useMemo(() => splitArchAtMidline(topTeethList), [topTeethList]);
	const bottomSplit = React.useMemo(() => splitArchAtMidline(bottomTeethList), [bottomTeethList]);

	const upperBridgeSpans = React.useMemo(
		() => detectBridgeSpans(topTeethList, teethData ?? []),
		[topTeethList, teethData],
	);
	const lowerBridgeSpans = React.useMemo(
		() => detectBridgeSpans(bottomTeethList, teethData ?? []),
		[bottomTeethList, teethData],
	);
	const allBridgeSpans = React.useMemo(
		() => [...upperBridgeSpans, ...lowerBridgeSpans],
		[upperBridgeSpans, lowerBridgeSpans],
	);

	const getToothBridgeProps = (
		num: number,
		archTeethList: readonly number[],
		spans: readonly BridgeSpanInfo[],
	) => {
		const span = getBridgeSpanForTooth(num, spans);
		const toothItem = teethDataMap.get(num);
		const isPonticByRole = toothItem?.bridgeRole === "pontic";
		if (!span) {
			const rawBridgeMaterial = isPonticByRole ? (toothItem?.material ?? "zirconia") : undefined;
			return {
				isPontic: isPonticByRole,
				...(rawBridgeMaterial ? { bridgeMaterial: rawBridgeMaterial } : {}),
				hasLeftBridgeConnector: false,
				hasRightBridgeConnector: false,
			};
		}
		const isPontic = isPonticByRole || span.pontics.includes(num);
		const archIdx = archTeethList.indexOf(num);
		const prevNum = archIdx > 0 ? archTeethList[archIdx - 1] : undefined;
		const nextNum =
			archIdx >= 0 && archIdx < archTeethList.length - 1
				? archTeethList[archIdx + 1]
				: undefined;
		const hasLeftBridgeConnector =
			prevNum !== undefined && span.teeth.includes(prevNum);
		const hasRightBridgeConnector =
			nextNum !== undefined && span.teeth.includes(nextNum);
		const rawBridgeMaterial = span.material;
		return {
			isPontic,
			...(rawBridgeMaterial ? { bridgeMaterial: rawBridgeMaterial } : {}),
			hasLeftBridgeConnector,
			hasRightBridgeConnector,
		};
	};

	const bridgePropsMap = React.useMemo(() => {
		const map = new Map<number, {
			isPontic: boolean;
			bridgeMaterial?: RestorativeMaterialKey;
			hasLeftBridgeConnector: boolean;
			hasRightBridgeConnector: boolean;
		}>();
		for (const num of topTeethList) {
			map.set(num, getToothBridgeProps(num, topTeethList, upperBridgeSpans));
		}
		for (const num of bottomTeethList) {
			map.set(num, getToothBridgeProps(num, bottomTeethList, lowerBridgeSpans));
		}
		return map;
	}, [topTeethList, bottomTeethList, upperBridgeSpans, lowerBridgeSpans, teethDataMap]);

	const isQuadrantView = currentQuadrant !== "all";
	const activeQuadrantTeeth = isQuadrantView
		? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective)
		: [];
	const isTopQuadrant = isQuadrantTop(currentQuadrant);

	return (
		<div className={`tooth-chart-container anatomical-svg-mode ${className}`.trim()} ref={containerRef}>
			<DenteToothSvgDefs />

			{/* Responsive Mobile & Desktop Quadrant Adapter Bar (Compact Space-Efficient) */}
			{!hideQuadrantSwitcher && (
				<AnatomicalQuadrantSwitcher
					currentQuadrant={currentQuadrant}
					onSelectQuadrant={handleSelectQuadrant}
					isPediatricEffective={isPediatricEffective}
					isMixedEffective={isMixedEffective}
					showWisdomTeeth={showWisdomTeeth}
				/>
			)}

			<div className="tooth-chart-arch-container" ref={archContainerRef}>
				{isQuadrantView ? (
					/* Focused Single Quadrant Large Mobile View (8 teeth with touch hit targets >= 48x48px) */
					<div
						className="tooth-chart-arch-wrapper quadrant-view-wrapper"
						data-testid="quadrant-focused-view"
						style={{
							width: "100%",
							maxWidth: "100%",
							margin: 0,
							position: "relative",
						}}
					>
						<QuadrantFocusedHeader
							currentQuadrant={currentQuadrant}
							onSelectQuadrant={handleSelectQuadrant}
							isPediatricEffective={isPediatricEffective}
						/>

						<div className={`teeth-row ${isTopQuadrant ? "top-row" : "bottom-row"} quadrant-row ${
							(isTopQuadrant && hoveredArch === "upper") || (!isTopQuadrant && hoveredArch === "lower")
								? "ring-2 ring-blue-400/80 shadow-lg shadow-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20 rounded-xl transition-all duration-300"
								: ""
						}`}>
							<div className="tooth-quadrant-group focused-quadrant-group">
								{(Array.isArray(activeQuadrantTeeth) ? activeQuadrantTeeth : []).map((num) => {
									const tData: ToothData = teethDataMap.get(num) ?? {
										toothNumber: num,
										state: "Healthy",
									};
									const bridgeProps = bridgePropsMap.get(num) ?? getToothBridgeProps(
										num,
										isTopQuadrant ? topTeethList : bottomTeethList,
										isTopQuadrant ? upperBridgeSpans : lowerBridgeSpans,
									);
									return (
										<ToothWrapper
											key={num}
											tooth={tData}
											scale={Math.max(1.0, archScale)}
											isTop={isTopQuadrant}
											isSelected={selectedTeeth.includes(num)}
											selectedTeeth={selectedTeeth}
											activeStamp={activeStamp}
											onClick={handleToothClick}
											onQuickStateChange={onQuickStateChange}
											useSurfaces={useSurfaces}
											showPulpAndCanals={showPulpAndCanals}
											showPeriapicalHalos={showPeriapicalHalos}
											showPeriodontalBoneLoss={showPeriodontalBoneLoss}
											pediatricMode={isPediatricEffective}
											{...bridgeProps}
										/>
									);
								})}
							</div>
						</div>
					</div>
				) : (
					/* Full Dual-Arch View (All 32 adult teeth or 20 pediatric teeth) */
					<AnatomicalDualArchView
						topSplit={topSplit}
						bottomSplit={bottomSplit}
						teethDataMap={teethDataMap}
						bridgePropsMap={bridgePropsMap}
						topTeethList={topTeethList}
						bottomTeethList={bottomTeethList}
						upperBridgeSpans={upperBridgeSpans}
						lowerBridgeSpans={lowerBridgeSpans}
						getToothBridgeProps={getToothBridgeProps}
						selectedTeeth={selectedTeeth}
						archScale={archScale}
						activeStamp={activeStamp}
						handleToothClick={handleToothClick}
						onQuickStateChange={onQuickStateChange}
						useSurfaces={useSurfaces}
						showPulpAndCanals={showPulpAndCanals}
						showPeriapicalHalos={showPeriapicalHalos}
						showPeriodontalBoneLoss={showPeriodontalBoneLoss}
						isPediatricEffective={isPediatricEffective}
						hoveredArch={hoveredArch}
					/>
				)}
			</div>

			{/* Detected Bridge Spans Indicator Banner (below teeth) */}
			{allBridgeSpans.length > 0 && (
				<div
					className="odontogram-bridge-spans-banner flex flex-wrap items-center gap-2 px-3 py-1.5 my-2 rounded-xl bg-blue-500/10 dark:bg-blue-950/40 border border-blue-500/30 text-xs text-blue-900 dark:text-blue-200"
					data-testid="bridge-spans-banner"
				>
					<Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
					<span className="font-bold">Мостовидные протезы ({allBridgeSpans.length}):</span>
					{allBridgeSpans.map((span) => (
						<span
							key={span.id}
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-800 dark:text-blue-300 font-mono text-[11px] font-bold"
						>
							<span>{span.startTooth} (опора)</span>
							<span className="text-blue-500 font-normal">━━</span>
							<span className="text-blue-600 dark:text-blue-400 font-black">
								{span.pontics.join(", ")} (тело)
							</span>
							<span className="text-blue-500 font-normal">━━</span>
							<span>{span.endTooth} (опора)</span>
							<span className="text-[10px] text-blue-600/70 dark:text-blue-400/70 uppercase font-sans">
								• {span.material}
							</span>
						</span>
					))}
				</div>
			)}

			{/* Global Treatments Strip (below teeth) */}
			<div className="my-2">
				<GlobalTreatmentsStrip
					treatments={currentGlobals}
					onArchHover={setHoveredArch}
					onQuickAdd={(item) => {
						const newItem: GlobalTreatmentItem = {
							...item,
							id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
								? `gt-${crypto.randomUUID()}`
								: `gt-${Date.now()}-${currentGlobals.length + 1}`,
						};
						const next = [...currentGlobals, newItem];
						setInternalGlobals(next);
						onGlobalTreatmentsChange?.(next);
					}}
				/>
			</div>

			{/* Color Legend (below teeth) */}
			{!hideLegend && (
				<div className="tooth-chart-legend-row my-2 hidden sm:block">
					<div className="tooth-chart-legend">
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] shadow-sm" /> Кариес
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] shadow-sm" /> Пульпит
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" /> Периодонтит
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6] shadow-sm" /> Пломба
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[#10b981] shadow-sm" /> Коронка
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[#64748b] shadow-sm" /> Имплант
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-slate-400 border border-slate-500" /> План
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-[#64748b] shadow-sm" /> Отсутствует
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" /> Ретинирован
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-rose-700 shadow-sm" /> Корень
						</span>
						<span className="tooth-chart-legend-item">
							<span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-sm" /> Мостовидный протез
						</span>
					</div>
				</div>
			)}
		</div>
	);
}, areAnatomicalSvgOdontogramPropsEqual);
AnatomicalSvgOdontogram.displayName = "AnatomicalSvgOdontogram";
