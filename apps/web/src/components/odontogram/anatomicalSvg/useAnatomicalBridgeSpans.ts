/**
 * DENTE Dental CRM — Bridge Spans Detection & Props Hook
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import type { ToothData } from "../ToothChart";
import {
	type BridgeSpanInfo,
	detectBridgeSpans,
	getBridgeSpanForTooth,
	type RestorativeMaterialKey,
} from "../anatomicalToothGeometries";
import type { ToothBridgePropsResult } from "../anatomicalDualArch/archTypes";

export function useAnatomicalBridgeSpans(
	topTeethList: readonly number[],
	bottomTeethList: readonly number[],
	teethData: ToothData[] | undefined,
	teethDataMap: Map<number, ToothData>,
) {
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
	): ToothBridgePropsResult => {
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
		const nextNum = archIdx >= 0 && archIdx < archTeethList.length - 1 ? archTeethList[archIdx + 1] : undefined;
		const hasLeftBridgeConnector = prevNum !== undefined && span.teeth.includes(prevNum);
		const hasRightBridgeConnector = nextNum !== undefined && span.teeth.includes(nextNum);
		const rawBridgeMaterial = span.material;
		return {
			isPontic,
			...(rawBridgeMaterial ? { bridgeMaterial: rawBridgeMaterial } : {}),
			hasLeftBridgeConnector,
			hasRightBridgeConnector,
		};
	};

	const bridgePropsMap = React.useMemo(() => {
		const map = new Map<number, ToothBridgePropsResult>();
		for (const num of topTeethList) {
			map.set(num, getToothBridgeProps(num, topTeethList, upperBridgeSpans));
		}
		for (const num of bottomTeethList) {
			map.set(num, getToothBridgeProps(num, bottomTeethList, lowerBridgeSpans));
		}
		return map;
	}, [topTeethList, bottomTeethList, upperBridgeSpans, lowerBridgeSpans, teethDataMap]);

	return {
		upperBridgeSpans,
		lowerBridgeSpans,
		allBridgeSpans,
		getToothBridgeProps,
		bridgePropsMap,
	};
}
