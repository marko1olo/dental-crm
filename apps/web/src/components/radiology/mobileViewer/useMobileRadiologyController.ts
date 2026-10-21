import { useCallback, useMemo } from "react";
import type { ImagingStudy } from "../../../types.js";
import { showToast } from "../../GlobalToast.js";
import {
	findComparisonStudy,
	formatModalityTitle,
	formatStudyDate,
	formatStudyToothBadge,
	getPixelSpacingMm,
} from "./mobileRadiologyHelpers.js";
import { useMobileRadiologyState } from "./useMobileRadiologyState.js";

export function useMobileRadiologyController(
	selectedStudy?: ImagingStudy | null,
	activeStudies: ImagingStudy[] = [],
	labels: Record<string, string> = {},
) {
	const s = useMobileRadiologyState();
	const pixelSpacingMm = useMemo(
		() => getPixelSpacingMm(selectedStudy?.kind),
		[selectedStudy?.kind],
	);
	const toothBadge = useMemo(
		() => formatStudyToothBadge(selectedStudy),
		[selectedStudy],
	);
	const modalityTitle = useMemo(
		() => formatModalityTitle(selectedStudy, labels),
		[selectedStudy, labels],
	);
	const studyDateStr = useMemo(
		() => formatStudyDate(selectedStudy),
		[selectedStudy],
	);
	const comparisonStudy = useMemo(
		() => findComparisonStudy(activeStudies, selectedStudy),
		[activeStudies, selectedStudy],
	);

	const triggerHaptic = useCallback(() => {
		try {
			if (
				typeof navigator !== "undefined" &&
				typeof navigator.vibrate === "function"
			)
				navigator.vibrate(10);
		} catch {}
	}, []);

	const handleResetTransform = useCallback(() => {
		triggerHaptic();
		s.setZoom(1.0);
		s.setPan({ x: 0, y: 0 });
		s.setRotationDeg(0);
		s.setIsRulerActive(false);
		s.setRulerStart(null);
		s.setRulerCurrent(null);
		s.setSavedRulerDistanceMm(null);
		showToast("Масштаб и положение сброшены", "info");
	}, [triggerHaptic, s]);

	const handleCycleZoom = useCallback(() => {
		triggerHaptic();
		s.setZoom((prev) => {
			if (prev < 1.4) return 1.5;
			if (prev < 1.9) return 2.0;
			if (prev < 2.4) return 2.5;
			s.setPan({ x: 0, y: 0 });
			return 1.0;
		});
	}, [triggerHaptic, s]);

	const handleToggleInvert = useCallback(() => {
		triggerHaptic();
		s.setInverted((prev) => !prev);
	}, [triggerHaptic, s]);

	const handleCycleContrast = useCallback(() => {
		triggerHaptic();
		s.setContrast((prev) => (prev < 1.25 ? 1.35 : prev < 1.55 ? 1.7 : 1.0));
	}, [triggerHaptic, s]);

	const computedFilter = useMemo(() => {
		const parts: string[] = [];
		if (s.inverted) parts.push("invert(1)");
		if (s.contrast !== 1.0) parts.push(`contrast(${s.contrast})`);
		if (s.brightness !== 1.0) parts.push(`brightness(${s.brightness})`);
		if (s.enhancementClahe)
			parts.push("contrast(1.4) drop-shadow(0 0 1px #2dd4bf)");
		return parts.length > 0 ? parts.join(" ") : "none";
	}, [s.inverted, s.contrast, s.brightness, s.enhancementClahe]);

	const computedTransform = useMemo(
		() =>
			`translate(${s.pan.x}px, ${s.pan.y}px) scale(${s.zoom}) rotate(${s.rotationDeg}deg)`,
		[s.pan.x, s.pan.y, s.zoom, s.rotationDeg],
	);

	return {
		...s,
		pixelSpacingMm,
		toothBadge,
		modalityTitle,
		studyDateStr,
		comparisonStudy,
		triggerHaptic,
		handleResetTransform,
		handleCycleZoom,
		handleToggleInvert,
		handleCycleContrast,
		computedFilter,
		computedTransform,
	};
}
