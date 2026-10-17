/**
 * DENTE Dental CRM — Anatomical Dentition Lists & Tooth Mapping Hook
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useCallback, useMemo } from "react";
import type { ToothData } from "../ToothChart";
import {
	MIXED_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	TOP_TEETH,
	BOTTOM_TEETH,
} from "../AnatomicalToothColors";

export function useAnatomicalDentitionLists(
	teethData: ToothData[] | undefined,
	customTopTeeth: number[] | undefined,
	customBottomTeeth: number[] | undefined,
	showWisdomTeeth: boolean,
	isMixedEffective: boolean,
	isPediatricEffective: boolean,
) {
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

	const isWisdom = useCallback((n: number) => n === 18 || n === 28 || n === 38 || n === 48, []);

	const topTeethList = useMemo(() => {
		if (Array.isArray(customTopTeeth) && customTopTeeth.length > 0) {
			return showWisdomTeeth ? customTopTeeth : customTopTeeth.filter((n) => !isWisdom(n));
		}
		const defaultList = isMixedEffective ? MIXED_TOP_TEETH : isPediatricEffective ? PEDIATRIC_TOP_TEETH : TOP_TEETH;
		return showWisdomTeeth ? defaultList : defaultList.filter((n) => !isWisdom(n));
	}, [customTopTeeth, showWisdomTeeth, isMixedEffective, isPediatricEffective, isWisdom]);

	const bottomTeethList = useMemo(() => {
		if (Array.isArray(customBottomTeeth) && customBottomTeeth.length > 0) {
			return showWisdomTeeth ? customBottomTeeth : customBottomTeeth.filter((n) => !isWisdom(n));
		}
		const defaultList = isMixedEffective ? MIXED_BOTTOM_TEETH : isPediatricEffective ? PEDIATRIC_BOTTOM_TEETH : BOTTOM_TEETH;
		return showWisdomTeeth ? defaultList : defaultList.filter((n) => !isWisdom(n));
	}, [customBottomTeeth, showWisdomTeeth, isMixedEffective, isPediatricEffective, isWisdom]);

	return { teethDataMap, topTeethList, bottomTeethList };
}
