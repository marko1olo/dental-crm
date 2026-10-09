/**
 * DENTE CRM — Cephalometric Skeletal & Sagittal/Vertical Measurements (Layer 2)
 * Pure measurement calculator for Steiner, Tweed, Downs, Jacobson, Ricketts, and McNamara skeletal metrics.
 */

import {
	angle3Points,
	angleBetweenLines,
	dotProduct,
	projectPointOntoLine,
	vector,
	vectorLength,
} from "./geometry";
import type {
	CephalometricMeasurement,
	LandmarkMap,
	Point2D,
} from "./types";

export interface SkeletalMeasurementsResult {
	measurementsPart1: CephalometricMeasurement[]; // 1..11: SNA, SNB, ANB, Wits, Downs-FA, Downs-Conv, Downs-AB, SN-GoGn, FMA, Downs-YAxis, Downs-CantOP
	measurementsPart2: CephalometricMeasurement[]; // 19..21: NL-ML, McNamara-A-Nperp, McNamara-Pog-Nperp
	snaVal: number | null;
	snaInterp: string;
	snbVal: number | null;
	snbInterp: string;
	anbVal: number | null;
	anbInterp: string;
	witsVal: number | null;
	witsInterp: string;
	facialAngleVal: number | null;
	facialAngleInterp: string;
	convexityVal: number | null;
	convexityInterp: string;
	abPlaneVal: number | null;
	abPlaneInterp: string;
	snGognVal: number | null;
	snGognInterp: string;
	fmaVal: number | null;
	fmaInterp: string;
	yAxisVal: number | null;
	yAxisInterp: string;
	cantOpVal: number | null;
	cantOpInterp: string;
	mmAngleVal: number | null;
	mmInterp: string;
	mcnamaraAVal: number | null;
	mcnamaraAInterp: string;
	mcnamaraPogVal: number | null;
	mcnamaraPogInterp: string;
}

export function calculateSkeletalMeasurements(
	landmarks: LandmarkMap,
	scaleMmPerPixel: number,
): SkeletalMeasurementsResult {
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

	const measurementsPart1: CephalometricMeasurement[] = [];
	const measurementsPart2: CephalometricMeasurement[] = [];

	// Frankfort Horizontal Plane (Po -> Or)
	const hasFrankfort = Boolean(Po && Or);
	const fhStart: Point2D | null = hasFrankfort ? Po! : (S && N ? S : null);
	const fhEnd: Point2D | null = hasFrankfort ? Or! : (S && N ? N : null);

	// 1. SNA Angle (Steiner) - Norm: 82° ± 2°
	let snaVal: number | null = null;
	let snaStatus: CephalometricMeasurement["status"] = "pending";
	let snaInterp = "Требуется установка точек S, N, A";
	if (S && N && A) {
		snaVal = Number(angle3Points(S, N, A).toFixed(1));
		if (snaVal > 84) {
			snaStatus = "increased";
			snaInterp = "Верхнечелюстная прогнатия (переднее положение базиса)";
		} else if (snaVal < 80) {
			snaStatus = "decreased";
			snaInterp = "Верхнечелюстная ретрогнатия (дистальное положение базиса)";
		} else {
			snaStatus = "normal";
			snaInterp = "Ортогнатическое сагиттальное положение верхней челюсти";
		}
	}
	measurementsPart1.push({
		id: "SNA",
		name: "Угол SNA (Положение верхней челюсти)",
		symbol: "SNA",
		category: "sagittal",
		value: snaVal,
		unit: "°",
		normMin: 80,
		normMax: 84,
		normMean: 82,
		normText: "82° ± 2°",
		status: snaStatus,
		clinicalInterpretation: snaInterp,
		method: "Steiner",
	});

	// 2. SNB Angle (Steiner) - Norm: 80° ± 2°
	let snbVal: number | null = null;
	let snbStatus: CephalometricMeasurement["status"] = "pending";
	let snbInterp = "Требуется установка точек S, N, B";
	if (S && N && B) {
		snbVal = Number(angle3Points(S, N, B).toFixed(1));
		if (snbVal > 82) {
			snbStatus = "increased";
			snbInterp = "Нижнечелюстная прогнатия (переднее положение челюсти)";
		} else if (snbVal < 78) {
			snbStatus = "decreased";
			snbInterp = "Нижнечелюстная ретрогнатия (дистальное положение челюсти)";
		} else {
			snbStatus = "normal";
			snbInterp = "Ортогнатическое сагиттальное положение нижней челюсти";
		}
	}
	measurementsPart1.push({
		id: "SNB",
		name: "Угол SNB (Положение нижней челюсти)",
		symbol: "SNB",
		category: "sagittal",
		value: snbVal,
		unit: "°",
		normMin: 78,
		normMax: 82,
		normMean: 80,
		normText: "80° ± 2°",
		status: snbStatus,
		clinicalInterpretation: snbInterp,
		method: "Steiner",
	});

	// 3. ANB Angle (Steiner) - Norm: 2° ± 2° (0° to 4°)
	let anbVal: number | null = null;
	let anbStatus: CephalometricMeasurement["status"] = "pending";
	let anbInterp = "Требуется расчет углов SNA и SNB";
	if (snaVal !== null && snbVal !== null) {
		anbVal = Number((snaVal - snbVal).toFixed(1));
		if (anbVal > 4.0) {
			anbStatus = "increased";
			anbInterp = "Скелетный класс II (сагиттальное опережение верхней челюсти)";
		} else if (anbVal < 0.0) {
			anbStatus = "decreased";
			anbInterp = "Скелетный класс III (сагиттальное опережение нижней челюсти)";
		} else {
			anbStatus = "normal";
			anbInterp = "Скелетный класс I (нейтральное гармоничное соотношение базисов)";
		}
	}
	measurementsPart1.push({
		id: "ANB",
		name: "Угол ANB (Скелетный класс)",
		symbol: "ANB",
		category: "sagittal",
		value: anbVal,
		unit: "°",
		normMin: 0,
		normMax: 4,
		normMean: 2,
		normText: "2° ± 2°",
		status: anbStatus,
		clinicalInterpretation: anbInterp,
		method: "Steiner",
	});

	// 4. Wits Appraisal (Jacobson) - Norm: 0 ± 1 mm (Male: -1mm, Female: 0mm)
	let witsVal: number | null = null;
	let witsStatus: CephalometricMeasurement["status"] = "pending";
	let witsInterp = "Требуется установка точек A, B, U1, L1";
	let opAnt: Point2D | null = null;
	let opPost: Point2D | null = null;
	if (A && B && (U1t || ANS) && (L1t || Me)) {
		// Define occlusal plane: from midpoint of incisors (or ANS/PNS bisector)
		opAnt = U1t && L1t
			? { x: (U1t.x + L1t.x) / 2, y: (U1t.y + L1t.y) / 2 }
			: ANS && Me
				? { x: (ANS.x + Me.x) / 2, y: (ANS.y + Me.y) / 2 }
				: { x: (A.x + B.x) / 2 + 50, y: (A.y + B.y) / 2 };

		opPost = PNS && Go
			? { x: (PNS.x + Go.x) / 2, y: (PNS.y + Go.y) / 2 }
			: { x: opAnt.x - 150, y: opAnt.y - 10 };

		const projA = projectPointOntoLine(A, opPost, opAnt);
		const projB = projectPointOntoLine(B, opPost, opAnt);

		// Vector along OP pointing anteriorly
		const opVec = vector(opPost, opAnt);
		const opLen = vectorLength(opVec);
		if (opLen > 0) {
			const unitOp = { x: opVec.x / opLen, y: opVec.y / opLen };
			const diffVec = vector(projB, projA); // A relative to B along OP
			const distPx = dotProduct(diffVec, unitOp);
			witsVal = Number((distPx * scaleMmPerPixel).toFixed(1));

			if (witsVal > 2.0) {
				witsStatus = "increased";
				witsInterp = "Скелетный класс II (базис A смещен кпереди относительно B)";
			} else if (witsVal < -2.0) {
				witsStatus = "decreased";
				witsInterp = "Скелетный класс III (базис B смещен кпереди относительно A)";
			} else {
				witsStatus = "normal";
				witsInterp = "Скелетный класс I (гармоничное сагиттальное соотношение апикальных базисов)";
			}
		}
	}
	measurementsPart1.push({
		id: "Wits",
		name: "Wits-число (Jacobson)",
		symbol: "Wits",
		category: "sagittal",
		value: witsVal,
		unit: "mm",
		normMin: -1,
		normMax: 1,
		normMean: 0,
		normText: "0 ± 1 мм",
		status: witsStatus,
		clinicalInterpretation: witsInterp,
		method: "Jacobson",
	});

	// 5. Facial Angle (Downs - N-Pog to Frankfort Horizontal) - Norm: 87.8° ± 3.6° (84° to 91°)
	let facialAngleVal: number | null = null;
	let facialAngleStatus: CephalometricMeasurement["status"] = "pending";
	let facialAngleInterp = "Требуется установка точек N, Pog, Po, Or";
	if (N && Pog && fhStart && fhEnd) {
		const rawAngle = angleBetweenLines(fhStart, fhEnd, N, Pog);
		facialAngleVal = Number(rawAngle.toFixed(1));
		if (facialAngleVal > 91.4) {
			facialAngleStatus = "increased";
			facialAngleInterp = "Скелетная прогнатия нижней челюсти / выступающий подбородок (Downs)";
		} else if (facialAngleVal < 84.2) {
			facialAngleStatus = "decreased";
			facialAngleInterp = "Скелетная ретрогнатия нижней челюсти / скошенный подбородок (Downs)";
		} else {
			facialAngleStatus = "normal";
			facialAngleInterp = "Нормальное сагиттальное положение подбородочного симфиза (Downs)";
		}
	}
	measurementsPart1.push({
		id: "Downs-FA",
		name: "Лицевой угол (Downs / N-Pog to FH)",
		symbol: "Facial Angle",
		category: "sagittal",
		value: facialAngleVal,
		unit: "°",
		normMin: 84,
		normMax: 91,
		normMean: 87.8,
		normText: "87.8° ± 3.6°",
		status: facialAngleStatus,
		clinicalInterpretation: facialAngleInterp,
		method: "Downs",
	});

	// 6. Angle of Convexity (Downs - N-A-Pog) - Norm: 0° ± 5° (-5° to +5°)
	let convexityVal: number | null = null;
	let convexityStatus: CephalometricMeasurement["status"] = "pending";
	let convexityInterp = "Требуется установка точек N, A, Pog";
	if (N && A && Pog) {
		const rawAngle = angle3Points(N, A, Pog);
		const projA_NPog = projectPointOntoLine(A, N, Pog);
		// If Point A is anterior to N-Pog line (x > projA.x in standard ceph)
		const isAnterior = A.x >= projA_NPog.x;
		const deviation = 180 - rawAngle;
		convexityVal = Number((isAnterior ? deviation : -deviation).toFixed(1));

		if (convexityVal > 5.0) {
			convexityStatus = "increased";
			convexityInterp = "Выпуклый профиль лица (Скелетный класс II / Downs)";
		} else if (convexityVal < -5.0) {
			convexityStatus = "decreased";
			convexityInterp = "Вогнутый профиль лица (Скелетный класс III / Downs)";
		} else {
			convexityStatus = "normal";
			convexityInterp = "Прямой гармоничный профиль лица (Норма / Downs)";
		}
	}
	measurementsPart1.push({
		id: "Downs-Conv",
		name: "Угол выпуклости профиля (Downs / N-A-Pog)",
		symbol: "Convexity",
		category: "sagittal",
		value: convexityVal,
		unit: "°",
		normMin: -5,
		normMax: 5,
		normMean: 0,
		normText: "0° ± 5°",
		status: convexityStatus,
		clinicalInterpretation: convexityInterp,
		method: "Downs",
	});

	// 7. A-B Plane Angle (Downs - N-Pog to A-B) - Norm: -4.6° ± 3.2° (-8° to 0°)
	let abPlaneVal: number | null = null;
	let abPlaneStatus: CephalometricMeasurement["status"] = "pending";
	let abPlaneInterp = "Требуется установка точек N, Pog, A, B";
	if (N && Pog && A && B) {
		const rawAngle = angleBetweenLines(N, Pog, A, B);
		// Sign: B posterior to A gives negative angle in Class I/II
		const isBPosterior = B.x < A.x;
		abPlaneVal = Number((isBPosterior ? -rawAngle : rawAngle).toFixed(1));
		if (abPlaneVal < -8.0) {
			abPlaneStatus = "decreased";
			abPlaneInterp = "Скелетный класс II (базис B смещен дистально относительно A / Downs)";
		} else if (abPlaneVal > 0.0) {
			abPlaneStatus = "increased";
			abPlaneInterp = "Скелетный класс III (базис B смещен мезиально относительно A / Downs)";
		} else {
			abPlaneStatus = "normal";
			abPlaneInterp = "Гармоничное соотношение базисов к лицевой плоскости (Downs)";
		}
	}
	measurementsPart1.push({
		id: "Downs-AB",
		name: "Угол плоскости A-B (Downs / AB to N-Pog)",
		symbol: "A-B Angle",
		category: "sagittal",
		value: abPlaneVal,
		unit: "°",
		normMin: -8,
		normMax: 0,
		normMean: -4.6,
		normText: "-4.6° ± 3.2°",
		status: abPlaneStatus,
		clinicalInterpretation: abPlaneInterp,
		method: "Downs",
	});

	// 8. SN-GoGn Angle (Steiner) - Norm: 32° ± 3°
	let snGognVal: number | null = null;
	let snGognStatus: CephalometricMeasurement["status"] = "pending";
	let snGognInterp = "Требуется установка точек S, N, Go, Gn/Me";
	if (S && N && Go && (Gn || Me)) {
		const antMand = Gn ?? Me;
		if (antMand) {
			snGognVal = Number(angleBetweenLines(S, N, Go, antMand).toFixed(1));
			if (snGognVal > 35) {
				snGognStatus = "increased";
				snGognInterp = "Гипердивергентный (вертикальный) тип роста / Долихофациал";
			} else if (snGognVal < 29) {
				snGognStatus = "decreased";
				snGognInterp = "Гиподивергентный (горизонтальный) тип роста / Брахифациал";
			} else {
				snGognStatus = "normal";
				snGognInterp = "Нормодивергентный (мезофациальный) тип лицевого скелета";
			}
		}
	}
	measurementsPart1.push({
		id: "SN-GoGn",
		name: "Угол SN-GoGn (Тип роста)",
		symbol: "SN-GoGn",
		category: "vertical",
		value: snGognVal,
		unit: "°",
		normMin: 29,
		normMax: 35,
		normMean: 32,
		normText: "32° ± 3°",
		status: snGognStatus,
		clinicalInterpretation: snGognInterp,
		method: "Steiner",
	});

	// 9. FMA Angle (Tweed - Frankfort Mandibular Plane Angle) - Norm: 25° ± 3°
	let fmaVal: number | null = null;
	let fmaStatus: CephalometricMeasurement["status"] = "pending";
	let fmaInterp = "Требуется установка плоскостей";
	if (Go && (Me || Gn)) {
		const antMand = Me ?? Gn;
		if (antMand) {
			if (hasFrankfort && Po && Or) {
				fmaVal = Number(angleBetweenLines(Po, Or, Go, antMand).toFixed(1));
			} else if (S && N) {
				// Approximation when FH is estimated from SN (FH is roughly 7° to SN)
				const rawAngle = angleBetweenLines(S, N, Go, antMand);
				fmaVal = Number(Math.max(10, Math.min(50, rawAngle - 7)).toFixed(1));
			}
		}
	}
	if (fmaVal !== null) {
		if (fmaVal > 28) {
			fmaStatus = "increased";
			fmaInterp = "Высокий угол (High angle) — вертикальный рост, склонность к открытому прикусу";
		} else if (fmaVal < 22) {
			fmaStatus = "decreased";
			fmaInterp = "Низкий угол (Low angle) — горизонтальный рост, глубокое резцовое перекрытие";
		} else {
			fmaStatus = "normal";
			fmaInterp = "Нормальный угол FMA — сбалансированный тип лицевого роста";
		}
	}
	measurementsPart1.push({
		id: "FMA",
		name: "Угол FMA (Tweed)",
		symbol: "FMA",
		category: "vertical",
		value: fmaVal,
		unit: "°",
		normMin: 22,
		normMax: 28,
		normMean: 25,
		normText: "25° ± 3°",
		status: fmaStatus,
		clinicalInterpretation: fmaInterp,
		method: "Tweed",
	});

	// 10. Y-Axis Angle (Downs - S-Gn to Frankfort Horizontal) - Norm: 59.4° ± 3.8° (56° to 63°)
	let yAxisVal: number | null = null;
	let yAxisStatus: CephalometricMeasurement["status"] = "pending";
	let yAxisInterp = "Требуется установка точек S, Gn/Me, Po, Or";
	if (S && (Gn || Me) && fhStart && fhEnd) {
		const antMand = Gn ?? Me;
		if (antMand) {
			const rawAngle = angleBetweenLines(fhStart, fhEnd, S, antMand);
			yAxisVal = Number(rawAngle.toFixed(1));
			if (yAxisVal > 63.2) {
				yAxisStatus = "increased";
				yAxisInterp = "Увеличен — вертикальный вектор роста лица / дорсо-каудальная ротация (Downs)";
			} else if (yAxisVal < 55.6) {
				yAxisStatus = "decreased";
				yAxisInterp = "Уменьшен — горизонтальный вектор роста лица / вентро-краниальная ротация (Downs)";
			} else {
				yAxisStatus = "normal";
				yAxisInterp = "Сбалансированный нейтральный вектор роста лицевого скелета (Downs)";
			}
		}
	}
	measurementsPart1.push({
		id: "Downs-YAxis",
		name: "Y-ось роста (Downs / S-Gn to FH)",
		symbol: "Y-Axis",
		category: "vertical",
		value: yAxisVal,
		unit: "°",
		normMin: 56,
		normMax: 63,
		normMean: 59.4,
		normText: "59.4° ± 3.8°",
		status: yAxisStatus,
		clinicalInterpretation: yAxisInterp,
		method: "Downs",
	});

	// 11. Cant of Occlusal Plane (Downs - OP to FH) - Norm: 9.3° ± 3.8° (6° to 13°)
	let cantOpVal: number | null = null;
	let cantOpStatus: CephalometricMeasurement["status"] = "pending";
	let cantOpInterp = "Требуется построение окклюзионной плоскости и FH";
	if (opAnt && opPost && fhStart && fhEnd) {
		const rawAngle = angleBetweenLines(fhStart, fhEnd, opPost, opAnt);
		cantOpVal = Number(rawAngle.toFixed(1));
		if (cantOpVal > 13.1) {
			cantOpStatus = "increased";
			cantOpInterp = "Крутой наклон окклюзионной плоскости (склонность к открытому прикусу / Downs)";
		} else if (cantOpVal < 5.5) {
			cantOpStatus = "decreased";
			cantOpInterp = "Пологий наклон окклюзионной плоскости (склонность к глубокому прикусу / Downs)";
		} else {
			cantOpStatus = "normal";
			cantOpInterp = "Нормальный угол наклона окклюзионной плоскости (Downs)";
		}
	}
	measurementsPart1.push({
		id: "Downs-CantOP",
		name: "Наклон окклюзионной плоскости (Downs / OP to FH)",
		symbol: "Cant of OP",
		category: "vertical",
		value: cantOpVal,
		unit: "°",
		normMin: 6,
		normMax: 13,
		normMean: 9.3,
		normText: "9.3° ± 3.8°",
		status: cantOpStatus,
		clinicalInterpretation: cantOpInterp,
		method: "Downs",
	});

	// 15. Maxillary-Mandibular Plane Angle (ANS-PNS to Go-Me) - Norm: 25° ± 4°
	let mmAngleVal: number | null = null;
	let mmStatus: CephalometricMeasurement["status"] = "pending";
	let mmInterp = "Требуется установка ANS, PNS, Go, Me";
	if (ANS && PNS && Go && (Me || Gn)) {
		const antMand = Me ?? Gn;
		if (antMand) {
			mmAngleVal = Number(angleBetweenLines(PNS, ANS, Go, antMand).toFixed(1));
			if (mmAngleVal > 29) {
				mmStatus = "increased";
				mmInterp = "Дивергенция челюстей (вертикальная резцовая дезокклюзия)";
			} else if (mmAngleVal < 21) {
				mmStatus = "decreased";
				mmInterp = "Конвергенция челюстей (глубокий прикус)";
			} else {
				mmStatus = "normal";
				mmInterp = "Нормальная высота межапикального пространства";
			}
		}
	}
	measurementsPart2.push({
		id: "NL-ML",
		name: "Межбазисный угол (NL-ML / ANS-PNS to MP)",
		symbol: "NL-ML",
		category: "vertical",
		value: mmAngleVal,
		unit: "°",
		normMin: 21,
		normMax: 29,
		normMean: 25,
		normText: "25° ± 4°",
		status: mmStatus,
		clinicalInterpretation: mmInterp,
		method: "Ricketts",
	});

	// 16. McNamara A to N-Perpendicular (A to N-perp) - Norm: 0 ± 2 mm (-2 to +2 mm)
	let mcnamaraAVal: number | null = null;
	let mcnamaraAStatus: CephalometricMeasurement["status"] = "pending";
	let mcnamaraAInterp = "Требуется установка точек N, A, Po, Or";
	if (N && A && fhStart && fhEnd) {
		const fhDx = fhEnd.x - fhStart.x;
		const fhDy = fhEnd.y - fhStart.y;
		const fhLen = Math.sqrt(fhDx * fhDx + fhDy * fhDy);
		if (fhLen > 0) {
			const perpX = -fhDy / fhLen;
			const perpY = fhDx / fhLen;
			const naX = A.x - N.x;
			const naY = A.y - N.y;
			const projLen = naX * perpX + naY * perpY;
			const projAx = N.x + projLen * perpX;
			const unitFhX = fhDx / fhLen;
			const unitFhY = fhDy / fhLen;
			const distPx = (A.x - projAx) * unitFhX + (A.y - (N.y + projLen * perpY)) * unitFhY;
			mcnamaraAVal = Number((distPx * scaleMmPerPixel).toFixed(1));
			if (mcnamaraAVal > 2.0) {
				mcnamaraAStatus = "increased";
				mcnamaraAInterp = "Верхнечелюстная прогнатия (переднее положение базиса по McNamara)";
			} else if (mcnamaraAVal < -2.0) {
				mcnamaraAStatus = "decreased";
				mcnamaraAInterp = "Верхнечелюстная ретрогнатия (дистальное положение базиса по McNamara)";
			} else {
				mcnamaraAStatus = "normal";
				mcnamaraAInterp = "Ортогнатическое положение апикального базиса ВЧ (McNamara)";
			}
		}
	}
	measurementsPart2.push({
		id: "McNamara-A-Nperp",
		name: "Точка A к N-Perp (McNamara / A to N-perp)",
		symbol: "A to N-perp",
		category: "linear",
		value: mcnamaraAVal,
		unit: "mm",
		normMin: -2,
		normMax: 2,
		normMean: 0,
		normText: "0 ± 2 мм",
		status: mcnamaraAStatus,
		clinicalInterpretation: mcnamaraAInterp,
		method: "McNamara",
	});

	// 17. McNamara Pog to N-Perpendicular (Pog to N-perp) - Norm: -2 ± 2 mm (-4 to 0 mm)
	let mcnamaraPogVal: number | null = null;
	let mcnamaraPogStatus: CephalometricMeasurement["status"] = "pending";
	let mcnamaraPogInterp = "Требуется установка точек N, Pog, Po, Or";
	if (N && Pog && fhStart && fhEnd) {
		const fhDx = fhEnd.x - fhStart.x;
		const fhDy = fhEnd.y - fhStart.y;
		const fhLen = Math.sqrt(fhDx * fhDx + fhDy * fhDy);
		if (fhLen > 0) {
			const perpX = -fhDy / fhLen;
			const perpY = fhDx / fhLen;
			const npogX = Pog.x - N.x;
			const npogY = Pog.y - N.y;
			const projLen = npogX * perpX + npogY * perpY;
			const projPogX = N.x + projLen * perpX;
			const unitFhX = fhDx / fhLen;
			const unitFhY = fhDy / fhLen;
			const distPx = (Pog.x - projPogX) * unitFhX + (Pog.y - (N.y + projLen * perpY)) * unitFhY;
			mcnamaraPogVal = Number((distPx * scaleMmPerPixel).toFixed(1));
			if (mcnamaraPogVal > 0.0) {
				mcnamaraPogStatus = "increased";
				mcnamaraPogInterp = "Прогения подбородка (переднее положение по McNamara)";
			} else if (mcnamaraPogVal < -4.0) {
				mcnamaraPogStatus = "decreased";
				mcnamaraPogInterp = "Ретрогения подбородка (дистальное положение по McNamara)";
			} else {
				mcnamaraPogStatus = "normal";
				mcnamaraPogInterp = "Гармоничное положение подбородочного выступа (Норма McNamara)";
			}
		}
	}
	measurementsPart2.push({
		id: "McNamara-Pog-Nperp",
		name: "Погонион к N-Perp (McNamara / Pog to N-perp)",
		symbol: "Pog to N-perp",
		category: "linear",
		value: mcnamaraPogVal,
		unit: "mm",
		normMin: -4,
		normMax: 0,
		normMean: -2,
		normText: "-2 ± 2 мм",
		status: mcnamaraPogStatus,
		clinicalInterpretation: mcnamaraPogInterp,
		method: "McNamara",
	});

	return {
		measurementsPart1,
		measurementsPart2,
		snaVal,
		snaInterp,
		snbVal,
		snbInterp,
		anbVal,
		anbInterp,
		witsVal,
		witsInterp,
		facialAngleVal,
		facialAngleInterp,
		convexityVal,
		convexityInterp,
		abPlaneVal,
		abPlaneInterp,
		snGognVal,
		snGognInterp,
		fmaVal,
		fmaInterp,
		yAxisVal,
		yAxisInterp,
		cantOpVal,
		cantOpInterp,
		mmAngleVal,
		mmInterp,
		mcnamaraAVal,
		mcnamaraAInterp,
		mcnamaraPogVal,
		mcnamaraPogInterp,
	};
}
