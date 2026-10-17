/**
 * DENTE Dental CRM — Anatomical SVG Odontogram State & Interaction Hook
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useCallback, useRef, useState } from "react";
import type { OdontogramQuadrantId, ToothState } from "../ToothChart";
import { splitArchAtMidline, getQuadrantTeeth, isQuadrantTop } from "../ToothChart";
import type { AnatomicalSvgOdontogramProps } from "./anatomicalSvgProps";
import { useAnatomicalScaleAndResize } from "./useAnatomicalScaleAndResize";
import { useAnatomicalKeyboardShortcuts } from "./useAnatomicalKeyboardShortcuts";
import { useAnatomicalBridgeSpans } from "./useAnatomicalBridgeSpans";
import { useAnatomicalDentitionLists } from "./useAnatomicalDentitionLists";

export function useAnatomicalOdontogramState(props: AnatomicalSvgOdontogramProps) {
	const {
		teethData = [], pediatricMode, mixedDentition, dentitionMode, topTeeth: customTopTeeth,
		bottomTeeth: customBottomTeeth, selectedTeeth = [], onToothClick, onQuickStateChange,
		useSurfaces, showWisdomTeeth = true, activeQuadrant: controlledQuadrant, onQuadrantChange,
		mobileDisplayMode: propsMobileDisplayMode, onToggleMobileDisplayMode,
	} = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const archContainerRef = useRef<HTMLDivElement>(null);
	const [hoveredArch, setHoveredArch] = useState<"upper" | "lower" | null>(null);
	const [localMobileDisplayMode, setLocalMobileDisplayMode] = useState<"quadrant" | "carousel">("quadrant");
	const effectiveMobileDisplayMode = propsMobileDisplayMode ?? localMobileDisplayMode;
	const handleToggleMobileDisplayMode = onToggleMobileDisplayMode ?? setLocalMobileDisplayMode;
	const [carouselTooth, setCarouselTooth] = useState<number | null>(null);

	const effectiveDentition = dentitionMode ?? (mixedDentition ? "mixed" : pediatricMode ? "pediatric" : "adult");
	const isPediatricEffective = effectiveDentition === "pediatric";
	const isMixedEffective = effectiveDentition === "mixed";

	const { teethDataMap, topTeethList, bottomTeethList } = useAnatomicalDentitionLists(
		teethData, customTopTeeth, customBottomTeeth, showWisdomTeeth, isMixedEffective, isPediatricEffective,
	);

	const [localQuadrant, setLocalQuadrant] = useState<OdontogramQuadrantId>(() => {
		if (controlledQuadrant !== undefined) return controlledQuadrant;
		if (typeof window !== "undefined" && window.innerWidth <= 768) return isPediatricEffective ? "Q5" : "Q1";
		return "all";
	});
	const currentQuadrant = controlledQuadrant ?? localQuadrant;
	const handleSelectQuadrant = (q: OdontogramQuadrantId) => {
		setLocalQuadrant(q);
		onQuadrantChange?.(q);
		if (archContainerRef.current) archContainerRef.current.scrollLeft = 0;
	};

	const archScale = useAnatomicalScaleAndResize(archContainerRef, currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective);
	useAnatomicalKeyboardShortcuts(selectedTeeth, onQuickStateChange, isPediatricEffective, currentQuadrant, handleSelectQuadrant, teethDataMap);

	const onToothClickRef = useRef(onToothClick);
	onToothClickRef.current = onToothClick;
	const useSurfacesRef = useRef(useSurfaces);
	useSurfacesRef.current = useSurfaces;
	const onQuickStateChangeRef = useRef(onQuickStateChange);
	onQuickStateChangeRef.current = onQuickStateChange;

	const stableQuickStateChange = useCallback((targets: number[], state: ToothState, surfaces?: readonly string[]) => {
		onQuickStateChangeRef.current?.(targets, state, surfaces);
	}, []);

	const handleToothClick = useCallback((e: React.MouseEvent, num: number, surface?: string) => {
		const wrapper = (e.target as HTMLElement)?.closest(".tooth-svg-wrapper") ?? (e.currentTarget as HTMLElement);
		const rect = wrapper.getBoundingClientRect();
		const effectiveSurface = (useSurfacesRef.current || Boolean(e?.shiftKey || e?.altKey)) ? surface : undefined;
		onToothClickRef.current(num, rect, effectiveSurface);
	}, []);

	const topSplit = splitArchAtMidline(topTeethList);
	const bottomSplit = splitArchAtMidline(bottomTeethList);

	const { upperBridgeSpans, lowerBridgeSpans, allBridgeSpans, getToothBridgeProps, bridgePropsMap } =
		useAnatomicalBridgeSpans(topTeethList, bottomTeethList, teethData, teethDataMap);

	const isQuadrantView = currentQuadrant !== "all";
	const activeQuadrantTeeth = isQuadrantView ? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective) : [];
	const isTopQuadrant = isQuadrantTop(currentQuadrant);

	return {
		containerRef, archContainerRef, hoveredArch, setHoveredArch, effectiveMobileDisplayMode,
		handleToggleMobileDisplayMode, carouselTooth, setCarouselTooth, isPediatricEffective, isMixedEffective,
		currentQuadrant, handleSelectQuadrant, archScale, teethDataMap, topTeethList, bottomTeethList,
		topSplit, bottomSplit, upperBridgeSpans, lowerBridgeSpans, allBridgeSpans, getToothBridgeProps,
		bridgePropsMap, isQuadrantView, activeQuadrantTeeth, isTopQuadrant, stableQuickStateChange, handleToothClick,
	};
}
