import { angleBetweenLines } from "./geometry";
import type { CephalometricMeasurement, LandmarkMap } from "./types";

export function calculateInterincisalMeasurements(landmarks: LandmarkMap) {
	const { U1t, U1a, L1t, L1a } = landmarks;

	let u1L1Val: number | null = null;
	let u1L1Status: CephalometricMeasurement["status"] = "pending";
	let u1L1Interp = "Требуется установка U1t, U1a, L1t, L1a";
	if (U1t && U1a && L1t && L1a) {
		const rawAngle = angleBetweenLines(U1a, U1t, L1a, L1t);
		u1L1Val = Number((rawAngle < 90 ? 180 - rawAngle : rawAngle).toFixed(1));
		if (u1L1Val > 137) {
			u1L1Status = "increased";
			u1L1Interp = "Увеличенный межрезцовый угол (биретрузия резцов)";
		} else if (u1L1Val < 125) {
			u1L1Status = "decreased";
			u1L1Interp = "Уменьшенный межрезцовый угол (бипротрузия резцов)";
		} else {
			u1L1Status = "normal";
			u1L1Interp = "Нормальный межрезцовый угол";
		}
	}

	const measurement: CephalometricMeasurement = {
		id: "U1-L1",
		name: "Межрезцовый угол U1-L1",
		symbol: "U1-L1",
		category: "dental",
		value: u1L1Val,
		unit: "°",
		normMin: 125,
		normMax: 137,
		normMean: 131,
		normText: "131° ± 6°",
		status: u1L1Status,
		clinicalInterpretation: u1L1Interp,
		method: "Steiner",
	};

	return {
		measurement,
		u1L1Val,
		u1L1Interp,
	};
}
