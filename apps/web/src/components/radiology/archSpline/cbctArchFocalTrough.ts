import type { Point2D } from "../cbctCaliperNerveMath";
import { calculateArchTangentsAndNormals } from "./cbctArchTangentsNormals";

export interface VariableFocalTroughOptions {
	readonly anteriorThicknessMm?: number;
	readonly premolarThicknessMm?: number;
	readonly molarThicknessMm?: number;
	readonly enabled?: boolean;
}

/** Calculates continuous variable focal trough thickness along the dental arch (incisors ~9mm, molars ~20mm). */
export function calculateVariableTroughThicknessMm(
	distanceAlongArchMm: number,
	totalArchLengthMm: number,
	options?: VariableFocalTroughOptions,
): number {
	const ant = options?.anteriorThicknessMm ?? 9.0;
	const premolar = options?.premolarThicknessMm ?? 13.0;
	const molar = options?.molarThicknessMm ?? 20.0;

	if (totalArchLengthMm <= 0) return ant;
	const s = Math.max(0, Math.min(1, distanceAlongArchMm / totalArchLengthMm));
	const u = Math.abs(2.0 * (s - 0.5));

	if (u <= 0.5) {
		const t = u / 0.5;
		const smoothT = t * t * (3.0 - 2.0 * t);
		return Number((ant + (premolar - ant) * smoothT).toFixed(2));
	} else {
		const t = (u - 0.5) / 0.5;
		const smoothT = t * t * (3.0 - 2.0 * t);
		return Number((premolar + (molar - premolar) * smoothT).toFixed(2));
	}
}

/** Computes parallel inner and outer boundary curves of the focal trough offset along normal vectors. */
export function getFocalTroughBoundaryCurves(
	spline: readonly Point2D[],
	thicknessMm: number,
	anteriorTroughRatio: number | VariableFocalTroughOptions = 1.0,
	variableOptions?: VariableFocalTroughOptions,
): {
	innerBoundary: Point2D[];
	outerBoundary: Point2D[];
} {
	const isOptionsObj = typeof anteriorTroughRatio === "object" && anteriorTroughRatio !== null;
	const varOpts = variableOptions ?? (isOptionsObj ? anteriorTroughRatio : undefined);
	const numRatio = isOptionsObj ? 1.0 : (typeof anteriorTroughRatio === "number" && Number.isFinite(anteriorTroughRatio) ? anteriorTroughRatio : 1.0);

	const validThickness = Number.isFinite(thicknessMm) && thicknessMm > 0 ? thicknessMm : 12.0;
	const halfThickness = validThickness / 2.0;
	const vectorField = calculateArchTangentsAndNormals(spline);
	const innerBoundary: Point2D[] = [];
	const outerBoundary: Point2D[] = [];

	const totalLengthMm = vectorField.length > 0 ? (vectorField[vectorField.length - 1]?.distanceAlongArchMm || 100.0) : 100.0;
	const halfArchLength = totalLengthMm > 0 ? totalLengthMm / 2.0 : 50.0;
	const ratioClamped = Math.max(0.1, Math.min(1.0, numRatio));

	for (const node of vectorField) {
		let effHalf = halfThickness;
		if (varOpts?.enabled) {
			effHalf = calculateVariableTroughThicknessMm(node.distanceAlongArchMm, totalLengthMm, varOpts) / 2.0;
		} else if (ratioClamped < 1.0 && halfArchLength > 0) {
			const centerNorm = Math.min(1.0, Math.abs(node.distanceAlongArchMm - halfArchLength) / halfArchLength);
			const t = Math.max(0, Math.min(1, (centerNorm - 0.15) / 0.35));
			const taper = ratioClamped + (1.0 - ratioClamped) * (t * t * (3 - 2 * t));
			effHalf = halfThickness * taper;
		}

		innerBoundary.push({
			x: Number((node.point.x - node.normal.x * effHalf).toFixed(2)),
			y: Number((node.point.y - node.normal.y * effHalf).toFixed(2)),
		});
		outerBoundary.push({
			x: Number((node.point.x + node.normal.x * effHalf).toFixed(2)),
			y: Number((node.point.y + node.normal.y * effHalf).toFixed(2)),
		});
	}

	return { innerBoundary, outerBoundary };
}
