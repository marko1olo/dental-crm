/**
 * Clinical Dental Photography & Orthodontic Photo Protocol Math Engine
 * 
 * Includes:
 * 1. 2D Vector Geometry & Coordinate Projections
 * 2. Interpupillary & Frankfurt Horizontal Auto-Leveling Tilt Calculations
 * 3. Aesthetic Smile Ratios: Golden Proportion (1.618), Ricketts E-Line, Smile Arc Curvature
 * 4. Before/After Comparison Math: Split slider clips, Dual-landmark 2D Similarity Transform Registration
 * 5. Aspect Ratio Fitting & Mirror Transformations
 * 6. VITA Classical & VITA 3D-Master Colorimetry: sRGB <-> CIELAB, Delta E (CIE76 & CIE2000)
 */

import type {
	ColorRGB,
	ColorLab,
	VitaShade,
	VitaSystemType
} from './vitaShadesCatalog';
import {
	rgbToLab,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	ALL_VITA_SHADES
} from './vitaShadesCatalog';

export type {
	ColorRGB,
	ColorLab,
	VitaShade,
	VitaSystemType
};
export {
	rgbToLab,
	VITA_CLASSICAL_SHADES,
	VITA_3D_MASTER_SHADES,
	ALL_VITA_SHADES
};

export interface Point2D {
	x: number;
	y: number;
}

export interface Transform2D {
	translateX: number;
	translateY: number;
	scale: number;
	rotationDegrees: number;
}

// ---------------------------------------------------------------------------
// 1. Vector & 2D Geometry Operations
// ---------------------------------------------------------------------------

export function vector(p1: Point2D, p2: Point2D): Point2D {
	return {
		x: p2.x - p1.x,
		y: p2.y - p1.y,
	};
}

export function vectorLength(v: Point2D): number {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function distance(p1: Point2D, p2: Point2D): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	return Math.sqrt(dx * dx + dy * dy);
}

export function dotProduct(v1: Point2D, v2: Point2D): number {
	return v1.x * v2.x + v1.y * v2.y;
}

export function crossProduct2D(v1: Point2D, v2: Point2D): number {
	return v1.x * v2.y - v1.y * v2.x;
}

export function clamp(val: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, val));
}

export function radiansToDegrees(rad: number): number {
	return (rad * 180) / Math.PI;
}

export function degreesToRadians(deg: number): number {
	return (deg * Math.PI) / 180;
}

export function angleBetweenVectors(v1: Point2D, v2: Point2D): number {
	const len1 = vectorLength(v1);
	const len2 = vectorLength(v2);
	if (len1 === 0 || len2 === 0) return 0;
	const cosTheta = clamp(dotProduct(v1, v2) / (len1 * len2), -1, 1);
	return radiansToDegrees(Math.acos(cosTheta));
}

export function angle3Points(p1: Point2D, vertex: Point2D, p2: Point2D): number {
	const v1 = vector(vertex, p1);
	const v2 = vector(vertex, p2);
	return angleBetweenVectors(v1, v2);
}

export function angleBetweenLines(
	l1_p1: Point2D,
	l1_p2: Point2D,
	l2_p1: Point2D,
	l2_p2: Point2D
): number {
	const v1 = vector(l1_p1, l1_p2);
	const v2 = vector(l2_p1, l2_p2);
	return angleBetweenVectors(v1, v2);
}

export function projectPointOntoLine(
	point: Point2D,
	lineStart: Point2D,
	lineEnd: Point2D
): Point2D {
	const lineVec = vector(lineStart, lineEnd);
	const pointVec = vector(lineStart, point);
	const lineLenSq = lineVec.x * lineVec.x + lineVec.y * lineVec.y;
	if (lineLenSq === 0) return { ...lineStart };

	const t = dotProduct(pointVec, lineVec) / lineLenSq;
	return {
		x: lineStart.x + t * lineVec.x,
		y: lineStart.y + t * lineVec.y,
	};
}

/**
 * Signed perpendicular distance from a point to a 2D line.
 * Uses rightward normal convention: points to the right of line direction have positive distance,
 * points to the left have negative distance.
 */
export function signedDistanceToLine(
	point: Point2D,
	lineStart: Point2D,
	lineEnd: Point2D
): number {
	const lineVec = vector(lineStart, lineEnd);
	const len = vectorLength(lineVec);
	if (len === 0) return distance(point, lineStart);
	const dx = point.x - lineStart.x;
	const dy = point.y - lineStart.y;
	return (dx * lineVec.y - dy * lineVec.x) / len;
}

// ---------------------------------------------------------------------------
// 2. Interpupillary & Frankfurt Horizontal Auto-Leveling Math
// ---------------------------------------------------------------------------

/**
 * Calculates rotation tilt angle (in degrees) needed to level interpupillary line horizontally.
 */
export function calculateInterpupillaryTilt(leftEye: Point2D, rightEye: Point2D): number {
	const dx = rightEye.x - leftEye.x;
	const dy = rightEye.y - leftEye.y;
	if (dx === 0 && dy === 0) return 0;
	const angleRad = Math.atan2(dy, dx);
	return radiansToDegrees(angleRad);
}

/**
 * Calculates rotation tilt angle (in degrees) to align Frankfurt Horizontal Plane (Porion -> Orbitale) horizontally.
 */
export function calculateFrankfurtHorizontalTilt(porion: Point2D, orbitale: Point2D): number {
	const dx = orbitale.x - porion.x;
	const dy = orbitale.y - porion.y;
	if (dx === 0 && dy === 0) return 0;
	const angleRad = Math.atan2(dy, dx);
	return radiansToDegrees(angleRad);
}

/**
 * Calculates Camper Plane tilt angle (Tragus of ear to Ala of nose).
 */
export function calculateCamperTilt(tragus: Point2D, alaNasi: Point2D): number {
	const dx = alaNasi.x - tragus.x;
	const dy = alaNasi.y - tragus.y;
	if (dx === 0 && dy === 0) return 0;
	const angleRad = Math.atan2(dy, dx);
	return radiansToDegrees(angleRad);
}

export function calculateAutoLevelTransform(
	p1: Point2D,
	p2: Point2D,
	targetAngleDegrees = 0
): { rotationDegrees: number; center: Point2D } {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const currentAngle = radiansToDegrees(Math.atan2(dy, dx));
	const rotationDegrees = targetAngleDegrees - currentAngle;
	const center = {
		x: (p1.x + p2.x) / 2,
		y: (p1.y + p2.y) / 2,
	};
	return { rotationDegrees, center };
}

// ---------------------------------------------------------------------------
// 3. Aesthetic Smile Ratios & Facial Planes
// ---------------------------------------------------------------------------

export const GOLDEN_RATIO = 1.61803398875;

export interface GoldenProportionResult {
	goldenRatio: number;
	centralIncisorWidth: number;
	lateralIncisorWidth: number;
	canineWidth: number;
	idealLateralWidth: number;
	idealCanineWidth: number;
	lateralRatioToCentral: number; // Ideal: ~0.618
	canineRatioToLateral: number;  // Ideal: ~0.618
	lateralDeviationPercent: number;
	canineDeviationPercent: number;
	isWithinGoldenTolerance: boolean; // Tolerance <= 10%
}

/**
 * Evaluates Levin / Lombardi Golden Proportion of anterior teeth visible in frontal view.
 */
export function calculateGoldenProportionDeviation(
	centralIncisorWidth: number,
	lateralIncisorWidth: number,
	canineWidth: number,
	tolerancePercent = 10
): GoldenProportionResult {
	const central = Math.max(0.1, centralIncisorWidth);
	const lateral = Math.max(0.1, lateralIncisorWidth);
	const canine = Math.max(0.1, canineWidth);

	const idealLateral = central / GOLDEN_RATIO;
	const idealCanine = idealLateral / GOLDEN_RATIO;

	const lateralRatioToCentral = lateral / central;
	const canineRatioToLateral = canine / lateral;

	const lateralDeviationPercent = Math.abs((lateral - idealLateral) / idealLateral) * 100;
	const canineDeviationPercent = Math.abs((canine - idealCanine) / idealCanine) * 100;

	const isWithinGoldenTolerance =
		lateralDeviationPercent <= tolerancePercent && canineDeviationPercent <= tolerancePercent;

	return {
		goldenRatio: GOLDEN_RATIO,
		centralIncisorWidth: central,
		lateralIncisorWidth: lateral,
		canineWidth: canine,
		idealLateralWidth: idealLateral,
		idealCanineWidth: idealCanine,
		lateralRatioToCentral,
		canineRatioToLateral,
		lateralDeviationPercent,
		canineDeviationPercent,
		isWithinGoldenTolerance,
	};
}

export interface RickettsELineResult {
	upperLipDistanceMm: number;
	lowerLipDistanceMm: number;
	upperLipStatus: 'retruche' | 'norm' | 'protruche';
	lowerLipStatus: 'retruche' | 'norm' | 'protruche';
	upperLipNormDeviationMm: number;
	lowerLipNormDeviationMm: number;
}

/**
 * Evaluates Ricketts Esthetic E-Line (Pronasale tip of nose to Pogonion chin point).
 */
export function calculateRickettsELine(
	pronasale: Point2D,
	pogonion: Point2D,
	upperLip: Point2D,
	lowerLip: Point2D,
	pixelToMmScale = 0.1
): RickettsELineResult {
	const upperDistPx = signedDistanceToLine(upperLip, pronasale, pogonion);
	const lowerDistPx = signedDistanceToLine(lowerLip, pronasale, pogonion);

	const upperDistMm = upperDistPx * pixelToMmScale;
	const lowerDistMm = lowerDistPx * pixelToMmScale;

	let upperLipStatus: 'retruche' | 'norm' | 'protruche' = 'norm';
	if (upperDistMm < -6.0) upperLipStatus = 'retruche';
	else if (upperDistMm > -2.0) upperLipStatus = 'protruche';

	let lowerLipStatus: 'retruche' | 'norm' | 'protruche' = 'norm';
	if (lowerDistMm < -4.0) lowerLipStatus = 'retruche';
	else if (lowerDistMm > 0.0) lowerLipStatus = 'protruche';

	return {
		upperLipDistanceMm: upperDistMm,
		lowerLipDistanceMm: lowerDistMm,
		upperLipStatus,
		lowerLipStatus,
		upperLipNormDeviationMm: upperDistMm - (-4.0),
		lowerLipNormDeviationMm: lowerDistMm - (-2.0),
	};
}

export interface SmileArcResult {
	curvatureType: 'consonant' | 'flat' | 'reverse';
	symmetryScore: number; // 0 to 100%
	curvatureDepthPx: number;
	descriptionRu: string;
}

/**
 * Calculates smile arc curvature relative to commissural line.
 */
export function calculateSmileLineCurvature(
	commissureLeft: Point2D,
	commissureRight: Point2D,
	incisalEdges: Point2D[]
): SmileArcResult {
	if (!incisalEdges || incisalEdges.length === 0) {
		return {
			curvatureType: 'flat',
			symmetryScore: 100,
			curvatureDepthPx: 0,
			descriptionRu: 'Нет данных о режущих краях',
		};
	}

	let sumSignedDist = 0;
	let leftDepth = 0;
	let rightDepth = 0;
	let countLeft = 0;
	let countRight = 0;
	const midX = (commissureLeft.x + commissureRight.x) / 2;

	for (const edge of incisalEdges) {
		const dist = signedDistanceToLine(edge, commissureLeft, commissureRight);
		sumSignedDist += dist;
		if (edge.x < midX - 2) {
			leftDepth += Math.abs(dist);
			countLeft++;
		} else if (edge.x > midX + 2) {
			rightDepth += Math.abs(dist);
			countRight++;
		}
	}

	const avgSignedDist = sumSignedDist / incisalEdges.length;
	const avgLeft = countLeft > 0 ? leftDepth / countLeft : Math.abs(avgSignedDist);
	const avgRight = countRight > 0 ? rightDepth / countRight : Math.abs(avgSignedDist);

	const maxDepth = Math.max(avgLeft, avgRight, 1);
	const diff = Math.abs(avgLeft - avgRight);
	const symmetryScore = Math.max(0, Math.min(100, Math.round((1 - diff / maxDepth) * 100)));

	let curvatureType: 'consonant' | 'flat' | 'reverse' = 'consonant';
	let descriptionRu = 'Консонантная (гармоничная) дуга улыбки повторяет изгиб нижней губы';

	if (Math.abs(avgSignedDist) < 3) {
		curvatureType = 'flat';
		descriptionRu = 'Прямая (уплощенная) линия улыбки — снижение резцового перекрытия';
	} else if (avgSignedDist > 3) {
		curvatureType = 'reverse';
		descriptionRu = 'Обратная (инвертированная) линия улыбки — режущие края выше уголков рта';
	}

	return {
		curvatureType,
		symmetryScore,
		curvatureDepthPx: avgSignedDist,
		descriptionRu,
	};
}

// ---------------------------------------------------------------------------
// 4. Before / After Comparison Math
// ---------------------------------------------------------------------------

export function calculateSplitClipPath(
	sliderPercent: number,
	direction: 'vertical' | 'horizontal' = 'vertical'
): string {
	const clamped = clamp(sliderPercent, 0, 100);
	if (direction === 'vertical') {
		return `polygon(${clamped}% 0%, 100% 0%, 100% 100%, ${clamped}% 100%)`;
	} else {
		return `polygon(0% ${clamped}%, 100% ${clamped}%, 100% 100%, 0% ${clamped}%)`;
	}
}

export function calculateSimilarityTransform(
	beforePoints: [Point2D, Point2D],
	afterPoints: [Point2D, Point2D]
): Transform2D {
	const [b1, b2] = beforePoints;
	const [a1, a2] = afterPoints;

	const bVec = vector(b1, b2);
	const aVec = vector(a1, a2);

	const bLen = vectorLength(bVec);
	const aLen = vectorLength(aVec);

	if (aLen === 0 || bLen === 0) {
		return {
			translateX: 0,
			translateY: 0,
			scale: 1,
			rotationDegrees: 0,
		};
	}

	const scale = bLen / aLen;
	const bAngle = Math.atan2(bVec.y, bVec.x);
	const aAngle = Math.atan2(aVec.y, aVec.x);
	const rotRad = bAngle - aAngle;
	const rotationDegrees = radiansToDegrees(rotRad);

	const bMid = { x: (b1.x + b2.x) / 2, y: (b1.y + b2.y) / 2 };
	const aMid = { x: (a1.x + a2.x) / 2, y: (a1.y + a2.y) / 2 };

	const cosR = Math.cos(rotRad);
	const sinR = Math.sin(rotRad);
	const aMidRotX = (aMid.x * cosR - aMid.y * sinR) * scale;
	const aMidRotY = (aMid.x * sinR + aMid.y * cosR) * scale;

	const translateX = bMid.x - aMidRotX;
	const translateY = bMid.y - aMidRotY;

	return {
		translateX,
		translateY,
		scale,
		rotationDegrees,
	};
}

export function calculateBlendDifferenceScore(rgbA: ColorRGB, rgbB: ColorRGB): number {
	const dr = rgbA.r - rgbB.r;
	const dg = rgbA.g - rgbB.g;
	const db = rgbA.b - rgbB.b;
	return Math.sqrt(dr * dr + dg * dg + db * db) / 441.67;
}

// ---------------------------------------------------------------------------
// 5. Aspect Ratio, Cropping, and Mirroring
// ---------------------------------------------------------------------------

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export function calculateCropBoundingBox(
	imageWidth: number,
	imageHeight: number,
	targetAspectRatio: number
): BoundingBox {
	if (imageWidth <= 0 || imageHeight <= 0 || targetAspectRatio <= 0) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}

	const currentRatio = imageWidth / imageHeight;
	let cropW = imageWidth;
	let cropH = imageHeight;

	if (currentRatio > targetAspectRatio) {
		cropW = imageHeight * targetAspectRatio;
	} else {
		cropH = imageWidth / targetAspectRatio;
	}

	return {
		x: (imageWidth - cropW) / 2,
		y: (imageHeight - cropH) / 2,
		width: cropW,
		height: cropH,
	};
}

export function fitImageIntoContainer(
	imageWidth: number,
	imageHeight: number,
	containerWidth: number,
	containerHeight: number,
	fit: 'contain' | 'cover' = 'contain'
): { width: number; height: number; scale: number; offsetX: number; offsetY: number } {
	if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
		return { width: 0, height: 0, scale: 1, offsetX: 0, offsetY: 0 };
	}

	const scaleX = containerWidth / imageWidth;
	const scaleY = containerHeight / imageHeight;
	const scale = fit === 'contain' ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);

	const width = imageWidth * scale;
	const height = imageHeight * scale;
	const offsetX = (containerWidth - width) / 2;
	const offsetY = (containerHeight - height) / 2;

	return { width, height, scale, offsetX, offsetY };
}

export function mirrorCoordinates(
	point: Point2D,
	axis: 'horizontal' | 'vertical',
	containerSize: { width: number; height: number }
): Point2D {
	if (axis === 'horizontal') {
		return {
			x: containerSize.width - point.x,
			y: point.y,
		};
	} else {
		return {
			x: point.x,
			y: containerSize.height - point.y,
		};
	}
}

// ---------------------------------------------------------------------------
// 6. VITA Tooth Shade Matching Engine (sRGB <-> CIELAB & Delta E)
// ---------------------------------------------------------------------------

function labInvF(t: number): number {
	const delta = 6 / 29;
	return t > delta ? t * t * t : 3 * delta * delta * (t - 4 / 29);
}

function linearToSRGB(c: number): number {
	const val = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
	return Math.max(0, Math.min(255, Math.round(val * 255)));
}

export function labToRgb(lab: ColorLab): ColorRGB {
	const fy = (lab.L + 16) / 116;
	const fx = lab.a / 500 + fy;
	const fz = fy - lab.b / 200;

	let x = 0.95047 * labInvF(fx);
	let y = 1.00000 * labInvF(fy);
	let z = 1.08883 * labInvF(fz);

	const rLinear = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
	const gLinear = x * -0.9692660 + y * 1.8760108 + z * 0.0415560;
	const bLinear = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;

	return {
		r: linearToSRGB(rLinear),
		g: linearToSRGB(gLinear),
		b: linearToSRGB(bLinear),
	};
}

export function colorDistanceDeltaE76(lab1: ColorLab, lab2: ColorLab): number {
	const dL = lab1.L - lab2.L;
	const da = lab1.a - lab2.a;
	const db = lab1.b - lab2.b;
	return Math.sqrt(dL * dL + da * da + db * db);
}

export function colorDistanceDeltaE2000(lab1: ColorLab, lab2: ColorLab): number {
	const L1 = lab1.L, a1 = lab1.a, b1 = lab1.b;
	const L2 = lab2.L, a2 = lab2.a, b2 = lab2.b;

	const avgL = (L1 + L2) / 2;
	const C1 = Math.sqrt(a1 * a1 + b1 * b1);
	const C2 = Math.sqrt(a2 * a2 + b2 * b2);
	const avgC = (C1 + C2) / 2;

	const G = 0.5 * (1 - Math.sqrt(Math.pow(avgC, 7) / (Math.pow(avgC, 7) + Math.pow(25, 7))));
	const a1p = (1 + G) * a1;
	const a2p = (1 + G) * a2;

	const C1p = Math.sqrt(a1p * a1p + b1 * b1);
	const C2p = Math.sqrt(a2p * a2p + b2 * b2);
	const avgCp = (C1p + C2p) / 2;

	let h1p = Math.atan2(b1, a1p);
	if (h1p < 0) h1p += 2 * Math.PI;
	let h2p = Math.atan2(b2, a2p);
	if (h2p < 0) h2p += 2 * Math.PI;

	let dhp: number;
	if (Math.abs(h1p - h2p) <= Math.PI) {
		dhp = h2p - h1p;
	} else if (h2p <= h1p) {
		dhp = h2p - h1p + 2 * Math.PI;
	} else {
		dhp = h2p - h1p - 2 * Math.PI;
	}

	const dLp = L2 - L1;
	const dCp = C2p - C1p;
	const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp / 2);

	let avghp = (h1p + h2p) / 2;
	if (Math.abs(h1p - h2p) > Math.PI) {
		if (h1p + h2p < 2 * Math.PI) {
			avghp += Math.PI;
		} else {
			avghp -= Math.PI;
		}
	}

	const T =
		1 -
		0.17 * Math.cos(avghp - degreesToRadians(30)) +
		0.24 * Math.cos(2 * avghp) +
		0.32 * Math.cos(3 * avghp + degreesToRadians(6)) -
		0.20 * Math.cos(4 * avghp - degreesToRadians(63));

	const dTheta = degreesToRadians(30) * Math.exp(-Math.pow((radiansToDegrees(avghp) - 275) / 25, 2));
	const RC = 2 * Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7)));
	const SL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
	const SC = 1 + 0.045 * avgCp;
	const SH = 1 + 0.015 * avgCp * T;
	const RT = -Math.sin(2 * dTheta) * RC;

	const deltaE = Math.sqrt(
		Math.pow(dLp / SL, 2) +
		Math.pow(dCp / SC, 2) +
		Math.pow(dHp / SH, 2) +
		RT * (dCp / SC) * (dHp / SH)
	);

	return deltaE;
}

export interface ShadeMatchResult {
	shade: VitaShade;
	deltaE00: number; // Delta E 2000
	deltaE76: number; // Delta E 76
	matchConfidencePercent: number; // 0 to 100%
	deltaEQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
	deltaEQualityRu: string;
	topCandidates: Array<{ shade: VitaShade; deltaE00: number }>;
}

export function findClosestVitaShade(
	rgb: ColorRGB,
	system: 'classical' | '3d_master' | 'all' = 'all'
): ShadeMatchResult {
	const sampleLab = rgbToLab(rgb);

	let candidates = ALL_VITA_SHADES;
	if (system === 'classical') {
		candidates = VITA_CLASSICAL_SHADES;
	} else if (system === '3d_master') {
		candidates = VITA_3D_MASTER_SHADES;
	}

	const evaluated = candidates.map(shade => {
		const de00 = colorDistanceDeltaE2000(sampleLab, shade.lab);
		const de76 = colorDistanceDeltaE76(sampleLab, shade.lab);
		return { shade, deltaE00: de00, deltaE76: de76 };
	});

	evaluated.sort((a, b) => a.deltaE00 - b.deltaE00);
	const defaultShade = VITA_CLASSICAL_SHADES[0] as VitaShade;
	const best = evaluated[0] ?? { shade: defaultShade, deltaE00: 0, deltaE76: 0 };

	let deltaEQuality: 'excellent' | 'good' | 'acceptable' | 'poor' = 'poor';
	let deltaEQualityRu = 'Требуется перекалибровка освещения';

	if (best.deltaE00 < 1.2) {
		deltaEQuality = 'excellent';
		deltaEQualityRu = 'Идеальное клиническое совпадение (ΔE < 1.2)';
	} else if (best.deltaE00 < 2.7) {
		deltaEQuality = 'good';
		deltaEQualityRu = 'Хорошее совпадение оттенка (ΔE < 2.7)';
	} else if (best.deltaE00 < 4.0) {
		deltaEQuality = 'acceptable';
		deltaEQualityRu = 'Приемлемый оттенок (ΔE < 4.0)';
	}

	const matchConfidence = Math.max(0, Math.min(100, Math.round(100 - best.deltaE00 * 15)));

	return {
		shade: best.shade,
		deltaE00: best.deltaE00,
		deltaE76: best.deltaE76,
		matchConfidencePercent: matchConfidence,
		deltaEQuality,
		deltaEQualityRu,
		topCandidates: evaluated.slice(0, 3).map(e => ({ shade: e.shade, deltaE00: e.deltaE00 })),
	};
}

export function sortShadesByLightness(shades: VitaShade[]): VitaShade[] {
	return [...shades].sort((a, b) => b.lab.L - a.lab.L);
}

export function classifyHueGroup(rgb: ColorRGB): 'A' | 'B' | 'C' | 'D' | 'Bleach' {
	const best = findClosestVitaShade(rgb, 'classical');
	if (best.shade.hueGroup === 'Bleach') return 'Bleach';
	if (best.shade.hueGroup === 'A') return 'A';
	if (best.shade.hueGroup === 'B') return 'B';
	if (best.shade.hueGroup === 'C') return 'C';
	if (best.shade.hueGroup === 'D') return 'D';
	return 'A';
}
