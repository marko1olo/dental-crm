import { useEffect, useRef, useState } from "react";
import { getToothConfig } from "../../../../utils/math/toothGeometry";
import { type OdontogramQuadrantId, getQuadrantTeeth } from "../toothChartTypes";

export function useToothChartScaling(
	archContainerRef: React.RefObject<HTMLDivElement | null>,
	currentQuadrant: OdontogramQuadrantId,
	topTeethList: readonly number[],
	bottomTeethList: readonly number[],
	isPediatricEffective: boolean,
) {
	const [archScale, setArchScale] = useState(1);
	const appliedArchScaleRef = useRef(1);

	useEffect(() => {
		const element = archContainerRef.current;
		if (!element) return;

		const recalculate = () => {
			const el = archContainerRef.current;
			if (!el) return;
			const available = Math.max(0, el.clientWidth - 24);
			const isQuadrantView = currentQuadrant !== "all";
			const activeTeeth = isQuadrantView
				? getQuadrantTeeth(currentQuadrant, topTeethList as number[], bottomTeethList as number[], isPediatricEffective)
				: topTeethList;
			const baseNaturalWidth = (Array.isArray(activeTeeth) ? activeTeeth : []).reduce((acc, num) => {
				const cfg = getToothConfig(num);
				const w = Number.parseFloat(cfg.width) || 75;
				return acc + w;
			}, 0) || 1200;

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
	}, [currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective, archContainerRef]);

	return archScale;
}
