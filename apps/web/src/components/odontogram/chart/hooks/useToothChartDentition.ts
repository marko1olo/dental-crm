import { useState, useMemo, useEffect, useCallback } from "react";
import { loadStoredTeethData } from "../../odontogramStorage";
import {
	type ToothData, type ToothState, type DentitionMode, type OdontogramQuadrantId,
	TOP_TEETH, BOTTOM_TEETH, PEDIATRIC_TOP_TEETH, PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH, MIXED_BOTTOM_TEETH, splitArchAtMidline, getQuadrantTeeth, isQuadrantTop,
} from "../toothChartTypes";

export function useToothChartDentition(
	teethData: readonly ToothData[] | undefined, patientId: string | undefined,
	pediatricMode: boolean | undefined, mixedDentition: boolean | undefined,
	dentitionMode: DentitionMode | undefined, controlledQuadrant: OdontogramQuadrantId | undefined,
	onQuadrantChange: ((q: OdontogramQuadrantId) => void) | undefined,
	customTopTeeth: number[] | undefined, customBottomTeeth: number[] | undefined, selectedTeeth: number[],
) {
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
		for (const t of resolvedTeethData) map.set(t.toothNumber, t);
		return map;
	}, [resolvedTeethData]);

	const [localDentitionMode] = useState<DentitionMode>(
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

	const handleSelectQuadrant = useCallback((q: OdontogramQuadrantId) => {
		setLocalQuadrant(q);
		onQuadrantChange?.(q);
	}, [onQuadrantChange]);

	useEffect(() => {
		const handleViewportResize = () => {
			if (typeof window !== "undefined" && window.innerWidth <= 768 && controlledQuadrant === undefined) {
				setLocalQuadrant((prev) => (prev === "all" ? (isPediatricEffective ? "Q5" : "Q1") : prev));
			}
		};
		window.addEventListener("resize", handleViewportResize);
		return () => window.removeEventListener("resize", handleViewportResize);
	}, [isPediatricEffective, controlledQuadrant]);

	const defaultTopTeeth = isMixedEffective ? MIXED_TOP_TEETH : isPediatricEffective ? PEDIATRIC_TOP_TEETH : TOP_TEETH;
	const defaultBottomTeeth = isMixedEffective ? MIXED_BOTTOM_TEETH : isPediatricEffective ? PEDIATRIC_BOTTOM_TEETH : BOTTOM_TEETH;
	const topTeethList = Array.isArray(customTopTeeth) && customTopTeeth.length > 0 ? customTopTeeth : defaultTopTeeth;
	const bottomTeethList = Array.isArray(customBottomTeeth) && customBottomTeeth.length > 0 ? customBottomTeeth : defaultBottomTeeth;

	const topSplit = useMemo(() => splitArchAtMidline(topTeethList), [topTeethList]);
	const bottomSplit = useMemo(() => splitArchAtMidline(bottomTeethList), [bottomTeethList]);
	const isQuadrantView = currentQuadrant !== "all";
	const activeQuadrantTeeth = isQuadrantView
		? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective) : [];
	const isTopQuadrant = isQuadrantTop(currentQuadrant);

	const [localRadialData, setLocalRadialData] = useState<{
		toothNumber: number;
		anchorRect: { x: number; y: number; width: number; height: number };
		currentState?: ToothState;
	} | null>(null);

	return {
		toothDataMap, isPediatricEffective, isMixedEffective, currentQuadrant,
		handleSelectQuadrant, mobileDisplayMode, setMobileDisplayMode,
		carouselTooth, setCarouselTooth, topTeethList, bottomTeethList,
		topSplit, bottomSplit, isQuadrantView, activeQuadrantTeeth, isTopQuadrant,
		localRadialData, setLocalRadialData,
	};
}
