import { angleBetweenLines, angleBetweenVectors, distance, projectPointOntoLine, vector } from "./geometry";
import type { CephalometricMeasurement, LandmarkMap } from "./types";

export function calculateUpperDentalMeasurements(
	landmarks: LandmarkMap,
	scaleMmPerPixel: number,
) {
	const { S, N, A, U1t, U1a } = landmarks;

	let u1SnVal: number | null = null;
	let u1SnStatus: CephalometricMeasurement["status"] = "pending";
	let u1SnInterp = "Требуется установка S, N, U1t, U1a";
	if (S && N && U1t && U1a) {
		u1SnVal = Number(angleBetweenVectors(vector(U1a, U1t), vector(N, S)).toFixed(1));
		if (u1SnVal > 106) {
			u1SnStatus = "increased";
			u1SnInterp = "Протрузия (вестибулярный наклон) верхних резцов";
		} else if (u1SnVal < 102) {
			u1SnStatus = "decreased";
			u1SnInterp = "Ретрузия (палатинальный наклон) верхних резцов";
		} else {
			u1SnStatus = "normal";
			u1SnInterp = "Нормальный торк / инклинация верхних резцов";
		}
	}

	let u1NaAngleVal: number | null = null;
	let u1NaAngleStatus: CephalometricMeasurement["status"] = "pending";
	let u1NaAngleInterp = "Требуется установка точек N, A, U1t, U1a";
	if (N && A && U1t && U1a) {
		const rawAngle = angleBetweenLines(N, A, U1a, U1t);
		u1NaAngleVal = Number((rawAngle > 90 ? 180 - rawAngle : rawAngle).toFixed(1));
		u1NaAngleStatus = u1NaAngleVal > 24 ? "increased" : u1NaAngleVal < 20 ? "decreased" : "normal";
		u1NaAngleInterp = u1NaAngleVal > 24
			? "Протрузия к линии N-A"
			: u1NaAngleVal < 20
				? "Ретрузия к линии N-A"
				: "Нормальная инклинация к N-A";
	}

	let u1NaDistVal: number | null = null;
	let u1NaDistStatus: CephalometricMeasurement["status"] = "pending";
	let u1NaDistInterp = "Требуется установка точек N, A, U1t";
	if (N && A && U1t) {
		const projU1 = projectPointOntoLine(U1t, N, A);
		const distPx = distance(U1t, projU1);
		const isAnterior = U1t.x >= projU1.x;
		u1NaDistVal = Number(((isAnterior ? distPx : -distPx) * scaleMmPerPixel).toFixed(1));
		u1NaDistStatus = u1NaDistVal > 5.0 ? "increased" : u1NaDistVal < 3.0 ? "decreased" : "normal";
		u1NaDistInterp = u1NaDistVal > 5.0
			? "Протрузия коронки верхнего резца относительно N-A"
			: u1NaDistVal < 3.0
				? "Ретрузия коронки верхнего резца относительно N-A"
				: "Нормальное положение верхнего резца относительно N-A";
	}

	const measurements: CephalometricMeasurement[] = [
		{
			id: "U1-SN",
			name: "Угол U1-SN (Инклинация верхних резцов)",
			symbol: "U1-SN",
			category: "dental",
			value: u1SnVal,
			unit: "°",
			normMin: 102,
			normMax: 106,
			normMean: 104,
			normText: "104° ± 2°",
			status: u1SnStatus,
			clinicalInterpretation: u1SnInterp,
			method: "Steiner",
		},
		{
			id: "1-NA-Angle",
			name: "Угол 1-NA (Инклинация к N-A / Steiner)",
			symbol: "1-NA (°)",
			category: "dental",
			value: u1NaAngleVal,
			unit: "°",
			normMin: 20,
			normMax: 24,
			normMean: 22,
			normText: "22° ± 2°",
			status: u1NaAngleStatus,
			clinicalInterpretation: u1NaAngleInterp,
			method: "Steiner",
		},
		{
			id: "1-NA-Dist",
			name: "Расстояние 1-NA (Положение к N-A / Steiner)",
			symbol: "1-NA (мм)",
			category: "dental",
			value: u1NaDistVal,
			unit: "mm",
			normMin: 3.0,
			normMax: 5.0,
			normMean: 4.0,
			normText: "4 ± 1 мм",
			status: u1NaDistStatus,
			clinicalInterpretation: u1NaDistInterp,
			method: "Steiner",
		},
	];

	return {
		measurements,
		u1SnVal,
		u1SnInterp,
		u1NaAngleVal,
		u1NaAngleInterp,
		u1NaDistVal,
		u1NaDistInterp,
	};
}
