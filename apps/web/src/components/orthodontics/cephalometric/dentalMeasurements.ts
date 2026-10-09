/**
 * DENTE CRM — Cephalometric Dental & Incisor Measurements (Layer 2)
 * Pure measurement calculator for Steiner and Tweed dental parameters: U1-SN, 1-NA, L1-MP, 1-NB, U1-L1.
 */

import {
	angleBetweenLines,
	angleBetweenVectors,
	distance,
	projectPointOntoLine,
	vector,
} from "./geometry";
import type {
	CephalometricMeasurement,
	LandmarkMap,
} from "./types";

export interface DentalMeasurementsResult {
	measurements: CephalometricMeasurement[]; // 12..18: U1-SN, 1-NA-Angle, 1-NA-Dist, L1-MP, 1-NB-Angle, 1-NB-Dist, U1-L1
	u1SnVal: number | null;
	u1SnInterp: string;
	u1NaAngleVal: number | null;
	u1NaAngleInterp: string;
	u1NaDistVal: number | null;
	u1NaDistInterp: string;
	l1MpVal: number | null;
	l1MpInterp: string;
	l1NbAngleVal: number | null;
	l1NbAngleInterp: string;
	l1NbDistVal: number | null;
	l1NbDistInterp: string;
	u1L1Val: number | null;
	u1L1Interp: string;
}

export function calculateDentalMeasurements(
	landmarks: LandmarkMap,
	scaleMmPerPixel: number,
): DentalMeasurementsResult {
	const S = landmarks.S;
	const N = landmarks.N;
	const A = landmarks.A;
	const B = landmarks.B;
	const Go = landmarks.Go;
	const Gn = landmarks.Gn ?? landmarks.Me;
	const Me = landmarks.Me ?? landmarks.Gn;
	const U1t = landmarks.U1t;
	const U1a = landmarks.U1a;
	const L1t = landmarks.L1t;
	const L1a = landmarks.L1a;

	const measurements: CephalometricMeasurement[] = [];

	// 12. U1-SN Angle (Steiner - Upper Incisor to SN) - Norm: 104° ± 2°
	let u1SnVal: number | null = null;
	let u1SnStatus: CephalometricMeasurement["status"] = "pending";
	let u1SnInterp = "Требуется установка S, N, U1t, U1a";
	if (S && N && U1t && U1a) {
		// Inferior-posterior angle between U1 axis (apex to tip) and S-N
		const u1Vec = vector(U1a, U1t);
		const snVec = vector(N, S); // pointing posteriorly
		u1SnVal = Number(angleBetweenVectors(u1Vec, snVec).toFixed(1));
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
	measurements.push({
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
	});

	// 12a. 1-NA Angle (Steiner - Upper Incisor to N-A line) - Norm: 22° ± 2° (20° to 24°)
	let u1NaAngleVal: number | null = null;
	let u1NaAngleStatus: CephalometricMeasurement["status"] = "pending";
	let u1NaAngleInterp = "Требуется установка точек N, A, U1t, U1a";
	if (N && A && U1t && U1a) {
		const rawAngle = angleBetweenLines(N, A, U1a, U1t);
		u1NaAngleVal = Number((rawAngle > 90 ? 180 - rawAngle : rawAngle).toFixed(1));
		if (u1NaAngleVal > 24) {
			u1NaAngleStatus = "increased";
			u1NaAngleInterp = "Протрузия (вестибулярный наклон) верхних резцов к линии N-A";
		} else if (u1NaAngleVal < 20) {
			u1NaAngleStatus = "decreased";
			u1NaAngleInterp = "Ретрузия (нёбный наклон) верхних резцов к линии N-A";
		} else {
			u1NaAngleStatus = "normal";
			u1NaAngleInterp = "Нормальная инклинация верхних резцов относительно N-A";
		}
	}
	measurements.push({
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
	});

	// 12b. 1-NA Distance (Steiner - Upper Incisor tip to N-A line) - Norm: 4 ± 1 mm (3 to 5 mm)
	let u1NaDistVal: number | null = null;
	let u1NaDistStatus: CephalometricMeasurement["status"] = "pending";
	let u1NaDistInterp = "Требуется установка точек N, A, U1t";
	if (N && A && U1t) {
		const projU1 = projectPointOntoLine(U1t, N, A);
		const distPx = distance(U1t, projU1);
		const isAnterior = U1t.x >= projU1.x;
		u1NaDistVal = Number(((isAnterior ? distPx : -distPx) * scaleMmPerPixel).toFixed(1));
		if (u1NaDistVal > 5.0) {
			u1NaDistStatus = "increased";
			u1NaDistInterp = "Протрузия (переднее положение) коронки верхнего резца относительно N-A";
		} else if (u1NaDistVal < 3.0) {
			u1NaDistStatus = "decreased";
			u1NaDistInterp = "Ретрузия (дистальное положение) коронки верхнего резца относительно N-A";
		} else {
			u1NaDistStatus = "normal";
			u1NaDistInterp = "Нормальное сагиттальное положение коронки верхнего резца относительно N-A";
		}
	}
	measurements.push({
		id: "1-NA-Dist",
		name: "Расстояние 1-NA (Положение резца к N-A / Steiner)",
		symbol: "1-NA (мм)",
		category: "linear",
		value: u1NaDistVal,
		unit: "mm",
		normMin: 3,
		normMax: 5,
		normMean: 4,
		normText: "4 ± 1 мм",
		status: u1NaDistStatus,
		clinicalInterpretation: u1NaDistInterp,
		method: "Steiner",
	});

	// 13. L1-MP / IMPA (Tweed / Steiner - Lower Incisor to Mandibular Plane) - Norm: 90° ± 3°
	let l1MpVal: number | null = null;
	let l1MpStatus: CephalometricMeasurement["status"] = "pending";
	let l1MpInterp = "Требуется установка Go, Me/Gn, L1t, L1a";
	if (Go && (Me || Gn) && L1t && L1a) {
		const antMand = Me ?? Gn;
		if (antMand) {
			const l1Vec = vector(L1a, L1t); // pointing superiorly
			const mpVec = vector(antMand, Go); // pointing posteriorly
			l1MpVal = Number(angleBetweenVectors(l1Vec, mpVec).toFixed(1));
			if (l1MpVal > 93) {
				l1MpStatus = "increased";
				l1MpInterp = "Протрузия (вестибулярный наклон) нижних резцов";
			} else if (l1MpVal < 87) {
				l1MpStatus = "decreased";
				l1MpInterp = "Ретрузия (лингвальный наклон) нижних резцов";
			} else {
				l1MpStatus = "normal";
				l1MpInterp = "Нормальный наклон нижних резцов (IMPA в норме)";
			}
		}
	}
	measurements.push({
		id: "L1-MP",
		name: "Угол L1-MP / IMPA (Наклон нижних резцов)",
		symbol: "L1-MP",
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
	});

	// 13a. 1-NB Angle (Steiner - Lower Incisor to N-B line) - Norm: 25° ± 2° (23° to 27°)
	let l1NbAngleVal: number | null = null;
	let l1NbAngleStatus: CephalometricMeasurement["status"] = "pending";
	let l1NbAngleInterp = "Требуется установка точек N, B, L1t, L1a";
	if (N && B && L1t && L1a) {
		const rawAngle = angleBetweenLines(N, B, L1a, L1t);
		l1NbAngleVal = Number((rawAngle > 90 ? 180 - rawAngle : rawAngle).toFixed(1));
		if (l1NbAngleVal > 27) {
			l1NbAngleStatus = "increased";
			l1NbAngleInterp = "Протрузия (вестибулярный наклон) нижних резцов к линии N-B";
		} else if (l1NbAngleVal < 23) {
			l1NbAngleStatus = "decreased";
			l1NbAngleInterp = "Ретрузия (язычный наклон) нижних резцов к линии N-B";
		} else {
			l1NbAngleStatus = "normal";
			l1NbAngleInterp = "Нормальная инклинация нижних резцов относительно N-B";
		}
	}
	measurements.push({
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
	});

	// 13b. 1-NB Distance (Steiner - Lower Incisor tip to N-B line) - Norm: 4 ± 1 mm (3 to 5 mm)
	let l1NbDistVal: number | null = null;
	let l1NbDistStatus: CephalometricMeasurement["status"] = "pending";
	let l1NbDistInterp = "Требуется установка точек N, B, L1t";
	if (N && B && L1t) {
		const projL1 = projectPointOntoLine(L1t, N, B);
		const distPx = distance(L1t, projL1);
		const isAnterior = L1t.x >= projL1.x;
		l1NbDistVal = Number(((isAnterior ? distPx : -distPx) * scaleMmPerPixel).toFixed(1));
		if (l1NbDistVal > 5.0) {
			l1NbDistStatus = "increased";
			l1NbDistInterp = "Протрузия коронки нижнего резца относительно базиса N-B";
		} else if (l1NbDistVal < 3.0) {
			l1NbDistStatus = "decreased";
			l1NbDistInterp = "Ретрузия коронки нижнего резца относительно базиса N-B";
		} else {
			l1NbDistStatus = "normal";
			l1NbDistInterp = "Нормальное сагиттальное положение коронки нижнего резца";
		}
	}
	measurements.push({
		id: "1-NB-Dist",
		name: "Расстояние 1-NB (Положение резца к N-B / Steiner)",
		symbol: "1-NB (мм)",
		category: "linear",
		value: l1NbDistVal,
		unit: "mm",
		normMin: 3,
		normMax: 5,
		normMean: 4,
		normText: "4 ± 1 мм",
		status: l1NbDistStatus,
		clinicalInterpretation: l1NbDistInterp,
		method: "Steiner",
	});

	// 14. Interincisal Angle (U1-L1) - Norm: 131° ± 5° (126° - 136°)
	let u1L1Val: number | null = null;
	let u1L1Status: CephalometricMeasurement["status"] = "pending";
	let u1L1Interp = "Требуется установка U1 и L1";
	if (U1t && U1a && L1t && L1a) {
		u1L1Val = Number(angleBetweenLines(U1a, U1t, L1a, L1t).toFixed(1));
		if (u1L1Val < 126) {
			u1L1Status = "decreased";
			u1L1Interp = "Бипротрузия резцов (уменьшенный межрезцовый угол)";
		} else if (u1L1Val > 136) {
			u1L1Status = "increased";
			u1L1Interp = "Биретрузия резцов / отвесный прикус (увеличенный угол)";
		} else {
			u1L1Status = "normal";
			u1L1Interp = "Гармоничное межрезцовое соотношение";
		}
	}
	measurements.push({
		id: "U1-L1",
		name: "Межрезцовый угол (U1-L1)",
		symbol: "U1-L1",
		category: "dental",
		value: u1L1Val,
		unit: "°",
		normMin: 126,
		normMax: 136,
		normMean: 131,
		normText: "131° ± 5°",
		status: u1L1Status,
		clinicalInterpretation: u1L1Interp,
		method: "Steiner",
	});

	return {
		measurements,
		u1SnVal,
		u1SnInterp,
		u1NaAngleVal,
		u1NaAngleInterp,
		u1NaDistVal,
		u1NaDistInterp,
		l1MpVal,
		l1MpInterp,
		l1NbAngleVal,
		l1NbAngleInterp,
		l1NbDistVal,
		l1NbDistInterp,
		u1L1Val,
		u1L1Interp,
	};
}
