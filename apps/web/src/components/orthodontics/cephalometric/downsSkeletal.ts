import { angle3Points, angleBetweenLines } from "./geometry";
import type { CephalometricMeasurement, LandmarkMap, Point2D } from "./types";

export interface DownsSkeletalResult {
	measurements: CephalometricMeasurement[];
	facialAngleVal: number | null;
	facialAngleInterp: string;
	convexityVal: number | null;
	convexityInterp: string;
	abPlaneVal: number | null;
	abPlaneInterp: string;
	yAxisVal: number | null;
	yAxisInterp: string;
	cantOpVal: number | null;
	cantOpInterp: string;
}

export function calculateDownsSkeletal(landmarks: LandmarkMap): DownsSkeletalResult {
	const S = landmarks.S;
	const N = landmarks.N;
	const Or = landmarks.Or;
	const Po = landmarks.Po;
	const A = landmarks.A;
	const B = landmarks.B;
	const Pog = landmarks.Pog;
	const Gn = landmarks.Gn ?? landmarks.Me;
	const Me = landmarks.Me ?? landmarks.Gn;
	const Go = landmarks.Go;
	const ANS = landmarks.ANS;
	const PNS = landmarks.PNS;
	const U1t = landmarks.U1t;
	const L1t = landmarks.L1t;

	const measurements: CephalometricMeasurement[] = [];
	const hasFrankfort = Boolean(Po && Or);
	const fhStart: Point2D | null = hasFrankfort ? Po! : (S && N ? S : null);
	const fhEnd: Point2D | null = hasFrankfort ? Or! : (S && N ? N : null);

	// Facial Angle (Downs-FA)
	let facialAngleVal: number | null = null;
	let facialAngleStatus: CephalometricMeasurement["status"] = "pending";
	let facialAngleInterp = "Требуется установка N, Pog, Po, Or";
	if (N && Pog && fhStart && fhEnd) {
		facialAngleVal = Number(angleBetweenLines(fhStart, fhEnd, N, Pog).toFixed(1));
		facialAngleStatus = facialAngleVal > 91.4 ? "increased" : facialAngleVal < 84.2 ? "decreased" : "normal";
		facialAngleInterp = facialAngleStatus === "increased" ? "Скелетная прогнатия НЧ" : facialAngleStatus === "decreased" ? "Скелетная ретрогнатия НЧ" : "Гармоничный подбородок";
	}
	measurements.push({
		id: "Downs-FA", name: "Лицевой угол (Downs FA)", symbol: "FA", category: "sagittal",
		value: facialAngleVal, unit: "°", normMin: 84.2, normMax: 91.4, normMean: 87.8, normText: "87.8° ± 3.6°",
		status: facialAngleStatus, clinicalInterpretation: facialAngleInterp, method: "Downs",
	});

	// Angle of Convexity (Downs-Conv)
	let convexityVal: number | null = null;
	let convexityStatus: CephalometricMeasurement["status"] = "pending";
	let convexityInterp = "Требуется установка N, A, Pog";
	if (N && A && Pog) {
		convexityVal = Number((180 - angle3Points(N, A, Pog)).toFixed(1));
		convexityStatus = convexityVal > 5.1 ? "increased" : convexityVal < -5.1 ? "decreased" : "normal";
		convexityInterp = convexityStatus === "increased" ? "Выпуклый профиль" : convexityStatus === "decreased" ? "Вогнутый профиль" : "Прямой профиль";
	}
	measurements.push({
		id: "Downs-Conv", name: "Угол выпуклости профиля (Downs)", symbol: "NAPog", category: "sagittal",
		value: convexityVal, unit: "°", normMin: -5.1, normMax: 5.1, normMean: 0, normText: "0° ± 5.1°",
		status: convexityStatus, clinicalInterpretation: convexityInterp, method: "Downs",
	});

	// A-B Plane Angle (Downs-AB)
	let abPlaneVal: number | null = null;
	let abPlaneStatus: CephalometricMeasurement["status"] = "pending";
	let abPlaneInterp = "Требуется установка N, Pog, A, B";
	if (N && Pog && A && B) {
		abPlaneVal = Number(angleBetweenLines(N, Pog, A, B).toFixed(1));
		abPlaneStatus = abPlaneVal > 0 ? "increased" : abPlaneVal < -9.2 ? "decreased" : "normal";
		abPlaneInterp = abPlaneStatus === "decreased" ? "Дисгармония базисов" : "Нормальное соотношение апикальных базисов";
	}
	measurements.push({
		id: "Downs-AB", name: "Угол A-B к N-Pog (Downs)", symbol: "AB-NPog", category: "sagittal",
		value: abPlaneVal, unit: "°", normMin: -9.2, normMax: 0, normMean: -4.6, normText: "-4.6° ± 4.6°",
		status: abPlaneStatus, clinicalInterpretation: abPlaneInterp, method: "Downs",
	});

	// Y-Axis (Downs-YAxis)
	let yAxisVal: number | null = null;
	let yAxisStatus: CephalometricMeasurement["status"] = "pending";
	let yAxisInterp = "Требуется установка S, Gn/Me, Po, Or";
	if (S && (Gn || Me) && fhStart && fhEnd) {
		yAxisVal = Number(angleBetweenLines(fhStart, fhEnd, S, Gn || Me!).toFixed(1));
		yAxisStatus = yAxisVal > 63 ? "increased" : yAxisVal < 55 ? "decreased" : "normal";
		yAxisInterp = yAxisStatus === "increased" ? "Вертикальный тип роста" : yAxisStatus === "decreased" ? "Горизонтальный тип роста" : "Нейтральный тип роста";
	}
	measurements.push({
		id: "Downs-YAxis", name: "Y-ось роста (Downs SGn-FH)", symbol: "Y-Axis", category: "vertical",
		value: yAxisVal, unit: "°", normMin: 55, normMax: 63, normMean: 59.4, normText: "59.4° ± 3.8°",
		status: yAxisStatus, clinicalInterpretation: yAxisInterp, method: "Downs",
	});

	// Cant of Occlusal Plane (Downs-CantOP)
	let cantOpVal: number | null = null;
	let cantOpStatus: CephalometricMeasurement["status"] = "pending";
	let cantOpInterp = "Требуется окклюзионная плоскость и FH";
	if (fhStart && fhEnd && (U1t || ANS) && (PNS || Go)) {
		const opA: Point2D = U1t && L1t ? { x: (U1t.x + L1t.x) / 2, y: (U1t.y + L1t.y) / 2 } : { x: (ANS?.x ?? 0), y: (ANS?.y ?? 0) };
		const opP: Point2D = PNS && Go ? { x: (PNS.x + Go.x) / 2, y: (PNS.y + Go.y) / 2 } : { x: opA.x - 100, y: opA.y };
		cantOpVal = Number(angleBetweenLines(fhStart, fhEnd, opP, opA).toFixed(1));
		cantOpStatus = cantOpVal > 14 ? "increased" : cantOpVal < 5 ? "decreased" : "normal";
		cantOpInterp = cantOpStatus === "increased" ? "Крутая окклюзионная плоскость" : cantOpStatus === "decreased" ? "Уплощенная плоскость" : "Нормальный наклон OP";
	}
	measurements.push({
		id: "Downs-CantOP", name: "Наклон окклюзионной плоскости (Cant of OP)", symbol: "OP-FH", category: "vertical",
		value: cantOpVal, unit: "°", normMin: 5, normMax: 14, normMean: 9.3, normText: "9.3° ± 4.5°",
		status: cantOpStatus, clinicalInterpretation: cantOpInterp, method: "Downs",
	});

	return { measurements, facialAngleVal, facialAngleInterp, convexityVal, convexityInterp, abPlaneVal, abPlaneInterp, yAxisVal, yAxisInterp, cantOpVal, cantOpInterp };
}
