import { Point2D, radiansToDegrees } from './vectorGeometry';

export function calculateInterpupillaryTilt(leftEye: Point2D, rightEye: Point2D): number {
	const dx = rightEye.x - leftEye.x;
	const dy = rightEye.y - leftEye.y;
	if (dx === 0 && dy === 0) return 0;
	return radiansToDegrees(Math.atan2(dy, dx));
}

export function calculateFrankfurtHorizontalTilt(porion: Point2D, orbitale: Point2D): number {
	const dx = orbitale.x - porion.x;
	const dy = orbitale.y - porion.y;
	if (dx === 0 && dy === 0) return 0;
	return radiansToDegrees(Math.atan2(dy, dx));
}

export function calculateCamperTilt(tragus: Point2D, alaNasi: Point2D): number {
	const dx = alaNasi.x - tragus.x;
	const dy = alaNasi.y - tragus.y;
	if (dx === 0 && dy === 0) return 0;
	return radiansToDegrees(Math.atan2(dy, dx));
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
	const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
	return { rotationDegrees, center };
}

export interface BipupillaryAlignmentResult {
	angleDegrees: number;
	center: Point2D;
	distancePx: number;
	isLevel: boolean;
	correctionAngleDegrees: number;
}

export function calculateBipupillaryAlignment(
	leftPupil: Point2D,
	rightPupil: Point2D,
	levelToleranceDegrees = 0.5
): BipupillaryAlignmentResult {
	const dx = rightPupil.x - leftPupil.x;
	const dy = rightPupil.y - leftPupil.y;
	const distancePx = Math.sqrt(dx * dx + dy * dy);
	if (distancePx === 0) {
		return { angleDegrees: 0, center: { ...leftPupil }, distancePx: 0, isLevel: true, correctionAngleDegrees: 0 };
	}
	const angleDegrees = radiansToDegrees(Math.atan2(dy, dx));
	const isLevel = Math.abs(angleDegrees) <= levelToleranceDegrees;
	const center = { x: (leftPupil.x + rightPupil.x) / 2, y: (leftPupil.y + rightPupil.y) / 2 };
	const angleRounded = Math.round(angleDegrees * 100) / 100 || 0;
	return {
		angleDegrees: angleRounded,
		center,
		distancePx: Math.round(distancePx * 10) / 10,
		isLevel,
		correctionAngleDegrees: Math.round(-angleRounded * 100) / 100 || 0,
	};
}

export interface IncisalEdgeAlignmentResult {
	cantingAngleDegrees: number;
	cantingDirection: 'left_high' | 'right_high' | 'level';
	isWithinTolerance: boolean;
	cantingMm: number;
	descriptionRu: string;
}

export function calculateIncisalEdgeAlignment(
	leftIncisalCorner: Point2D,
	rightIncisalCorner: Point2D,
	referenceAngleDegrees = 0,
	toleranceDegrees = 1.0,
	pixelToMmScale = 0.05
): IncisalEdgeAlignmentResult {
	const dx = rightIncisalCorner.x - leftIncisalCorner.x;
	const dy = rightIncisalCorner.y - leftIncisalCorner.y;
	if (dx === 0 && dy === 0) {
		return { cantingAngleDegrees: 0, cantingDirection: 'level', isWithinTolerance: true, cantingMm: 0, descriptionRu: 'Резцовая линия строго горизонтальна' };
	}
	const rawAngle = radiansToDegrees(Math.atan2(dy, dx));
	const cantingAngleDegrees = Math.round((rawAngle - referenceAngleDegrees) * 100) / 100 || 0;
	const cantingMm = Math.round(Math.abs(dy * pixelToMmScale) * 10) / 10;
	const isWithinTolerance = Math.abs(cantingAngleDegrees) <= toleranceDegrees;

	let cantingDirection: 'left_high' | 'right_high' | 'level' = 'level';
	let descriptionRu = 'Резцовая линия сбалансирована (угол в пределах нормы)';

	if (cantingAngleDegrees > toleranceDegrees) {
		cantingDirection = 'left_high';
		descriptionRu = `Крен резцовой линии (наклон вправо вниз на ${cantingAngleDegrees.toFixed(1)}°, ~${cantingMm} мм)`;
	} else if (cantingAngleDegrees < -toleranceDegrees) {
		cantingDirection = 'right_high';
		descriptionRu = `Крен резцовой линии (наклон влево вниз на ${Math.abs(cantingAngleDegrees).toFixed(1)}°, ~${cantingMm} мм)`;
	}

	return { cantingAngleDegrees, cantingDirection, isWithinTolerance, cantingMm, descriptionRu };
}
