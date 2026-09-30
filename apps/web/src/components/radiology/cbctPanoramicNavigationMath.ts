/**
 * DENTE CRM — CBCT Panoramic Navigation, Slice Coordinate Mapping & FDI Synchronization Engine
 * Decomposed from dentalCurveEngine.ts per Mandate 8b.
 * Standards: DICOM Part 3, Misch CE, Buser
 */

import type { Point2D, Point3D } from "./cbctCaliperNerveMath";
import {
	type DentalArchAnchor,
	type DentalArchCurve,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
} from "./cbctArchSplineMath";
import type { CrossSectionSliceData } from "./cbctCrossSectionResliceMath";

export interface PanoramicSliceFanTick {
	readonly sliceIndex: number;
	readonly panoX: number;
	readonly distanceMm: number;
	readonly nearestToothFdi: string;
	readonly isMajor: boolean;
}

export interface PanoClickSyncResult {
	readonly worldMm: Point3D;
	readonly crossSectionIdx: number;
	readonly nearestToothFdi: string;
	readonly hitToothMarker: boolean;
	readonly clickedToothFdi: string | null;
}


/**
 * Maps a transverse cross-section slice to its horizontal X pixel column on the panoramic radiograph.
 */
export function mapSliceToPanoramicX(
	slice: CrossSectionSliceData,
	panoWidthPx: number,
	totalArchLengthMm: number,
): number {
	if (totalArchLengthMm <= 0 || panoWidthPx <= 0) return 0;
	const ratio = Math.max(0, Math.min(1, slice.distanceAlongArchMm / totalArchLengthMm));
	const denom = Math.max(1, panoWidthPx - 1);
	return Math.round(ratio * denom);
}

/**
 * Finds the nearest cross-section slice index given a click/hover X pixel position on the panorama.
 */
export function findNearestCrossSectionIndexByPanoX(
	panoX: number,
	panoWidthPx: number,
	crossSections: readonly CrossSectionSliceData[],
	totalArchLengthMm: number,
): number {
	if (crossSections.length === 0) return 0;
	if (totalArchLengthMm <= 0 || panoWidthPx <= 0) return 0;

	const denom = Math.max(1, panoWidthPx - 1);
	const targetDist = (Math.max(0, Math.min(denom, panoX)) / denom) * totalArchLengthMm;

	let closestIdx = 0;
	let minDiff = Infinity;

	for (let i = 0; i < crossSections.length; i++) {
		const diff = Math.abs((crossSections[i]?.distanceAlongArchMm ?? 0) - targetDist);
		if (diff < minDiff) {
			minDiff = diff;
			closestIdx = i;
		}
	}

	return closestIdx;
}

/**
 * Generates numbered slice fan tick marks along the panorama for interactive navigation.
 */
export function getPanoramicSliceFanTicks(
	crossSections: readonly CrossSectionSliceData[],
	panoWidthPx: number,
	totalArchLengthMm: number,
): readonly PanoramicSliceFanTick[] {
	if (crossSections.length === 0 || panoWidthPx <= 0 || totalArchLengthMm <= 0) {
		return [];
	}

	return crossSections.map((cs) => {
		const px = mapSliceToPanoramicX(cs, panoWidthPx, totalArchLengthMm);
		const isMajor =
			cs.sliceIndex === 1 ||
			cs.sliceIndex % 5 === 0 ||
			cs.sliceIndex === 60 ||
			cs.sliceIndex === crossSections.length;
		return {
			sliceIndex: cs.sliceIndex,
			panoX: px,
			distanceMm: cs.distanceAlongArchMm,
			nearestToothFdi: cs.nearestToothFdi,
			isMajor,
		};
	});
}

/**
 * Hit-tests if a screen/canvas pointer position is on or near an FDI tooth badge on the panorama.
 */
export function hitTestPanoramicToothMarker(
	pointerPx: { readonly x: number; readonly y: number },
	toothMarkers: ReadonlyArray<{
		readonly toothFdi: string;
		readonly xPx: number;
		readonly labelRu: string;
		readonly yPx?: number;
	}>,
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
	hitRadiusPx = 18,
): { readonly toothFdi: string; readonly xPx: number } | null {
	const zoom = Number.isFinite(transform?.zoom) && (transform?.zoom ?? 0) > 0 ? (transform?.zoom ?? 1.0) : 1.0;
	const panX = Number.isFinite(transform?.panX) ? (transform?.panX ?? 0) : 0;
	const panY = Number.isFinite(transform?.panY) ? (transform?.panY ?? 0) : 0;

	const untransformedPxX = (pointerPx.x - panX) / zoom;
	const untransformedPxY = (pointerPx.y - panY) / zoom;

	for (const tm of toothMarkers) {
		const dx = Math.abs(untransformedPxX - tm.xPx);
		const targetY = typeof tm.yPx === "number" ? tm.yPx : 14;
		const dy = Math.abs(untransformedPxY - targetY);
		// Tooth badge is rendered in top margin (y: 2..32px) or near target yPx
		if (dx <= hitRadiusPx && (untransformedPxY <= 32 || dy <= hitRadiusPx)) {
			return { toothFdi: tm.toothFdi, xPx: tm.xPx };
		}
	}
	return null;
}

/**
 * Synchronizes 3D crosshair coordinate and active cross-section index from a click/drag on the panoramic radiograph.
 * Handles viewport zoom & pan transformations, FDI tooth marker hit-testing, and vertical height (Z) mapping.
 */
export function mapPanoPointerToCrosshairAndSlice(
	pointerPx: { readonly x: number; readonly y: number },
	panoSize: { readonly width: number; readonly height: number },
	archCurve: DentalArchCurve,
	crossSections: readonly CrossSectionSliceData[],
	currentCrosshairMm: Point3D,
	transform?: { readonly panX?: number | undefined; readonly panY?: number | undefined; readonly zoom?: number | undefined } | undefined,
	heightMm = 38.0,
): PanoClickSyncResult {
	if (crossSections.length === 0) {
		return {
			worldMm: currentCrosshairMm,
			crossSectionIdx: 0,
			nearestToothFdi: "46",
			hitToothMarker: false,
			clickedToothFdi: null,
		};
	}

	const zoom = Number.isFinite(transform?.zoom) && (transform?.zoom ?? 0) > 0 ? (transform?.zoom ?? 1.0) : 1.0;
	const panX = Number.isFinite(transform?.panX) ? (transform?.panX ?? 0) : 0;
	const panY = Number.isFinite(transform?.panY) ? (transform?.panY ?? 0) : 0;

	// Untransform screen pointer to raw panorama pixel buffer coordinate
	const untransformedPxX = (pointerPx.x - panX) / zoom;
	const untransformedPxY = (pointerPx.y - panY) / zoom;

	const panoW = panoSize.width > 0 ? panoSize.width : 500;
	const panoH = panoSize.height > 0 ? panoSize.height : 220;

	const clampedPanoX = Math.max(0, Math.min(panoW - 1, untransformedPxX));
	const clampedPanoY = Math.max(0, Math.min(panoH - 1, untransformedPxY));

	// 1. Find closest cross-section slice index
	const totalLengthMm = archCurve.totalArcLengthMm || 100.0;
	const closestIdx = findNearestCrossSectionIndexByPanoX(
		clampedPanoX,
		panoW,
		crossSections,
		totalLengthMm,
	);

	const targetSlice = crossSections[closestIdx] ?? crossSections[0]!;

	// 2. Map vertical Y position to Z physical millimeter coordinate
	const zTopMm = heightMm / 2.0;
	const zStepMm = heightMm / panoH;
	const sampledZMm = Number((zTopMm - clampedPanoY * zStepMm).toFixed(2));

	// Check if click was in top header badge zone (y <= 24px in untransformed space)
	const isToothBadgeHit = untransformedPxY <= 26;

	const targetWorldMm: Point3D = {
		x: targetSlice.centerPointMm.x,
		y: targetSlice.centerPointMm.y,
		z: isToothBadgeHit ? currentCrosshairMm.z : sampledZMm,
	};

	return {
		worldMm: targetWorldMm,
		crossSectionIdx: closestIdx,
		nearestToothFdi: targetSlice.nearestToothFdi,
		hitToothMarker: isToothBadgeHit,
		clickedToothFdi: targetSlice.nearestToothFdi,
	};
}

/**
 * Finds cross-section slice index and anatomical 3D position for a given FDI tooth number (11..48).
 * Selects the optimal centered cross-section corresponding to the tooth's anatomical apex/crown.
 */
export function findCrossSectionAndPositionByFdi(
	toothFdi: number | string,
	crossSections: readonly CrossSectionSliceData[],
	archCurve: DentalArchCurve,
	currentZMm = 0,
): { crossSectionIdx: number; positionMm: Point3D; nearestToothFdi: string; found: boolean } {
	const fdiStr = String(toothFdi);
	const fdiNum = Number.parseInt(fdiStr, 10);

	// 1. Check if tooth exists in live cross-sections
	if (crossSections.length > 0) {
		const matchingIndices: number[] = [];
		for (let i = 0; i < crossSections.length; i++) {
			const cs = crossSections[i];
			if (cs && (cs.nearestToothFdi === fdiStr || Number.parseInt(cs.nearestToothFdi, 10) === fdiNum)) {
				matchingIndices.push(i);
			}
		}

		if (matchingIndices.length > 0) {
			// Find curve anchor if available to select the closest centered slice
			const anchor = archCurve?.anchors?.find(
				(a) => a.toothFdi === fdiStr || Number.parseInt(a.toothFdi, 10) === fdiNum,
			);

			let chosenIdx = matchingIndices[Math.floor(matchingIndices.length / 2)]!;
			if (anchor) {
				let minDist = Infinity;
				for (const idx of matchingIndices) {
					const slice = crossSections[idx]!;
					const dist = Math.hypot(slice.centerPointMm.x - anchor.positionMm.x, slice.centerPointMm.y - anchor.positionMm.y);
					if (dist < minDist) {
						minDist = dist;
						chosenIdx = idx;
					}
				}
			}

			const slice = crossSections[chosenIdx]!;
			return {
				crossSectionIdx: chosenIdx,
				positionMm: { x: slice.centerPointMm.x, y: slice.centerPointMm.y, z: currentZMm },
				nearestToothFdi: slice.nearestToothFdi,
				found: true,
			};
		}
	}

	// 2. Check active dental arch curve anchors
	const activeAnchor = archCurve?.anchors?.find(
		(a) => a.toothFdi === fdiStr || Number.parseInt(a.toothFdi, 10) === fdiNum,
	);
	if (activeAnchor) {
		let bestSliceIdx = 0;
		if (crossSections.length > 0) {
			let minDist = Infinity;
			for (let i = 0; i < crossSections.length; i++) {
				const s = crossSections[i]!;
				const dist = Math.hypot(s.centerPointMm.x - activeAnchor.positionMm.x, s.centerPointMm.y - activeAnchor.positionMm.y);
				if (dist < minDist) {
					minDist = dist;
					bestSliceIdx = i;
				}
			}
		}
		return {
			crossSectionIdx: bestSliceIdx,
			positionMm: { x: activeAnchor.positionMm.x, y: activeAnchor.positionMm.y, z: currentZMm },
			nearestToothFdi: activeAnchor.toothFdi,
			found: true,
		};
	}

	// 3. Check default anatomical arch anchors (if valid FDI 11..48)
	const isMaxillary = (fdiNum >= 11 && fdiNum <= 18) || (fdiNum >= 21 && fdiNum <= 28);
	const isMandibular = (fdiNum >= 31 && fdiNum <= 38) || (fdiNum >= 41 && fdiNum <= 48);

	if (isMaxillary || isMandibular) {
		const defaultAnchors = isMaxillary ? DEFAULT_MAXILLARY_ARCH_ANCHORS : DEFAULT_MANDIBULAR_ARCH_ANCHORS;
		const defAnchor = defaultAnchors.find((a) => a.toothFdi === fdiStr || Number.parseInt(a.toothFdi, 10) === fdiNum);
		if (defAnchor) {
			let bestSliceIdx = 0;
			if (crossSections.length > 0) {
				let minDist = Infinity;
				for (let i = 0; i < crossSections.length; i++) {
					const s = crossSections[i]!;
					const dist = Math.hypot(s.centerPointMm.x - defAnchor.positionMm.x, s.centerPointMm.y - defAnchor.positionMm.y);
					if (dist < minDist) {
						minDist = dist;
						bestSliceIdx = i;
					}
				}
			}
			return {
				crossSectionIdx: bestSliceIdx,
				positionMm: { x: defAnchor.positionMm.x, y: defAnchor.positionMm.y, z: currentZMm },
				nearestToothFdi: defAnchor.toothFdi,
				found: true,
			};
		}
	}

	// 4. Unknown / non-existent FDI fallback (e.g. 99)
	return {
		crossSectionIdx: 0,
		positionMm: { x: 0, y: 0, z: currentZMm },
		nearestToothFdi: fdiStr,
		found: false,
	};
}
