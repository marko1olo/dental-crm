import { angle3Points, dotProduct, projectPointOntoLine, vector, vectorLength } from "./geometry";
import type { CephalometricMeasurement, LandmarkMap, Point2D } from "./types";

export interface SteinerSkeletalResult {
	measurements: CephalometricMeasurement[];
	snaVal: number | null;
	snaInterp: string;
	snbVal: number | null;
	snbInterp: string;
	anbVal: number | null;
	anbInterp: string;
	witsVal: number | null;
	witsInterp: string;
}

export function calculateSteinerAndWits(landmarks: LandmarkMap, scaleMmPerPixel: number): SteinerSkeletalResult {
	const S = landmarks.S;
	const N = landmarks.N;
	const A = landmarks.A;
	const B = landmarks.B;
	const ANS = landmarks.ANS;
	const Me = landmarks.Me ?? landmarks.Gn;
	const PNS = landmarks.PNS;
	const Go = landmarks.Go;
	const U1t = landmarks.U1t;
	const L1t = landmarks.L1t;

	const measurements: CephalometricMeasurement[] = [];

	// SNA Angle
	let snaVal: number | null = null;
	let snaStatus: CephalometricMeasurement["status"] = "pending";
	let snaInterp = "Требуется установка точек S, N, A";
	if (S && N && A) {
		snaVal = Number(angle3Points(S, N, A).toFixed(1));
		snaStatus = snaVal > 84 ? "increased" : snaVal < 80 ? "decreased" : "normal";
		snaInterp = snaStatus === "increased" ? "Верхнечелюстная прогнатия" : snaStatus === "decreased" ? "Верхнечелюстная ретрогнатия" : "Ортогнатическое положение ВЧ";
	}
	measurements.push({
		id: "SNA", name: "Угол SNA (Положение верхней челюсти)", symbol: "SNA", category: "sagittal",
		value: snaVal, unit: "°", normMin: 80, normMax: 84, normMean: 82, normText: "82° ± 2°",
		status: snaStatus, clinicalInterpretation: snaInterp, method: "Steiner",
	});

	// SNB Angle
	let snbVal: number | null = null;
	let snbStatus: CephalometricMeasurement["status"] = "pending";
	let snbInterp = "Требуется установка точек S, N, B";
	if (S && N && B) {
		snbVal = Number(angle3Points(S, N, B).toFixed(1));
		snbStatus = snbVal > 82 ? "increased" : snbVal < 78 ? "decreased" : "normal";
		snbInterp = snbStatus === "increased" ? "Нижнечелюстная прогнатия" : snbStatus === "decreased" ? "Нижнечелюстная ретрогнатия" : "Ортогнатическое положение НЧ";
	}
	measurements.push({
		id: "SNB", name: "Угол SNB (Положение нижней челюсти)", symbol: "SNB", category: "sagittal",
		value: snbVal, unit: "°", normMin: 78, normMax: 82, normMean: 80, normText: "80° ± 2°",
		status: snbStatus, clinicalInterpretation: snbInterp, method: "Steiner",
	});

	// ANB Angle
	let anbVal: number | null = null;
	let anbStatus: CephalometricMeasurement["status"] = "pending";
	let anbInterp = "Требуется расчет углов SNA и SNB";
	if (snaVal !== null && snbVal !== null) {
		anbVal = Number((snaVal - snbVal).toFixed(1));
		anbStatus = anbVal > 4.0 ? "increased" : anbVal < 0.0 ? "decreased" : "normal";
		anbInterp = anbStatus === "increased" ? "Скелетный класс II" : anbStatus === "decreased" ? "Скелетный класс III" : "Скелетный класс I";
	}
	measurements.push({
		id: "ANB", name: "Угол ANB (Скелетный класс)", symbol: "ANB", category: "sagittal",
		value: anbVal, unit: "°", normMin: 0, normMax: 4, normMean: 2, normText: "2° ± 2°",
		status: anbStatus, clinicalInterpretation: anbInterp, method: "Steiner",
	});

	// Wits Appraisal
	let witsVal: number | null = null;
	let witsStatus: CephalometricMeasurement["status"] = "pending";
	let witsInterp = "Требуется установка точек A, B, U1, L1";
	if (A && B && (U1t || ANS) && (L1t || Me)) {
		const opAnt: Point2D = U1t && L1t ? { x: (U1t.x + L1t.x) / 2, y: (U1t.y + L1t.y) / 2 } : { x: (A.x + B.x) / 2 + 50, y: (A.y + B.y) / 2 };
		const opPost: Point2D = PNS && Go ? { x: (PNS.x + Go.x) / 2, y: (PNS.y + Go.y) / 2 } : { x: opAnt.x - 150, y: opAnt.y - 10 };
		const projA = projectPointOntoLine(A, opPost, opAnt);
		const projB = projectPointOntoLine(B, opPost, opAnt);
		const opVec = vector(opPost, opAnt);
		const opLen = vectorLength(opVec);
		if (opLen > 0) {
			const distPx = dotProduct(vector(projB, projA), { x: opVec.x / opLen, y: opVec.y / opLen });
			witsVal = Number((distPx * scaleMmPerPixel).toFixed(1));
			witsStatus = witsVal > 2.0 ? "increased" : witsVal < -2.0 ? "decreased" : "normal";
			witsInterp = witsStatus === "increased" ? "Скелетный класс II (базис A кпереди)" : witsStatus === "decreased" ? "Скелетный класс III (базис B кпереди)" : "Скелетный класс I";
		}
	}
	measurements.push({
		id: "Wits", name: "Wits-число (Jacobson)", symbol: "Wits", category: "sagittal",
		value: witsVal, unit: "mm", normMin: -1, normMax: 1, normMean: 0, normText: "0 ± 1 мм",
		status: witsStatus, clinicalInterpretation: witsInterp, method: "Jacobson",
	});

	return { measurements, snaVal, snaInterp, snbVal, snbInterp, anbVal, anbInterp, witsVal, witsInterp };
}
