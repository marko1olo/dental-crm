import { angleBetweenLines, dotProduct, projectPointOntoLine, vector } from "./geometry";
import type { CephalometricMeasurement, LandmarkMap, Point2D } from "./types";

export interface VerticalSkeletalResult {
	measurementsPart1: CephalometricMeasurement[]; measurementsPart2: CephalometricMeasurement[];
	snGognVal: number | null; snGognInterp: string; fmaVal: number | null; fmaInterp: string;
	mmAngleVal: number | null; mmInterp: string; mcnamaraAVal: number | null; mcnamaraAInterp: string;
	mcnamaraPogVal: number | null; mcnamaraPogInterp: string;
}

export function calculateVerticalAndMcNamara(landmarks: LandmarkMap, scaleMmPerPixel: number): VerticalSkeletalResult {
	const { S, N, Or, Po, A, Pog, Go, ANS, PNS } = landmarks;
	const Gn = landmarks.Gn ?? landmarks.Me;
	const Me = landmarks.Me ?? landmarks.Gn;
	const measurementsPart1: CephalometricMeasurement[] = [];
	const measurementsPart2: CephalometricMeasurement[] = [];
	const hasFrankfort = Boolean(Po && Or);
	const fhStart: Point2D | null = hasFrankfort ? Po! : (S && N ? S : null);
	const fhEnd: Point2D | null = hasFrankfort ? Or! : (S && N ? N : null);

	// SN-GoGn
	let snGognVal: number | null = null;
	let snGognStatus: CephalometricMeasurement["status"] = "pending";
	let snGognInterp = "Требуется установка S, N, Go, Gn/Me";
	if (S && N && Go && (Gn || Me)) {
		snGognVal = Number(angleBetweenLines(S, N, Go, Gn || Me!).toFixed(1));
		snGognStatus = snGognVal > 36 ? "increased" : snGognVal < 28 ? "decreased" : "normal";
		snGognInterp = snGognStatus === "increased" ? "Гипердивергентный тип роста" : snGognStatus === "decreased" ? "Гиподивергентный тип роста" : "Нормодивергентный тип";
	}
	measurementsPart1.push({
		id: "SN-GoGn", name: "Угол наклона нижней челюсти (SN-GoGn)", symbol: "SN-GoGn", category: "vertical",
		value: snGognVal, unit: "°", normMin: 28, normMax: 36, normMean: 32, normText: "32° ± 4°",
		status: snGognStatus, clinicalInterpretation: snGognInterp, method: "Steiner",
	});

	// FMA
	let fmaVal: number | null = null;
	let fmaStatus: CephalometricMeasurement["status"] = "pending";
	let fmaInterp = "Требуется установка Po, Or, Go, Me";
	if (fhStart && fhEnd && Go && (Me || Gn)) {
		fmaVal = Number(angleBetweenLines(fhStart, fhEnd, Go, Me || Gn!).toFixed(1));
		fmaStatus = fmaVal > 29 ? "increased" : fmaVal < 21 ? "decreased" : "normal";
		fmaInterp = fmaStatus === "increased" ? "Высокий нижнечелюстной угол (Tweed)" : fmaStatus === "decreased" ? "Низкий угол" : "Нормодивергентный паттерн";
	}
	measurementsPart1.push({
		id: "FMA", name: "Нижнечелюстной угол Твида (FMA)", symbol: "FMA", category: "vertical",
		value: fmaVal, unit: "°", normMin: 21, normMax: 29, normMean: 25, normText: "25° ± 4°",
		status: fmaStatus, clinicalInterpretation: fmaInterp, method: "Tweed",
	});

	// NL-ML
	let mmAngleVal: number | null = null;
	let mmStatus: CephalometricMeasurement["status"] = "pending";
	let mmInterp = "Требуется установка ANS, PNS, Go, Gn/Me";
	if (ANS && PNS && Go && (Gn || Me)) {
		mmAngleVal = Number(angleBetweenLines(PNS, ANS, Go, Gn || Me!).toFixed(1));
		mmStatus = mmAngleVal > 25 ? "increased" : mmAngleVal < 15 ? "decreased" : "normal";
		mmInterp = mmStatus === "increased" ? "Вертикальный рост" : mmStatus === "decreased" ? "Горизонтальный рост" : "Нормодивергентный прикус";
	}
	measurementsPart2.push({
		id: "NL-ML", name: "Межчелюстной угол (NL-ML)", symbol: "NL-ML", category: "vertical",
		value: mmAngleVal, unit: "°", normMin: 15, normMax: 25, normMean: 20, normText: "20° ± 5°",
		status: mmStatus, clinicalInterpretation: mmInterp, method: "Ricketts",
	});

	// McNamara A & Pog to N-perp
	let mcnamaraAVal: number | null = null;
	let mcnamaraAStatus: CephalometricMeasurement["status"] = "pending";
	let mcnamaraAInterp = "Требуется N, A, Po, Or";
	let mcnamaraPogVal: number | null = null;
	let mcnamaraPogStatus: CephalometricMeasurement["status"] = "pending";
	let mcnamaraPogInterp = "Требуется N, Pog, Po, Or";
	if (N && fhStart && fhEnd) {
		const fhDx = fhEnd.x - fhStart.x;
		const fhDy = fhEnd.y - fhStart.y;
		const nPerpPoint: Point2D = { x: N.x - fhDy, y: N.y + fhDx };
		const len = Math.hypot(fhDx, fhDy);
		if (len > 0) {
			const unitFh = { x: fhDx / len, y: fhDy / len };
			if (A) {
				const projA = projectPointOntoLine(A, N, nPerpPoint);
				mcnamaraAVal = Number((dotProduct(vector(projA, A), unitFh) * scaleMmPerPixel).toFixed(1));
				mcnamaraAStatus = mcnamaraAVal > 2 ? "increased" : mcnamaraAVal < -2 ? "decreased" : "normal";
				mcnamaraAInterp = mcnamaraAStatus === "increased" ? "Верхнечелюстная прогнатия" : mcnamaraAStatus === "decreased" ? "Верхнечелюстная ретрогнатия" : "Ортогнатическое положение ВЧ";
			}
			if (Pog) {
				const projPog = projectPointOntoLine(Pog, N, nPerpPoint);
				mcnamaraPogVal = Number((dotProduct(vector(projPog, Pog), unitFh) * scaleMmPerPixel).toFixed(1));
				mcnamaraPogStatus = mcnamaraPogVal > 0 ? "increased" : mcnamaraPogVal < -4 ? "decreased" : "normal";
				mcnamaraPogInterp = mcnamaraPogStatus === "increased" ? "Прогения подбородка" : mcnamaraPogStatus === "decreased" ? "Ретрогения подбородка" : "Гармоничное положение подбородка";
			}
		}
	}
	measurementsPart2.push(
		{ id: "McNamara-A-Nperp", name: "Точка A к N-Perp (McNamara / A to N-perp)", symbol: "A to N-perp", category: "linear", value: mcnamaraAVal, unit: "mm", normMin: -2, normMax: 2, normMean: 0, normText: "0 ± 2 мм", status: mcnamaraAStatus, clinicalInterpretation: mcnamaraAInterp, method: "McNamara" },
		{ id: "McNamara-Pog-Nperp", name: "Погонион к N-Perp (McNamara / Pog to N-perp)", symbol: "Pog to N-perp", category: "linear", value: mcnamaraPogVal, unit: "mm", normMin: -4, normMax: 0, normMean: -2, normText: "-2 ± 2 мм", status: mcnamaraPogStatus, clinicalInterpretation: mcnamaraPogInterp, method: "McNamara" },
	);

	return { measurementsPart1, measurementsPart2, snGognVal, snGognInterp, fmaVal, fmaInterp, mmAngleVal, mmInterp, mcnamaraAVal, mcnamaraAInterp, mcnamaraPogVal, mcnamaraPogInterp };
}
