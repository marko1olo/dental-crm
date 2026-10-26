import type { CbctVoxelVolume, MprPlane, Point3D } from "../cbctMprMath";
import { clampCoordinateToVolume } from "../cbctCoordinateMath";
import type { CbctWheelAction, WheelActionOptions } from "./types";

export function determineWheelAction(options: WheelActionOptions): CbctWheelAction {
	if (options.ctrlKey || options.metaKey) {
		return "zoom";
	}
	return "slice_scroll";
}

export function calculateWheelSliceDelta(deltaY: number, step = 1): number {
	if (!Number.isFinite(deltaY) || deltaY === 0) return 0;
	const safeStep = Number.isFinite(step) && step > 0 ? step : 1;
	return deltaY > 0 ? safeStep : -safeStep;
}

export function calculateQuantizedWheelDelta(
	accumulatedDeltaY: number,
	quantum = 60,
	step = 1,
): { steps: number; remainder: number } {
	if (!Number.isFinite(accumulatedDeltaY) || accumulatedDeltaY === 0) {
		return { steps: 0, remainder: 0 };
	}
	const safeQuantum = Number.isFinite(quantum) && quantum > 0 ? quantum : 60;
	const safeStep = Number.isFinite(step) && step > 0 ? step : 1;

	const numQuanta = Math.trunc(accumulatedDeltaY / safeQuantum);
	if (numQuanta === 0) {
		return { steps: 0, remainder: accumulatedDeltaY };
	}

	const steps = numQuanta * safeStep;
	const remainder = accumulatedDeltaY - numQuanta * safeQuantum;
	return { steps, remainder };
}

export function calculateSliceIndexFromWheel(
	currentSliceIndex: number,
	maxSliceIndex: number,
	deltaY: number,
	step = 1,
): number {
	const safeCurrent = Number.isFinite(currentSliceIndex) ? currentSliceIndex : 0;
	const safeMax = Number.isFinite(maxSliceIndex) && maxSliceIndex >= 0 ? maxSliceIndex : 0;
	const delta = calculateWheelSliceDelta(deltaY, step);
	return Math.max(0, Math.min(safeMax, Math.round(safeCurrent + delta)));
}

export function calculateCrosshairSliceScroll(
	currentCrosshairMm: Point3D,
	plane: MprPlane,
	deltaY: number,
	volume: CbctVoxelVolume,
	stepVoxels = 1,
): Point3D {
	if (!volume || volume.isDisposed || !volume.spacingMm) {
		return currentCrosshairMm;
	}

	const delta = calculateWheelSliceDelta(deltaY, stepVoxels);
	if (delta === 0) return currentCrosshairMm;

	const newMm: Point3D = { ...currentCrosshairMm };

	switch (plane) {
		case "axial":
			newMm.z += delta * volume.spacingMm.z;
			break;
		case "coronal":
			newMm.y += delta * volume.spacingMm.y;
			break;
		case "sagittal":
			newMm.x += delta * volume.spacingMm.x;
			break;
	}

	return clampCoordinateToVolume(newMm, volume);
}
