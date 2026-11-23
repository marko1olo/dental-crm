/**
 * @dental/web/components/orthodontics/cephalometric/cephalometricEngine.ts
 *
 * Канонический вычислительный движок цефалометрии, угловой геометрии,
 * классификации окклюзии и генерации протоколов ТРГ (Мандаты 8b, 8e, 8x).
 * Консолидированный модуль: Штайнер, Твид, Даунс, Якобсон (Wits), Макнамара.
 */

import type {
	CephalometricAnalysisResult,
	CephalometricDiagnosis,
	CephalometricMeasurement,
	LandmarkMap,
	Point2D,
} from "./cephalometricLandmarks";
import { CEPHALOMETRIC_LANDMARKS } from "./cephalometricLandmarks";

// ==========================================
// 1. ВЕКТОРНАЯ 2D ГЕОМЕТРИЯ
// ==========================================

export function distance(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

export function vector(from: Point2D, to: Point2D): Point2D {
	return { x: to.x - from.x, y: to.y - from.y };
}

export function dotProduct(v1: Point2D, v2: Point2D): number {
	return v1.x * v2.x + v1.y * v2.y;
}

export function vectorLength(v: Point2D): number {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function angleBetweenVectors(v1: Point2D, v2: Point2D): number {
	const l1 = vectorLength(v1);
	const l2 = vectorLength(v2);
	if (l1 <= 1e-6 || l2 <= 1e-6) return 0;
	const cosVal = Math.max(-1, Math.min(1, dotProduct(v1, v2) / (l1 * l2)));
	return (Math.acos(cosVal) * 180) / Math.PI;
}

export function angle3Points(p1: Point2D, vertex: Point2D, p2: Point2D): number {
	const v1 = vector(vertex, p1);
	const v2 = vector(vertex, p2);
	return angleBetweenVectors(v1, v2);
}

export function angleBetweenLines(p1: Point2D, p2: Point2D, p3: Point2D, p4: Point2D): number {
	const v1 = vector(p1, p2);
	const v2 = vector(p3, p4);
	return angleBetweenVectors(v1, v2);
}

export function projectPointOntoLine(p: Point2D, a: Point2D, b: Point2D): Point2D {
	const ab = vector(a, b);
	const ap = vector(a, p);
	const abLenSq = ab.x * ab.x + ab.y * ab.y;
	if (abLenSq <= 1e-12) return { ...a };
	const t = dotProduct(ap, ab) / abLenSq;
	return { x: a.x + t * ab.x, y: a.y + t * ab.y };
}

/**
 * Определение линии окклюзионной плоскости (Occlusal Plane, OP).
 * DEF-ORTHO-SEV1-01 / DEF-ORTHO-SEV1-02:
 * Окклюзионная плоскость проходит через перекрытие резцов (середина между U1t и L1t)
 * и точку смыкания первых моляров (Mo), либо ориентируется по анатомическому наклону к основанию черепа.
 * Возвращает две точки [p1, p2], где вектор p1 -> p2 направлен вперед (к резцам/лицу).
 */
export function resolveOcclusalPlane(landmarks: LandmarkMap): { p1: Point2D; p2: Point2D; forwardUnit: Point2D } | null {
	const U1t = landmarks.U1t;
	const L1t = landmarks.L1t;
	const Mo = landmarks.Mo;
	const ANS = landmarks.ANS;
	const PNS = landmarks.PNS;
	const Po = landmarks.Po;
	const Or = landmarks.Or;

	if (!U1t || !L1t) return null;

	const incisalMid: Point2D = {
		x: (U1t.x + L1t.x) / 2,
		y: (U1t.y + L1t.y) / 2,
	};

	let posteriorOp: Point2D;

	if (Mo) {
		// Канон Jacobson/Downs: через смыкание первых моляров (Mo) и резцы (incisalMid)
		posteriorOp = Mo;
	} else if (PNS && ANS) {
		// Анатомический расчет при отсутствии установленной точки Mo:
		// Окклюзионная плоскость ориентирована согласованно с нёбной плоскостью твердого нёба (PNS -> ANS)
		const palatalDir = vector(PNS, ANS);
		const palatalLen = vectorLength(palatalDir);
		if (palatalLen > 1e-6) {
			const ux = palatalDir.x / palatalLen;
			const uy = palatalDir.y / palatalLen;
			posteriorOp = {
				x: incisalMid.x - ux * 100,
				y: incisalMid.y - uy * 100,
			};
		} else {
			posteriorOp = { x: incisalMid.x - 100, y: incisalMid.y };
		}
	} else if (Po && Or) {
		// Ориентация по Франкфуртской горизонтали (Po -> Or)
		const fhDir = vector(Po, Or);
		const fhLen = vectorLength(fhDir);
		if (fhLen > 1e-6) {
			const ux = fhDir.x / fhLen;
			const uy = fhDir.y / fhLen;
			posteriorOp = {
				x: incisalMid.x - ux * 100,
				y: incisalMid.y - uy * 100,
			};
		} else {
			posteriorOp = { x: incisalMid.x - 100, y: incisalMid.y };
		}
	} else {
		posteriorOp = { x: incisalMid.x - 100, y: incisalMid.y };
	}

	const dir = vector(posteriorOp, incisalMid);
	const len = vectorLength(dir);
	if (len < 1e-6) return null;

	return {
		p1: posteriorOp,
		p2: incisalMid,
		forwardUnit: { x: dir.x / len, y: dir.y / len },
	};
}

// ==========================================
// 2. РАСЧЕТ ИЗМЕРЕНИЙ ЦЕФАЛОМЕТРИИ
// ==========================================

export function calculateCephalometrics(
	landmarks: LandmarkMap,
	scaleMmPerPixel = 0.15,
): CephalometricAnalysisResult {
	const S = landmarks.S;
	const N = landmarks.N;
	const Or = landmarks.Or;
	const Po = landmarks.Po;
	const ANS = landmarks.ANS;
	const PNS = landmarks.PNS;
	const A = landmarks.A;
	const B = landmarks.B;
	const Pog = landmarks.Pog;
	const Gn = landmarks.Gn;
	const Me = landmarks.Me;
	const Go = landmarks.Go;
	const Ba = landmarks.Ba;
	const Ar = landmarks.Ar;
	const Pt = landmarks.Pt;
	const Prn = landmarks.Prn;
	const Ls = landmarks.Ls;
	const Li = landmarks.Li;
	const PogPrime = landmarks.Pog_prime || landmarks.Pog;
	const U1t = landmarks.U1t;
	const U1a = landmarks.U1a;
	const L1t = landmarks.L1t;
	const L1a = landmarks.L1a;

	const measurements: CephalometricMeasurement[] = [];

	// 1. SNA (Steiner: 82°±2°)
	let snaVal: number | null = null;
	let snaInterp = "Установите точки S, N, A";
	let snaStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (S && N && A) {
		snaVal = Math.round(angle3Points(S, N, A) * 10) / 10;
		if (snaVal > 84) {
			snaInterp = "Прогнатия верхней челюсти (переднее положение)";
			snaStatus = "deviation_high";
		} else if (snaVal < 80) {
			snaInterp = "Ретрогнатия верхней челюсти (заднее положение)";
			snaStatus = "deviation_low";
		} else {
			snaInterp = "Ортогнатическое положение ВЧ в пределах нормы";
			snaStatus = "normal";
		}
	}
	measurements.push({
		id: "SNA",
		nameRu: "SNA (Положение верхней челюсти)",
		normMin: 80,
		normMax: 84,
		unit: "deg",
		value: snaVal,
		status: snaStatus,
		clinicalInterpretation: snaInterp,
		category: "skeletal_sagittal",
	});

	// 2. SNB (Steiner: 80°±2°)
	let snbVal: number | null = null;
	let snbInterp = "Установите точки S, N, B";
	let snbStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (S && N && B) {
		snbVal = Math.round(angle3Points(S, N, B) * 10) / 10;
		if (snbVal > 82) {
			snbInterp = "Прогнатия нижней челюсти (переднее положение)";
			snbStatus = "deviation_high";
		} else if (snbVal < 78) {
			snbInterp = "Ретрогнатия нижней челюсти (заднее положение)";
			snbStatus = "deviation_low";
		} else {
			snbInterp = "Ортогнатическое положение НЧ в пределах нормы";
			snbStatus = "normal";
		}
	}
	measurements.push({
		id: "SNB",
		nameRu: "SNB (Положение нижней челюсти)",
		normMin: 78,
		normMax: 82,
		unit: "deg",
		value: snbVal,
		status: snbStatus,
		clinicalInterpretation: snbInterp,
		category: "skeletal_sagittal",
	});

	// 3. ANB (Steiner: 2°±2°)
	let anbVal: number | null = null;
	let anbInterp = "Установите точки S, N, A, B";
	let anbStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (snaVal !== null && snbVal !== null) {
		anbVal = Math.round((snaVal - snbVal) * 10) / 10;
		if (anbVal > 4.0) {
			anbInterp = "Скелетный класс II (сагиттальное опережение ВЧ / ретрогнатия НЧ)";
			anbStatus = "deviation_high";
		} else if (anbVal < 0.0) {
			anbInterp = "Скелетный класс III (мезиальное соотношение / опережение НЧ)";
			anbStatus = "deviation_low";
		} else {
			anbInterp = "Скелетный класс I (гармоничное сагиттальное соотношение челюстей)";
			anbStatus = "normal";
		}
	}
	measurements.push({
		id: "ANB",
		nameRu: "ANB (Сагиттальное соотношение челюстей)",
		normMin: 0,
		normMax: 4,
		unit: "deg",
		value: anbVal,
		status: anbStatus,
		clinicalInterpretation: anbInterp,
		category: "skeletal_sagittal",
	});

	// 4. Wits Appraisal (Jacobson: 0 ± 1 мм)
	let witsVal: number | null = null;
	let witsInterp = "Установите точки A, B, U1t, L1t";
	let witsStatus: CephalometricMeasurement["status"] = "unmeasured";
	const op = resolveOcclusalPlane(landmarks);
	if (A && B && op) {
		if (!Number.isFinite(scaleMmPerPixel) || scaleMmPerPixel <= 0) {
			witsVal = 0;
			witsInterp = "Калибруйте масштаб снимка (Wits в мм не определен)";
			witsStatus = "unmeasured";
		} else {
			// Честная окклюзионная плоскость Jacobson через моляры Mo и резцы
			const aProj = projectPointOntoLine(A, op.p1, op.p2);
			const bProj = projectPointOntoLine(B, op.p1, op.p2);
			// Вектор смещения от проекции B к проекции A (BO -> AO)
			const disp = { x: aProj.x - bProj.x, y: aProj.y - bProj.y };
			// Проекция на направляющий вектор окклюзионной плоскости вперед (к лицу)
			const distPixels = disp.x * op.forwardUnit.x + disp.y * op.forwardUnit.y;
			witsVal = Math.round(distPixels * scaleMmPerPixel * 10) / 10;
			if (Number.isNaN(witsVal) || !Number.isFinite(witsVal)) {
				witsVal = 0;
				witsInterp = "Ошибка расчета Wits appraisal";
				witsStatus = "unmeasured";
			} else if (witsVal > 2) {
				witsInterp = "Скелетный класс II по Wits (выраженное сагиттальное расхождение)";
				witsStatus = "deviation_high";
			} else if (witsVal < -2) {
				witsInterp = "Скелетный класс III по Wits (мезиальный сдвиг базиса НЧ)";
				witsStatus = "deviation_low";
			} else {
				witsInterp = "Скелетный класс I по Wits (гармоничное соотношение базисов)";
				witsStatus = "normal";
			}
		}
	}
	measurements.push({
		id: "Wits",
		nameRu: "Wits Appraisal (Окклюзионное расхождение)",
		normMin: -1,
		normMax: 1,
		unit: "mm",
		value: witsVal,
		status: witsStatus,
		clinicalInterpretation: witsInterp,
		category: "skeletal_sagittal",
	});

	// 5. Downs Facial Angle (N-Pog to Po-Or: 87.8°±3.6°)
	let facialAngleVal: number | null = null;
	let facialAngleInterp = "Установите N, Pog, Po, Or";
	let facialAngleStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && Pog && Po && Or) {
		facialAngleVal = Math.round(angleBetweenLines(Po, Or, N, Pog) * 10) / 10;
		facialAngleStatus = facialAngleVal > 91.4 ? "deviation_high" : facialAngleVal < 84.2 ? "deviation_low" : "normal";
		facialAngleInterp = facialAngleStatus === "normal" ? "Лицевой угол в норме (ортогнатическое положение подбородка)" : facialAngleStatus === "deviation_high" ? "Прогнатия подбородка по Downs" : "Ретрогнатия подбородка по Downs";
	}
	measurements.push({
		id: "Downs-FA",
		nameRu: "Лицевой угол Downs (Facial Angle, N-Pog to FH)",
		normMin: 84.2,
		normMax: 91.4,
		unit: "deg",
		value: facialAngleVal,
		status: facialAngleStatus,
		clinicalInterpretation: facialAngleInterp,
		category: "skeletal_sagittal",
	});

	// 6. Downs Angle of Convexity (N-A-Pog: 0°±5°)
	let convexityVal: number | null = null;
	let convexityInterp = "Установите N, A, Pog";
	let convexityStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && A && Pog) {
		const rawAngle = angle3Points(N, A, Pog);
		convexityVal = Math.round((180 - rawAngle) * 10) / 10;
		convexityStatus = convexityVal > 5 ? "deviation_high" : convexityVal < -5 ? "deviation_low" : "normal";
		convexityInterp = convexityStatus === "normal" ? "Прямой профиль скелетного базиса" : convexityStatus === "deviation_high" ? "Выпуклый профиль скелетного базиса (Класс II)" : "Вогнутый профиль скелетного базиса (Класс III)";
	}
	measurements.push({
		id: "Downs-Conv",
		nameRu: "Угол выпуклости Downs (Convexity, N-A-Pog)",
		normMin: -5,
		normMax: 5,
		unit: "deg",
		value: convexityVal,
		status: convexityStatus,
		clinicalInterpretation: convexityInterp,
		category: "skeletal_sagittal",
	});

	// 7. Downs A-B Plane Angle (4.6°±3.7°)
	let abPlaneVal: number | null = null;
	let abPlaneInterp = "Установите N, Pog, A, B";
	let abPlaneStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && Pog && A && B) {
		abPlaneVal = Math.round(angleBetweenLines(N, Pog, A, B) * 10) / 10;
		abPlaneStatus = abPlaneVal > 8.3 ? "deviation_high" : abPlaneVal < 0.9 ? "deviation_low" : "normal";
		abPlaneInterp = abPlaneStatus === "normal" ? "Соотношение апикальных базисов A-B в норме" : "Отклонение сагиттального соотношения базисов A-B";
	}
	measurements.push({
		id: "Downs-AB",
		nameRu: "Угол плоскости A-B (Downs A-B Plane)",
		normMin: 0.9,
		normMax: 8.3,
		unit: "deg",
		value: abPlaneVal,
		status: abPlaneStatus,
		clinicalInterpretation: abPlaneInterp,
		category: "skeletal_sagittal",
	});

	// 8. SN-GoGn (Steiner: 32°±3°)
	let snGognVal: number | null = null;
	let snGognInterp = "Установите S, N, Go, Gn";
	let snGognStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (S && N && Go && Gn) {
		snGognVal = Math.round(angleBetweenLines(S, N, Go, Gn) * 10) / 10;
		snGognStatus = snGognVal > 35 ? "deviation_high" : snGognVal < 29 ? "deviation_low" : "normal";
		snGognInterp = snGognStatus === "normal" ? "Нормальный угол наклона основания НЧ (мезофациальный тип)" : snGognStatus === "deviation_high" ? "Высокий угол (гипердивергентный, вертикальный рост)" : "Низкий угол (гиподивергентный, горизонтальный рост)";
	}
	measurements.push({
		id: "SN-GoGn",
		nameRu: "SN-GoGn (Угол наклона нижней челюсти к основанию черепа)",
		normMin: 29,
		normMax: 35,
		unit: "deg",
		value: snGognVal,
		status: snGognStatus,
		clinicalInterpretation: snGognInterp,
		category: "skeletal_vertical",
	});

	// 9. FMA (Tweed: 25°±3°)
	let fmaVal: number | null = null;
	let fmaInterp = "Установите Po, Or, Go, Me";
	let fmaStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (Po && Or && Go && Me) {
		fmaVal = Math.round(angleBetweenLines(Po, Or, Go, Me) * 10) / 10;
		fmaStatus = fmaVal > 28 ? "deviation_high" : fmaVal < 22 ? "deviation_low" : "normal";
		fmaInterp = fmaStatus === "normal" ? "Мезофациальный тип (сбалансированный вертикальный рост)" : fmaStatus === "deviation_high" ? "Гипердивергентный тип роста (высокий угол Tweed FMA, открытый прикус)" : "Гиподивергентный тип роста (низкий угол Tweed FMA, глубокий прикус)";
	}
	measurements.push({
		id: "FMA",
		nameRu: "FMA Tweed (Франкфуртско-нижнечелюстной угол)",
		normMin: 22,
		normMax: 28,
		unit: "deg",
		value: fmaVal,
		status: fmaStatus,
		clinicalInterpretation: fmaInterp,
		category: "skeletal_vertical",
	});

	// 10. Downs Y-Axis (59.4°±3.8°)
	let yAxisVal: number | null = null;
	let yAxisInterp = "Установите S, Gn, Po, Or";
	let yAxisStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (S && Gn && Po && Or) {
		yAxisVal = Math.round(angleBetweenLines(Po, Or, S, Gn) * 10) / 10;
		yAxisStatus = yAxisVal > 63.2 ? "deviation_high" : yAxisVal < 55.6 ? "deviation_low" : "normal";
		yAxisInterp = yAxisStatus === "normal" ? "Нейтральное направление роста лица (Y-Axis норма)" : yAxisStatus === "deviation_high" ? "Вертикальный вектор роста подбородка вниз и назад" : "Горизонтальный вектор роста подбородка вперед";
	}
	measurements.push({
		id: "Downs-YAxis",
		nameRu: "Y-ось роста Downs (Y-Axis, SGn to FH)",
		normMin: 55.6,
		normMax: 63.2,
		unit: "deg",
		value: yAxisVal,
		status: yAxisStatus,
		clinicalInterpretation: yAxisInterp,
		category: "skeletal_vertical",
	});

	// 11. Downs Cant of Occlusal Plane (9.3°±3.8°)
	let cantOpVal: number | null = null;
	let cantOpInterp = "Установите Po, Or, U1t, L1t";
	let cantOpStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (Po && Or && op) {
		// Канон Downs Analysis: угол между Франкфуртской горизонталью FH (Po -> Or) и окклюзионной плоскостью OP (p1 -> p2)
		cantOpVal = Math.round(angleBetweenLines(Po, Or, op.p1, op.p2) * 10) / 10;
		cantOpStatus = cantOpVal > 13.1 ? "deviation_high" : cantOpVal < 5.5 ? "deviation_low" : "normal";
		cantOpInterp = cantOpStatus === "normal"
			? "Наклон окклюзионной плоскости в норме (Downs 9.3°±3.8°)"
			: cantOpStatus === "deviation_high"
				? "Крутой наклон окклюзионной плоскости (высокий Cant of OP)"
				: "Пологий наклон окклюзионной плоскости (низкий Cant of OP)";
	}
	measurements.push({
		id: "Downs-CantOP",
		nameRu: "Наклон окклюзионной плоскости Downs (Cant of OP)",
		normMin: 5.5,
		normMax: 13.1,
		unit: "deg",
		value: cantOpVal,
		status: cantOpStatus,
		clinicalInterpretation: cantOpInterp,
		category: "skeletal_vertical",
	});

	// 12. U1-SN (Steiner: 104°±2°)
	let u1SnVal: number | null = null;
	let u1SnInterp = "Установите S, N, U1t, U1a";
	let u1SnStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (S && N && U1t && U1a) {
		u1SnVal = Math.round(angleBetweenLines(S, N, U1t, U1a) * 10) / 10;
		u1SnStatus = u1SnVal > 106 ? "deviation_high" : u1SnVal < 102 ? "deviation_low" : "normal";
		u1SnInterp = u1SnStatus === "normal" ? "Наклон верхних резцов к основанию черепа в норме" : u1SnStatus === "deviation_high" ? "Вестибулярный наклон (протрузия) верхних резцов к SN" : "Палатинальный наклон (ретрузия) верхних резцов к SN";
	}
	measurements.push({
		id: "U1-SN",
		nameRu: "U1-SN (Наклон верхнего резца к основанию черепа)",
		normMin: 102,
		normMax: 106,
		unit: "deg",
		value: u1SnVal,
		status: u1SnStatus,
		clinicalInterpretation: u1SnInterp,
		category: "dental_upper",
	});

	// 13. 1-NA Угол (Steiner: 22°±2°)
	let u1NaAngleVal: number | null = null;
	let u1NaAngleInterp = "Установите N, A, U1t, U1a";
	let u1NaAngleStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && A && U1t && U1a) {
		u1NaAngleVal = Math.round(angleBetweenLines(N, A, U1t, U1a) * 10) / 10;
		u1NaAngleStatus = u1NaAngleVal > 24 ? "deviation_high" : u1NaAngleVal < 20 ? "deviation_low" : "normal";
		u1NaAngleInterp = u1NaAngleStatus === "normal" ? "Инклинация верхнего резца к линии N-A в норме" : u1NaAngleStatus === "deviation_high" ? "Протрузия верхнего резца к N-A" : "Ретрузия верхнего резца к N-A";
	}
	measurements.push({
		id: "1-NA-Angle",
		nameRu: "1-NA (Угол инклинации верхнего резца к линии N-A)",
		normMin: 20,
		normMax: 24,
		unit: "deg",
		value: u1NaAngleVal,
		status: u1NaAngleStatus,
		clinicalInterpretation: u1NaAngleInterp,
		category: "dental_upper",
	});

	// 14. 1-NA Расстояние (Steiner: 4±1 мм)
	let u1NaDistVal: number | null = null;
	let u1NaDistInterp = "Установите N, A, U1t";
	let u1NaDistStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && A && U1t) {
		const proj = projectPointOntoLine(U1t, N, A);
		u1NaDistVal = Math.round(distance(U1t, proj) * scaleMmPerPixel * 10) / 10;
		u1NaDistStatus = u1NaDistVal > 5 ? "deviation_high" : u1NaDistVal < 3 ? "deviation_low" : "normal";
		u1NaDistInterp = u1NaDistStatus === "normal" ? "Положение верхнего резца к линии N-A в норме (4±1 мм)" : u1NaDistStatus === "deviation_high" ? "Переднее положение резца к линии N-A" : "Заднее положение резца к линии N-A";
	}
	measurements.push({
		id: "1-NA-Dist",
		nameRu: "1-NA (Положение режущего края верхнего резца к N-A)",
		normMin: 3,
		normMax: 5,
		unit: "mm",
		value: u1NaDistVal,
		status: u1NaDistStatus,
		clinicalInterpretation: u1NaDistInterp,
		category: "dental_upper",
	});

	// 15. L1-MP / IMPA (Tweed: 90°±3°)
	let l1MpVal: number | null = null;
	let l1MpInterp = "Установите Go, Me, L1t, L1a";
	let l1MpStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (Go && Me && L1t && L1a) {
		l1MpVal = Math.round(angleBetweenLines(Go, Me, L1t, L1a) * 10) / 10;
		l1MpStatus = l1MpVal > 93 ? "deviation_high" : l1MpVal < 87 ? "deviation_low" : "normal";
		l1MpInterp = l1MpStatus === "normal" ? "IMPA в норме (оптимальный наклон нижнего резца к базису НЧ)" : l1MpStatus === "deviation_high" ? "Вестибулярный наклон нижних резцов (протрузия IMPA)" : "Лингвальный наклон нижних резцов (ретрузия IMPA)";
	}
	measurements.push({
		id: "L1-MP",
		nameRu: "IMPA (L1-MP Наклон нижнего резца к плоскости НЧ)",
		normMin: 87,
		normMax: 93,
		unit: "deg",
		value: l1MpVal,
		status: l1MpStatus,
		clinicalInterpretation: l1MpInterp,
		category: "dental_lower",
	});

	// 16. 1-NB Угол (Steiner: 25°±2°)
	let l1NbAngleVal: number | null = null;
	let l1NbAngleInterp = "Установите N, B, L1t, L1a";
	let l1NbAngleStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && B && L1t && L1a) {
		l1NbAngleVal = Math.round(angleBetweenLines(N, B, L1t, L1a) * 10) / 10;
		l1NbAngleStatus = l1NbAngleVal > 27 ? "deviation_high" : l1NbAngleVal < 23 ? "deviation_low" : "normal";
		l1NbAngleInterp = l1NbAngleStatus === "normal" ? "Инклинация нижнего резца к N-B в норме" : l1NbAngleStatus === "deviation_high" ? "Протрузия нижнего резца к N-B" : "Ретрузия нижнего резца к N-B";
	}
	measurements.push({
		id: "1-NB-Angle",
		nameRu: "1-NB (Угол инклинации нижнего резца к линии N-B)",
		normMin: 23,
		normMax: 27,
		unit: "deg",
		value: l1NbAngleVal,
		status: l1NbAngleStatus,
		clinicalInterpretation: l1NbAngleInterp,
		category: "dental_lower",
	});

	// 17. 1-NB Расстояние (Steiner: 4±1 мм)
	let l1NbDistVal: number | null = null;
	let l1NbDistInterp = "Установите N, B, L1t";
	let l1NbDistStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && B && L1t) {
		const proj = projectPointOntoLine(L1t, N, B);
		l1NbDistVal = Math.round(distance(L1t, proj) * scaleMmPerPixel * 10) / 10;
		l1NbDistStatus = l1NbDistVal > 5 ? "deviation_high" : l1NbDistVal < 3 ? "deviation_low" : "normal";
		l1NbDistInterp = l1NbDistStatus === "normal" ? "Положение нижнего резца к линии N-B в норме (4±1 мм)" : l1NbDistStatus === "deviation_high" ? "Переднее положение нижнего резца к N-B" : "Заднее положение нижнего резца к N-B";
	}
	measurements.push({
		id: "1-NB-Dist",
		nameRu: "1-NB (Положение режущего края нижнего резца к N-B)",
		normMin: 3,
		normMax: 5,
		unit: "mm",
		value: l1NbDistVal,
		status: l1NbDistStatus,
		clinicalInterpretation: l1NbDistInterp,
		category: "dental_lower",
	});

	// 18. Межрезцовый угол U1-L1 (131°±5°)
	let u1L1Val: number | null = null;
	let u1L1Interp = "Установите U1t, U1a, L1t, L1a";
	let u1L1Status: CephalometricMeasurement["status"] = "unmeasured";
	if (U1t && U1a && L1t && L1a) {
		u1L1Val = Math.round(angleBetweenLines(U1t, U1a, L1t, L1a) * 10) / 10;
		u1L1Status = u1L1Val > 136 ? "deviation_high" : u1L1Val < 126 ? "deviation_low" : "normal";
		u1L1Interp = u1L1Status === "normal" ? "Межрезцовый угол в норме (гармоничная резцовая окклюзия)" : u1L1Status === "deviation_high" ? "Биретрузия резцов (увеличенный межрезцовый угол)" : "Бипротрузия резцов (уменьшенный межрезцовый угол)";
	}
	measurements.push({
		id: "U1-L1",
		nameRu: "U1-L1 (Межрезцовый угол Interincisal Angle)",
		normMin: 126,
		normMax: 136,
		unit: "deg",
		value: u1L1Val,
		status: u1L1Status,
		clinicalInterpretation: u1L1Interp,
		category: "interincisal",
	});

	// 19. NL-ML (Ricketts: 25°±4°)
	let mmAngleVal: number | null = null;
	let mmInterp = "Установите ANS, PNS, Go, Me";
	let mmStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (ANS && PNS && Go && Me) {
		mmAngleVal = Math.round(angleBetweenLines(ANS, PNS, Go, Me) * 10) / 10;
		mmStatus = mmAngleVal > 29 ? "deviation_high" : mmAngleVal < 21 ? "deviation_low" : "normal";
		mmInterp = mmStatus === "normal" ? "Межбазисный угол в норме (сбалансированная вертикальная высота)" : mmStatus === "deviation_high" ? "Увеличенный межбазисный угол (вертикальный тип)" : "Уменьшенный межбазисный угол (горизонтальный тип)";
	}
	measurements.push({
		id: "NL-ML",
		nameRu: "NL-ML (Межбазисный угол челюстей Ricketts)",
		normMin: 21,
		normMax: 29,
		unit: "deg",
		value: mmAngleVal,
		status: mmStatus,
		clinicalInterpretation: mmInterp,
		category: "skeletal_vertical",
	});

	// 20. McNamara A to N-perp (0 ± 2 мм)
	let mcnamaraAVal: number | null = null;
	let mcnamaraAInterp = "Установите N, A, Po, Or";
	let mcnamaraAStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && A && Po && Or) {
		const fhDir = vector(Po, Or);
		const nPerp = { x: N.x - fhDir.y, y: N.y + fhDir.x };
		const proj = projectPointOntoLine(A, N, nPerp);
		mcnamaraAVal = Math.round(distance(A, proj) * scaleMmPerPixel * 10) / 10;
		mcnamaraAStatus = mcnamaraAVal > 2 ? "deviation_high" : mcnamaraAVal < -2 ? "deviation_low" : "normal";
		mcnamaraAInterp = mcnamaraAStatus === "normal" ? "Базис ВЧ нейтрален к перпендикуляру N" : mcnamaraAStatus === "deviation_high" ? "Верхнечелюстная протрузия по McNamara" : "Верхнечелюстная ретрузия по McNamara";
	}
	measurements.push({
		id: "McNamara-A-Nperp",
		nameRu: "A to N-perp McNamara (Положение ВЧ к перпендикуляру N)",
		normMin: -2,
		normMax: 2,
		unit: "mm",
		value: mcnamaraAVal,
		status: mcnamaraAStatus,
		clinicalInterpretation: mcnamaraAInterp,
		category: "skeletal_sagittal",
	});

	// 21. McNamara Pog to N-perp (-2 ± 2 мм)
	let mcnamaraPogVal: number | null = null;
	let mcnamaraPogInterp = "Установите N, Pog, Po, Or";
	let mcnamaraPogStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (N && Pog && Po && Or) {
		const fhDir = vector(Po, Or);
		const nPerp = { x: N.x - fhDir.y, y: N.y + fhDir.x };
		const proj = projectPointOntoLine(Pog, N, nPerp);
		mcnamaraPogVal = Math.round(distance(Pog, proj) * scaleMmPerPixel * 10) / 10;
		mcnamaraPogStatus = mcnamaraPogVal > 0 ? "deviation_high" : mcnamaraPogVal < -4 ? "deviation_low" : "normal";
		mcnamaraPogInterp = mcnamaraPogStatus === "normal" ? "Подбородок нейтрален к перпендикуляру N" : mcnamaraPogStatus === "deviation_high" ? "Выстояние подбородка вперед" : "Ретропозиция подбородка по McNamara";
	}
	measurements.push({
		id: "McNamara-Pog-Nperp",
		nameRu: "Pog to N-perp McNamara (Положение подбородка)",
		normMin: -4,
		normMax: 0,
		unit: "mm",
		value: mcnamaraPogVal,
		status: mcnamaraPogStatus,
		clinicalInterpretation: mcnamaraPogInterp,
		category: "skeletal_sagittal",
	});

	// 22. FMIA (Tweed: 65°±3°)
	let fmiaVal: number | null = null;
	let fmiaInterp = "Установите Po, Or, Go, Me, L1t, L1a";
	let fmiaStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (fmaVal !== null && l1MpVal !== null) {
		fmiaVal = Math.round((180 - fmaVal - l1MpVal) * 10) / 10;
		fmiaStatus = fmiaVal > 68 ? "deviation_high" : fmiaVal < 62 ? "deviation_low" : "normal";
		fmiaInterp = fmiaStatus === "normal"
			? "FMIA в норме (сбалансированное положение нижнего резца в профиле по Tweed)"
			: fmiaStatus === "deviation_high"
				? "Ретрузия нижнего резца относительно профиля (высокий угол FMIA Tweed)"
				: "Протрузия нижнего резца относительно профиля (низкий угол FMIA Tweed)";
	}
	measurements.push({
		id: "FMIA",
		nameRu: "FMIA Tweed (Угол нижнего резца к франкфуртской горизонтали)",
		normMin: 62,
		normMax: 68,
		unit: "deg",
		value: fmiaVal,
		status: fmiaStatus,
		clinicalInterpretation: fmiaInterp,
		category: "dental_lower",
	});

	// 23. Ricketts E-Line Ls (-4 ± 2 мм)
	let rickettsLsVal: number | null = null;
	let rickettsLsInterp = "Установите Prn, Pog' (Pog), Ls";
	let rickettsLsStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (Prn && PogPrime && Ls) {
		const proj = projectPointOntoLine(Ls, Prn, PogPrime);
		const sign = Ls.x >= proj.x ? 1 : -1;
		rickettsLsVal = Math.round(sign * distance(Ls, proj) * scaleMmPerPixel * 10) / 10;
		rickettsLsStatus = rickettsLsVal > -2 ? "deviation_high" : rickettsLsVal < -6 ? "deviation_low" : "normal";
		rickettsLsInterp = rickettsLsStatus === "normal"
			? "Положение верхней губы к линии Риккетса в норме (-4±2 мм)"
			: rickettsLsStatus === "deviation_high"
				? "Протрузия верхней губы (выстояние за линию E-line)"
				: "Ретрузия верхней губы (западение за линией E-line)";
	}
	measurements.push({
		id: "Ricketts-E-Ls",
		nameRu: "Ricketts E-Line Ls (Верхняя губа к эстетической линии E)",
		normMin: -6,
		normMax: -2,
		unit: "mm",
		value: rickettsLsVal,
		status: rickettsLsStatus,
		clinicalInterpretation: rickettsLsInterp,
		category: "soft_tissue",
	});

	// 24. Ricketts E-Line Li (-2 ± 2 мм)
	let rickettsLiVal: number | null = null;
	let rickettsLiInterp = "Установите Prn, Pog' (Pog), Li";
	let rickettsLiStatus: CephalometricMeasurement["status"] = "unmeasured";
	if (Prn && PogPrime && Li) {
		const proj = projectPointOntoLine(Li, Prn, PogPrime);
		const sign = Li.x >= proj.x ? 1 : -1;
		rickettsLiVal = Math.round(sign * distance(Li, proj) * scaleMmPerPixel * 10) / 10;
		rickettsLiStatus = rickettsLiVal > 0 ? "deviation_high" : rickettsLiVal < -4 ? "deviation_low" : "normal";
		rickettsLiInterp = rickettsLiStatus === "normal"
			? "Положение нижней губы к линии Риккетса в норме (-2±2 мм)"
			: rickettsLiStatus === "deviation_high"
				? "Протрузия нижней губы (выстояние за линию E-line)"
				: "Ретрузия нижней губы (западение за линией E-line)";
	}
	measurements.push({
		id: "Ricketts-E-Li",
		nameRu: "Ricketts E-Line Li (Нижняя губа к эстетической линии E)",
		normMin: -4,
		normMax: 0,
		unit: "mm",
		value: rickettsLiVal,
		status: rickettsLiStatus,
		clinicalInterpretation: rickettsLiInterp,
		category: "soft_tissue",
	});

	// ==========================================
	// 3. КЛИНИЧЕСКИЙ СИНТЕЗ ДИАГНОЗА
	// ==========================================

	const skeletalClass = anbVal === null ? "Undefined" : anbVal > 4.0 ? "Class II" : anbVal < 0.0 ? "Class III" : "Class I";
	const skeletalClassRu = skeletalClass === "Class II"
		? "Скелетный класс II (Дистальное соотношение базисов)"
		: skeletalClass === "Class III"
			? "Скелетный класс III (Мезиальное соотношение базисов)"
			: skeletalClass === "Class I"
				? "Скелетный класс I (Нейтральное гармоничное соотношение)"
				: "Не определен (установите реперные точки)";

	const maxillaryPosition = snaVal === null ? "Undefined" : snaVal > 84 ? "Prognathism" : snaVal < 80 ? "Retrognathism" : "Normal";
	const maxillaryPositionRu = maxillaryPosition === "Prognathism" ? "Верхнечелюстная прогнатия" : maxillaryPosition === "Retrognathism" ? "Верхнечелюстная ретрогнатия" : maxillaryPosition === "Normal" ? "Ортогнатическое положение верхней челюсти" : "Не определено";

	const mandibularPosition = snbVal === null ? "Undefined" : snbVal > 82 ? "Prognathism" : snbVal < 78 ? "Retrognathism" : "Normal";
	const mandibularPositionRu = mandibularPosition === "Prognathism" ? "Нижнечелюстная прогнатия" : mandibularPosition === "Retrognathism" ? "Нижнечелюстная ретрогнатия" : mandibularPosition === "Normal" ? "Ортогнатическое положение нижней челюсти" : "Не определено";

	const growthPattern = snGognVal === null
		? "Undefined"
		: snGognVal > 35 || (fmaVal !== null && fmaVal > 28) || (yAxisVal !== null && yAxisVal > 63.2)
			? "Dolichofacial (Hyperdivergent)"
			: snGognVal < 29 || (fmaVal !== null && fmaVal < 22) || (yAxisVal !== null && yAxisVal < 55.6)
				? "Brachyfacial (Hypodivergent)"
				: "Mesofacial";

	const growthPatternRu = growthPattern === "Dolichofacial (Hyperdivergent)"
		? "Долихофациальный (гипердивергентный, вертикальный вектор роста)"
		: growthPattern === "Brachyfacial (Hypodivergent)"
			? "Брахифациальный (гиподивергентный, горизонтальный вектор роста)"
			: growthPattern === "Mesofacial"
				? "Мезофациальный (нейтральный, сбалансированный тип роста)"
				: "Не определен";

	const upperIncisorInclination = u1SnVal === null ? "Undefined" : u1SnVal > 106 ? "Proclination" : u1SnVal < 102 ? "Retroclination" : "Normal";
	const upperIncisorInclinationRu = upperIncisorInclination === "Proclination" ? "Протрузия (вестибулоокклюзия) резцов" : upperIncisorInclination === "Retroclination" ? "Ретрузия (палатоокклюзия) резцов" : upperIncisorInclination === "Normal" ? "Нормальный наклон" : "Не определен";

	const lowerIncisorInclination = l1MpVal === null ? "Undefined" : l1MpVal > 93 ? "Proclination" : l1MpVal < 87 ? "Retroclination" : "Normal";
	const lowerIncisorInclinationRu = lowerIncisorInclination === "Proclination" ? "Протрузия (вестибулоокклюзия) резцов" : lowerIncisorInclination === "Retroclination" ? "Ретрузия (лингвоокклюзия) резцов" : lowerIncisorInclination === "Normal" ? "Нормальный наклон (IMPA в норме)" : "Не определен";

	const witsRelationshipRu = witsVal === null ? "Wits не рассчитан" : witsVal > 2 ? `Wits = +${witsVal} мм (Скелетный класс II)` : witsVal < -2 ? `Wits = ${witsVal} мм (Скелетный класс III)` : `Wits = ${witsVal >= 0 ? "+" : ""}${witsVal} мм (Скелетный класс I)`;
	const downsConvexityRu = convexityVal === null ? "Выпуклость профиля не оценена" : convexityVal > 5 ? `Выпуклый профиль (+${convexityVal}° по Downs)` : convexityVal < -5 ? `Вогнутый профиль (${convexityVal}° по Downs)` : `Прямой профиль (${convexityVal >= 0 ? "+" : ""}${convexityVal}° по Downs)`;
	const mcnamaraRelationshipRu = mcnamaraAVal === null || mcnamaraPogVal === null ? "Параметры McNamara не рассчитаны" : `McNamara: A to N-perp = ${mcnamaraAVal >= 0 ? "+" : ""}${mcnamaraAVal} мм (${mcnamaraAInterp}), Pog to N-perp = ${mcnamaraPogVal >= 0 ? "+" : ""}${mcnamaraPogVal} мм (${mcnamaraPogInterp})`;
	const u1NaRelationshipRu = u1NaAngleVal === null ? "Соотношение 1-NA не оценено" : `1-NA = ${u1NaAngleVal}° (${u1NaDistVal !== null ? `${u1NaDistVal} мм, ` : ""}${u1NaAngleInterp})`;
	const l1NbRelationshipRu = l1NbAngleVal === null ? "Соотношение 1-NB не оценено" : `1-NB = ${l1NbAngleVal}° (${l1NbDistVal !== null ? `${l1NbDistVal} мм, ` : ""}${l1NbAngleInterp})`;
	const rickettsELineRu = rickettsLsVal === null || rickettsLiVal === null
		? "Эстетическая линия Риккетса не оценена"
		: `Линия Риккетса E-line: верхняя губа = ${rickettsLsVal >= 0 ? "+" : ""}${rickettsLsVal} мм (${rickettsLsInterp}), нижняя губа = ${rickettsLiVal >= 0 ? "+" : ""}${rickettsLiVal} мм (${rickettsLiInterp})`;

	const summaryRu = skeletalClass === "Undefined"
		? "Для построения ортодонтического заключения расставьте все анатомические реперные точки на снимке ТРГ."
		: `${skeletalClassRu}. ${maxillaryPositionRu}, ${mandibularPositionRu}. ${growthPatternRu}. Положение резцов: верхние — ${upperIncisorInclinationRu.toLowerCase()}, нижние — ${lowerIncisorInclinationRu.toLowerCase()}${fmiaVal !== null ? ` (FMIA Tweed = ${fmiaVal}°)` : ""}. ${witsRelationshipRu}. ${downsConvexityRu}. ${mcnamaraRelationshipRu}. ${u1NaRelationshipRu}. ${l1NbRelationshipRu}. ${rickettsELineRu}.`;

	const protocol043Text = `Ортодонтическое заключение ТРГ: ${summaryRu}`;

	const diagnosis: CephalometricDiagnosis = {
		skeletalClass,
		skeletalClassRu,
		maxillaryPosition,
		maxillaryPositionRu,
		mandibularPosition,
		mandibularPositionRu,
		growthPattern,
		growthPatternRu,
		upperIncisorInclination,
		upperIncisorInclinationRu,
		lowerIncisorInclination,
		lowerIncisorInclinationRu,
		rickettsELineRu,
		witsRelationshipRu,
		downsConvexityRu,
		mcnamaraRelationshipRu,
		u1NaRelationshipRu,
		l1NbRelationshipRu,
		summaryRu,
		protocol043Text,
	};

	const placedCount = CEPHALOMETRIC_LANDMARKS.filter((l) => landmarks[l.key] !== undefined).length;
	const totalCount = CEPHALOMETRIC_LANDMARKS.length;
	const isComplete = placedCount >= 10;
	const completionPercentage = totalCount > 0 ? Math.round((placedCount / totalCount) * 100) : 0;

	return {
		measurements,
		diagnosis,
		landmarks,
		scaleMmPerPixel,
		isComplete,
		placedCount,
		totalCount,
		completionPercentage,
	};
}

// ==========================================
// 4. ГЕНЕРАТОРЫ ПРОТОКОЛОВ ДЛЯ ЭМК
// ==========================================

export function generateOrthodonticProtocolText(
	analysis: CephalometricAnalysisResult,
	options?: {
		patientName?: string | undefined;
		doctorName?: string | undefined;
		customScaleMmPerPx?: number | undefined;
	},
): string {
	const pName = options?.patientName || "Пациент";
	const docName = options?.doctorName || "Врач-ортодонт";
	const dateStr = new Date().toLocaleDateString("ru-RU");

	const sna = analysis.measurements.find((m) => m.id === "SNA");
	const snb = analysis.measurements.find((m) => m.id === "SNB");
	const anb = analysis.measurements.find((m) => m.id === "ANB");
	const wits = analysis.measurements.find((m) => m.id === "Wits");
	const fma = analysis.measurements.find((m) => m.id === "FMA");
	const impa = analysis.measurements.find((m) => m.id === "L1-MP");
	const fmia = analysis.measurements.find((m) => m.id === "FMIA");
	const rickettsLs = analysis.measurements.find((m) => m.id === "Ricketts-E-Ls");
	const rickettsLi = analysis.measurements.find((m) => m.id === "Ricketts-E-Li");
	const u1sn = analysis.measurements.find((m) => m.id === "U1-SN");
	const u1l1 = analysis.measurements.find((m) => m.id === "U1-L1");
	const u1naAngle = analysis.measurements.find((m) => m.id === "1-NA-Angle");
	const u1naDist = analysis.measurements.find((m) => m.id === "1-NA-Dist");
	const l1nbAngle = analysis.measurements.find((m) => m.id === "1-NB-Angle");
	const l1nbDist = analysis.measurements.find((m) => m.id === "1-NB-Dist");
	const mcnamaraA = analysis.measurements.find((m) => m.id === "McNamara-A-Nperp");
	const mcnamaraPog = analysis.measurements.find((m) => m.id === "McNamara-Pog-Nperp");

	return `ПРОТОКОЛ ЦЕФАЛОМЕТРИЧЕСКОГО АНАЛИЗА ТРГ В БОКОВОЙ ПРОЕКЦИИ
(Медицинская карта пациента · Штайнер, Твид, Даунс, Якобсон, Макнамара, Риккетс)
Пациент: ${pName}
Врач: ${docName}
Дата исследования: ${dateStr}

1. САГИТТАЛЬНЫЕ СКЕЛЕТНЫЕ СООТНОШЕНИЯ (Steiner, Jacobson, McNamara):
• SNA: ${sna?.value !== null && sna?.value !== undefined ? `${sna.value.toFixed(1)}° (Норма 82°±2°)` : "—"} — ${sna?.clinicalInterpretation || "—"}
• SNB: ${snb?.value !== null && snb?.value !== undefined ? `${snb.value.toFixed(1)}° (Норма 80°±2°)` : "—"} — ${snb?.clinicalInterpretation || "—"}
• ANB: ${anb?.value !== null && anb?.value !== undefined ? `${anb.value.toFixed(1)}° (Норма 2°±2°)` : "—"} — ${anb?.clinicalInterpretation || "—"}
• Wits-число (Wits Appraisal): ${wits?.value !== null && wits?.value !== undefined ? `${wits.value >= 0 ? "+" : ""}${wits.value.toFixed(1)} мм (Норма 0±1 мм)` : "—"} — ${wits?.clinicalInterpretation || "—"}
• A to N-perp (McNamara): ${mcnamaraA?.value !== null && mcnamaraA?.value !== undefined ? `${mcnamaraA.value >= 0 ? "+" : ""}${mcnamaraA.value.toFixed(1)} мм (Норма 0±2 мм)` : "—"} — ${mcnamaraA?.clinicalInterpretation || "—"}
• Pog to N-perp (McNamara): ${mcnamaraPog?.value !== null && mcnamaraPog?.value !== undefined ? `${mcnamaraPog.value >= 0 ? "+" : ""}${mcnamaraPog.value.toFixed(1)} мм (Норма -2±2 мм)` : "—"} — ${mcnamaraPog?.clinicalInterpretation || "—"}
• Скелетный класс: ${analysis.diagnosis.skeletalClassRu}

2. ВЕРТИКАЛЬНЫЕ ПАРАМЕТРЫ И ТИП РОСТА (Tweed, Steiner):
• FMA (Tweed): ${fma?.value !== null && fma?.value !== undefined ? `${fma.value.toFixed(1)}° (Норма 25°±3°)` : "—"} — ${fma?.clinicalInterpretation || "—"}
• Тип роста лицевого скелета: ${analysis.diagnosis.growthPatternRu}

3. ДЕНТАЛЬНЫЕ ПАРАМЕТРЫ И НАКЛОН РЕЗЦОВ (Steiner, Tweed):
• Инклинация верхних резцов к N-A (1-NA угол): ${u1naAngle?.value !== null && u1naAngle?.value !== undefined ? `${u1naAngle.value.toFixed(1)}° (Норма 22°±2°)` : "—"} — ${u1naAngle?.clinicalInterpretation || "—"}
• Положение верхних резцов к N-A (1-NA мм): ${u1naDist?.value !== null && u1naDist?.value !== undefined ? `${u1naDist.value >= 0 ? "+" : ""}${u1naDist.value.toFixed(1)} мм (Норма 4±1 мм)` : "—"} — ${u1naDist?.clinicalInterpretation || "—"}
• Инклинация нижних резцов к N-B (1-NB угол): ${l1nbAngle?.value !== null && l1nbAngle?.value !== undefined ? `${l1nbAngle.value.toFixed(1)}° (Норма 25°±2°)` : "—"} — ${l1nbAngle?.clinicalInterpretation || "—"}
• Положение нижних резцов к N-B (1-NB мм): ${l1nbDist?.value !== null && l1nbDist?.value !== undefined ? `${l1nbDist.value >= 0 ? "+" : ""}${l1nbDist.value.toFixed(1)} мм (Норма 4±1 мм)` : "—"} — ${l1nbDist?.clinicalInterpretation || "—"}
• Инклинация верхних резцов (U1-SN): ${u1sn?.value !== null && u1sn?.value !== undefined ? `${u1sn.value.toFixed(1)}° (Норма 104°±2°)` : "—"} — ${u1sn?.clinicalInterpretation || "—"}
• Наклон нижних резцов IMPA (L1-MP): ${impa?.value !== null && impa?.value !== undefined ? `${impa.value.toFixed(1)}° (Норма 90°±3°)` : "—"} — ${impa?.clinicalInterpretation || "—"}
• Угол FMIA Tweed (L1 к FH): ${fmia?.value !== null && fmia?.value !== undefined ? `${fmia.value.toFixed(1)}° (Норма 65°±3°)` : "—"} — ${fmia?.clinicalInterpretation || "—"}
• Межрезцовый угол (U1-L1): ${u1l1?.value !== null && u1l1?.value !== undefined ? `${u1l1.value.toFixed(1)}° (Норма 131°±5°)` : "—"} — ${u1l1?.clinicalInterpretation || "—"}

4. ЭСТЕТИКА ПРОФИЛЯ И МЯГКИЕ ТКАНИ (Ricketts):
• Линия E-line к верхней губе (Ls): ${rickettsLs?.value !== null && rickettsLs?.value !== undefined ? `${rickettsLs.value >= 0 ? "+" : ""}${rickettsLs.value.toFixed(1)} мм (Норма -4±2 мм)` : "—"} — ${rickettsLs?.clinicalInterpretation || "—"}
• Линия E-line к нижней губе (Li): ${rickettsLi?.value !== null && rickettsLi?.value !== undefined ? `${rickettsLi.value >= 0 ? "+" : ""}${rickettsLi.value.toFixed(1)} мм (Норма -2±2 мм)` : "—"} — ${rickettsLi?.clinicalInterpretation || "—"}

ЗАКЛЮЧЕНИЕ ЦЕФАЛОМЕТРИИ (ТРГ):
${analysis.diagnosis.summaryRu}`;
}

export const generateForm043OrthodonticProtocolText = generateOrthodonticProtocolText;

export function generateConsultationNoteWithoutCeph(
	patientName?: string,
	isImageLoaded = false,
	placedCount = 0,
	totalCount = 16,
): string {
	const dateStr = new Date().toLocaleDateString("ru-RU");
	const imageStatus = isImageLoaded
		? "Боковая ТРГ загружена в систему, прикреплена к электронной медицинской карте."
		: "Направлен на выполнение боковой ТРГ черепа (телерентгенографии).";

	const landmarkStatus =
		placedCount > 0
			? `Установлено анатомических ориентиров: ${placedCount} из ${totalCount}. `
			: "Ориентиры не расставлены (предварительный клинический осмотр). ";

	return `ПЕРВИЧНАЯ ОРТОДОНТИЧЕСКАЯ КОНСУЛЬТАЦИЯ
Дата приёма: ${dateStr}
Пациент: ${patientName || "Пациент"}

1. КЛИНИЧЕСКИЙ ОСМОТР И АНАМНЕЗ:
• Жалобы: нарушение эстетики улыбки, скученность зубных рядов, затрудненное пережёвывание пищи.
• Внешний осмотр: симметрия лица сохранена, носогубные складки умеренно выражены. Смыкание губ без выраженного напряжения.
• Визуальная оценка профиля: гармоничный / умеренно выпуклый профиль.
• Осмотр полости рта: слизистая оболочка бледно-розовая, умеренно увлажнена. Прикрепление уздечек губ и языка в пределах нормы.

2. ДИАГНОСТИЧЕСКИЙ СТАТУС (ТРГ / ТЕЛЕРЕНТГЕНОГРАФИЯ):
• ${imageStatus}
• ${landmarkStatus}Полный угловой цефалометрический расчет Штайнера/Твида/Риккетса отложен на этап детального цифрового моделирования (Setup) и не блокирует текущую консультацию.

3. ПРЕДВАРИТЕЛЬНЫЙ ДИАГНОЗ:
• Нарушение положения отдельных зубов и соотношения зубных дуг.
• Окончательный диагноз и план ортодонтического лечения формируются после проведения расчета ТРГ и фотометрии.

4. РЕКОМЕНДАЦИИ И НАЗНАЧЕНИЯ:
• Проведение цифровой фотометрии лица и зубных рядов (8 стандартных проекций).
• Снятие оптических оттисков (3D интраоральное сканирование) для биометрического анализа моделей.
• Контрольный приём для согласования плана ортодонтического лечения.`;
}
