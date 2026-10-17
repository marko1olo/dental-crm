/**
 * DENTE Dental CRM — Anatomical Arch Scale & Resize Observer Hook
 * Compliant with Mandate 8b (<= 120 lines).
 */

import { useEffect, useRef, useState } from "react";
import type { OdontogramQuadrantId } from "../ToothChart";
import { getQuadrantTeeth } from "../ToothChart";
import { getAnatomicalToothGeometry } from "../anatomicalToothGeometries";
import { MIN_ARCH_SCALE } from "../AnatomicalToothColors";

export function useAnatomicalScaleAndResize(
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
		let rafId: number | null = null;

		const recalculate = () => {
			const el = archContainerRef.current;
			if (!el) return;
			const available = Math.max(0, el.clientWidth - 24);
			if (!available) return;

			const isQuadrantView = currentQuadrant !== "all";
			const activeTeeth = isQuadrantView
				? getQuadrantTeeth(currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective)
				: topTeethList;

			const baseNaturalWidth = (Array.isArray(activeTeeth) ? activeTeeth : []).reduce((acc, num) => {
				const geom = getAnatomicalToothGeometry(num);
				return acc + Math.round(geom.standardWidthPx * 1.3) + 6;
			}, isQuadrantView ? 0 : 28);

			if (baseNaturalWidth <= 0) return;

			const windowHeight = typeof window !== "undefined" ? window.innerHeight : 900;
			const isShortHeight = windowHeight <= 768;
			const heightScaleFactor = isShortHeight ? Math.max(0.68, Math.min(1.0, (windowHeight - 340) / 280)) : 1.0;

			const minScale = isQuadrantView ? (available < 420 ? 0.65 : (isShortHeight ? 0.8 : 0.95)) : (isShortHeight ? 0.35 : MIN_ARCH_SCALE);
			const widthScale = (available / baseNaturalWidth) * (isQuadrantView ? 1.15 : 0.96);
			const rawTargetScale = Math.min(1.0, Math.max(minScale, widthScale * heightScaleFactor));
			const targetScale = Math.round(rawTargetScale * 50) / 50;

			if (Math.abs(appliedArchScaleRef.current - targetScale) < 0.03) return;
			appliedArchScaleRef.current = targetScale;
			setArchScale(targetScale);
		};

		const debouncedRecalculate = () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			rafId = requestAnimationFrame(recalculate);
		};

		recalculate();
		const observer = new ResizeObserver(debouncedRecalculate);
		observer.observe(element);
		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
			observer.disconnect();
		};
	}, [currentQuadrant, topTeethList, bottomTeethList, isPediatricEffective, archContainerRef]);

	return archScale;
}
