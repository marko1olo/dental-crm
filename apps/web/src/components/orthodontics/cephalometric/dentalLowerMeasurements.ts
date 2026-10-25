import { angleBetweenLines, angleBetweenVectors, distance, projectPointOntoLine, vector } from "./geometry";
import type { CephalometricMeasurement, LandmarkMap } from "./types";

export function calculateLowerDentalMeasurements(
	landmarks: LandmarkMap,
	scaleMmPerPixel: number,
) {
	const { N, B, Go, L1t, L1a } = landmarks;
	const Me = landmarks.Me ?? landmarks.Gn;

	let l1MpVal: number | null = null;
	let l1MpStatus: CephalometricMeasurement["status"] = "pending";
	let l1MpInterp = "Требуется установка Go, Me, L1t, L1a";
	if (Go && Me && L1t && L1a) {
		const l1Vec = vector(L1a, L1t);
		const mpVec = vector(Go, Me);
		l1MpVal = Number(angleBetweenVectors(l1Vec, mpVec).toFixed(1));
		l1MpStatus = l1MpVal > 93 ? "increased" : l1MpVal < 87 ? "decreased" : "normal";
		l1MpInterp = l1MpVal > 93
			? "Протрузия (вестибулярный наклон) резцов НЧ к мандибулярной плоскости (IMPA > 93°)"
			: l1MpVal < 87
				? "Ретрузия (лингвальный наклон) резцов НЧ к плоскости MP (IMPA < 87°)"
				: "Нормальный торк резцов НЧ (IMPA 90° ± 3°)";
	}

	let l1NbAngleVal: number | null = null;
	let l1NbAngleStatus: CephalometricMeasurement["status"] = "pending";
	let l1NbAngleInterp = "Требуется установка точек N, B, L1t, L1a";
	if (N && B && L1t && L1a) {
		const rawAngle = angleBetweenLines(N, B, L1a, L1t);
		l1NbAngleVal = Number((rawAngle > 90 ? 180 - rawAngle : rawAngle).toFixed(1));
		l1NbAngleStatus = l1NbAngleVal > 27 ? "increased" : l1NbAngleVal < 23 ? "decreased" : "normal";
		l1NbAngleInterp = l1NbAngleVal > 27 ? "Протрузия к N-B" : l1NbAngleVal < 23 ? "Ретрузия к N-B" : "Нормальная инклинация к N-B";
	}

	let l1NbDistVal: number | null = null;
	let l1NbDistStatus: CephalometricMeasurement["status"] = "pending";
	let l1NbDistInterp = "Требуется установка точек N, B, L1t";
	if (N && B && L1t) {
		const projL1 = projectPointOntoLine(L1t, N, B);
		const distPx = distance(L1t, projL1);
		const isAnterior = L1t.x >= projL1.x;
		l1NbDistVal = Number(((isAnterior ? distPx : -distPx) * scaleMmPerPixel).toFixed(1));
		l1NbDistStatus = l1NbDistVal > 5.0 ? "increased" : l1NbDistVal < 3.0 ? "decreased" : "normal";
		l1NbDistInterp = l1NbDistVal > 5.0 ? "Протрузия к N-B" : l1NbDistVal < 3.0 ? "Ретрузия к N-B" : "Нормальное положение к N-B";
	}

	const measurements: CephalometricMeasurement[] = [
		{
			id: "L1-MP",
			name: "Угол L1-MP / IMPA (Tweed - Резцы к основанию НЧ)",
			symbol: "IMPA (L1-MP)",
			category: "dental",
			value: l1MpVal,
			unit: "°",
			normMin: 87,
			normMax: 93,
			normMean: 90,
			normText: "90° ± 3°",
			status: l1MpStatus,
			clinicalInterpretation: l1MpInterp,
			method: "Tweed",
		},
		{
			id: "1-NB-Angle",
			name: "Угол 1-NB (Инклинация к N-B / Steiner)",
			symbol: "1-NB (°)",
			category: "dental",
			value: l1NbAngleVal,
			unit: "°",
			normMin: 23,
			normMax: 27,
			normMean: 25,
			normText: "25° ± 2°",
			status: l1NbAngleStatus,
			clinicalInterpretation: l1NbAngleInterp,
			method: "Steiner",
		},
		{
			id: "1-NB-Dist",
			name: "Расстояние 1-NB (Положение к N-B / Steiner)",
			symbol: "1-NB (мм)",
			category: "dental",
			value: l1NbDistVal,
			unit: "mm",
			normMin: 3.0,
			normMax: 5.0,
			normMean: 4.0,
			normText: "4 ± 1 мм",
			status: l1NbDistStatus,
			clinicalInterpretation: l1NbDistInterp,
			method: "Steiner",
		},
	];

	return {
		measurements,
		l1MpVal,
		l1MpInterp,
		l1NbAngleVal,
		l1NbAngleInterp,
		l1NbDistVal,
		l1NbDistInterp,
	};
}
