import { Point2D, signedDistanceToLine } from './vectorGeometry';

export const GOLDEN_RATIO = 1.61803398875;

export interface GoldenProportionResult {
	goldenRatio: number;
	centralIncisorWidth: number;
	lateralIncisorWidth: number;
	canineWidth: number;
	idealLateralWidth: number;
	idealCanineWidth: number;
	lateralRatioToCentral: number;
	canineRatioToLateral: number;
	lateralDeviationPercent: number;
	canineDeviationPercent: number;
	isWithinGoldenTolerance: boolean;
}

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
