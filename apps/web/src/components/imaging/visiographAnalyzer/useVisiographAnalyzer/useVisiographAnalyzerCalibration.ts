import { useCallback, useState } from "react";
import { showToast } from "../../../GlobalToast.js";
import type { VisiographScaleCalibration } from "../types.js";

export function useVisiographAnalyzerCalibration(toothCode?: string | null) {
	const [calibration, setCalibration] = useState<VisiographScaleCalibration>({
		standardReferenceMm: 5.0,
		pixelsPerMm: 28.57, // ~35 µm standard RVG pitch
		mmPerPixel: 0.035,
		isCalibrated: true,
	});

	const [workingLengthMm, setWorkingLengthMm] = useState<number | null>(null);

	const handleMeasureWorkingLength = useCallback(
		(lengthMm: number) => {
			const rounded = Math.round(lengthMm * 10) / 10;
			setWorkingLengthMm(rounded);
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dente-endo-wl-measured", {
						detail: {
							toothNumber: toothCode ? Number(toothCode) : 16,
							lengthMm: rounded,
						},
					}),
				);
			}
		},
		[toothCode],
	);

	const calibrateWithBall = useCallback((measuredBallDiameterPx: number) => {
		if (measuredBallDiameterPx > 0) {
			const pxPerMm = measuredBallDiameterPx / 5.0;
			setCalibration({
				standardReferenceMm: 5.0,
				pixelsPerMm: pxPerMm,
				mmPerPixel: 1 / pxPerMm,
				isCalibrated: true,
			});
			showToast(
				`Калибровка по шарику 5 мм выполнена (${pxPerMm.toFixed(1)} пкс/мм)`,
				"success",
			);
		}
	}, []);

	return {
		calibration,
		setCalibration,
		workingLengthMm,
		handleMeasureWorkingLength,
		calibrateWithBall,
	};
}
