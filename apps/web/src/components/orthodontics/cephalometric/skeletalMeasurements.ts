import type { CephalometricMeasurement, LandmarkMap } from "./types";
import { calculateSteinerAndWits } from "./steinerSkeletal";
import { calculateDownsSkeletal } from "./downsSkeletal";
import { calculateVerticalAndMcNamara } from "./verticalSkeletal";

export interface SkeletalMeasurementsResult {
	measurementsPart1: CephalometricMeasurement[];
	measurementsPart2: CephalometricMeasurement[];
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
	const steiner = calculateSteinerAndWits(landmarks, scaleMmPerPixel);
	const downs = calculateDownsSkeletal(landmarks);
	const vertical = calculateVerticalAndMcNamara(landmarks, scaleMmPerPixel);

	const measurementsPart1: CephalometricMeasurement[] = [
		...steiner.measurements,
		...downs.measurements.slice(0, 3), // FA, Convexity, AB-Plane
		...vertical.measurementsPart1, // SN-GoGn, FMA
		...downs.measurements.slice(3), // Y-Axis, Cant-OP
	];

	return {
		measurementsPart1,
		measurementsPart2: vertical.measurementsPart2,
		snaVal: steiner.snaVal,
		snaInterp: steiner.snaInterp,
		snbVal: steiner.snbVal,
		snbInterp: steiner.snbInterp,
		anbVal: steiner.anbVal,
		anbInterp: steiner.anbInterp,
		witsVal: steiner.witsVal,
		witsInterp: steiner.witsInterp,
		facialAngleVal: downs.facialAngleVal,
		facialAngleInterp: downs.facialAngleInterp,
		convexityVal: downs.convexityVal,
		convexityInterp: downs.convexityInterp,
		abPlaneVal: downs.abPlaneVal,
		abPlaneInterp: downs.abPlaneInterp,
		snGognVal: vertical.snGognVal,
		snGognInterp: vertical.snGognInterp,
		fmaVal: vertical.fmaVal,
		fmaInterp: vertical.fmaInterp,
		yAxisVal: downs.yAxisVal,
		yAxisInterp: downs.yAxisInterp,
		cantOpVal: downs.cantOpVal,
		cantOpInterp: downs.cantOpInterp,
		mmAngleVal: vertical.mmAngleVal,
		mmInterp: vertical.mmInterp,
		mcnamaraAVal: vertical.mcnamaraAVal,
		mcnamaraAInterp: vertical.mcnamaraAInterp,
		mcnamaraPogVal: vertical.mcnamaraPogVal,
		mcnamaraPogInterp: vertical.mcnamaraPogInterp,
	};
}
