import type { CephalometricMeasurement, LandmarkMap } from "./types";
import { calculateUpperDentalMeasurements } from "./dentalUpperMeasurements";
import { calculateLowerDentalMeasurements } from "./dentalLowerMeasurements";
import { calculateInterincisalMeasurements } from "./dentalInterincisalMeasurements";

export interface DentalMeasurementsResult {
	measurements: CephalometricMeasurement[];
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
	const upper = calculateUpperDentalMeasurements(landmarks, scaleMmPerPixel);
	const lower = calculateLowerDentalMeasurements(landmarks, scaleMmPerPixel);
	const interincisal = calculateInterincisalMeasurements(landmarks);

	return {
		measurements: [
			...upper.measurements,
			...lower.measurements,
			interincisal.measurement,
		],
		u1SnVal: upper.u1SnVal,
		u1SnInterp: upper.u1SnInterp,
		u1NaAngleVal: upper.u1NaAngleVal,
		u1NaAngleInterp: upper.u1NaAngleInterp,
		u1NaDistVal: upper.u1NaDistVal,
		u1NaDistInterp: upper.u1NaDistInterp,
		l1MpVal: lower.l1MpVal,
		l1MpInterp: lower.l1MpInterp,
		l1NbAngleVal: lower.l1NbAngleVal,
		l1NbAngleInterp: lower.l1NbAngleInterp,
		l1NbDistVal: lower.l1NbDistVal,
		l1NbDistInterp: lower.l1NbDistInterp,
		u1L1Val: interincisal.u1L1Val,
		u1L1Interp: interincisal.u1L1Interp,
	};
}
