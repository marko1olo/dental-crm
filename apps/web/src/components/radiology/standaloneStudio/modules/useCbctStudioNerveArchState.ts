/**
 * useCbctStudioNerveArchState.ts — Состояние трассировки нерва и зубной дуги (Мандат 8b).
 */

import { useCallback, useState } from "react";
import type { CbctVoxelVolume, Point3D } from "../../cbctMprMath";
import {
	autoDetectDentalArch,
	buildDentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	type DentalArchCurve,
} from "../../dentalCurveEngine";

export function useCbctStudioNerveArchState() {
	const [nervePoints, setNervePoints] = useState<Point3D[]>([]);
	const [selectedNerveNodeIdx, setSelectedNerveNodeIdx] = useState<number | null>(null);
	const [showDentalArch, setShowDentalArch] = useState<boolean>(true);
	const [jawType, setJawType] = useState<"mandible" | "maxilla">("mandible");

	const [archCurve, setArchCurve] = useState<DentalArchCurve>(() =>
		buildDentalArchCurve(DEFAULT_MANDIBULAR_ARCH_ANCHORS, "mandible"),
	);

	const handleAutoDetectArch = useCallback((volume?: CbctVoxelVolume | null) => {
		if (!volume) return;
		try {
			const detected = autoDetectDentalArch(volume, jawType);
			if (detected) setArchCurve(detected);
		} catch {
			// Soft fallback if volume is invalid
		}
	}, [jawType]);

	const handleSwitchJaw = useCallback((jaw: "mandible" | "maxilla") => {
		setJawType(jaw);
	}, []);

	return {
		nervePoints,
		setNervePoints,
		selectedNerveNodeIdx,
		setSelectedNerveNodeIdx,
		showDentalArch,
		setShowDentalArch,
		jawType,
		archCurve,
		setArchCurve,
		handleAutoDetectArch,
		handleSwitchJaw,
	};
}
