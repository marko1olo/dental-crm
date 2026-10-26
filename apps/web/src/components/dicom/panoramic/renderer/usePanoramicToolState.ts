/**
 * usePanoramicToolState.ts — Состояние инструментов, пресетов и замеров (Мандат 8b <= 120 строк).
 */

import { useState, useCallback } from "react";
import type { VisiographPresetId } from "../../../visiograph/VisiographWindowPresets";
import type { RulerMeasurement, AngleMeasurement } from "../../PanoramicMeasurementOverlay";
import { showToast } from "../../../GlobalToast";

export function usePanoramicToolState(initialThickness = 0) {
	const [activePreset, setActivePreset] = useState<VisiographPresetId>("bone");
	const [viewMode, setViewMode] = useState<"panoramic" | "mpr_4quadrant">("panoramic");
	const [crossSectionStepMm, setCrossSectionStepMm] = useState<number>(1.5);
	const [sliceThicknessMm, setSliceThicknessMm] = useState<number>(initialThickness > 0 ? initialThickness : 1.0);
	const [activeCrossSectionIdx, setActiveCrossSectionIdx] = useState<number>(0);
	const [isSharpenActive, setIsSharpenActive] = useState<boolean>(false);
	const [isInvertColors, setIsInvertColors] = useState<boolean>(false);
	const [activeTool, setActiveTool] = useState<"select" | "ruler" | "angle">("select");
	const [rulers, setRulers] = useState<RulerMeasurement[]>([]);
	const [angles, setAngles] = useState<AngleMeasurement[]>([]);
	const [probedHU, setProbedHU] = useState<number | null>(750);
	const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

	const handleReset = useCallback(() => {
		setIsSharpenActive(false);
		setIsInvertColors(false);
		setActiveTool("select");
		setRulers([]);
		setAngles([]);
		setActivePreset("bone");
		setSliceThicknessMm(initialThickness > 0 ? initialThickness : 1.0);
		showToast("Визуализация сброшена", "info");
	}, [initialThickness]);

	return {
		activePreset, setActivePreset, viewMode, setViewMode, crossSectionStepMm,
		setCrossSectionStepMm, sliceThicknessMm, setSliceThicknessMm, activeCrossSectionIdx,
		setActiveCrossSectionIdx, isSharpenActive, setIsSharpenActive, isInvertColors,
		setIsInvertColors, activeTool, setActiveTool, rulers, setRulers, angles, setAngles,
		probedHU, setProbedHU, cursorPos, setCursorPos, handleReset,
	};
}
