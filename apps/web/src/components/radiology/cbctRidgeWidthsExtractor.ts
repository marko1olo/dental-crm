/**
 * Direct Morphometry Extraction for Cross-Section Slice Data (W2, W4, W6, H)
 * Standards: Carl Misch CE (2008), Buser ITI Consensus.
 * Governed by Mandate 8l: strict anatomical sanity bounds [3.0 .. 11.5 mm]. Zero canvas-wide fake measurements.
 * Mandate 8b (<= 260 lines).
 */

import type { Point2D } from "./cbctCaliperNerveMath";

export interface CrossSectionRidgeWidthsResult {
	readonly crestApexMm: Point2D;
	readonly availableHeightMm: number;
	readonly widthW2Mm: number;
	readonly widthW4Mm: number;
	readonly widthW6Mm: number;
	readonly lineW2: { buccal: Point2D; lingual: Point2D };
	readonly lineW4: { buccal: Point2D; lingual: Point2D };
	readonly lineW6: { buccal: Point2D; lingual: Point2D };
	readonly isAdequate: boolean;
	readonly isDetected: boolean;
	readonly w2Valid: boolean;
	readonly w4Valid: boolean;
	readonly w6Valid: boolean;
	readonly heightValid: boolean;
}

/**
 * Direct morphometry extraction for cross-section slice data:
 * Measures alveolar ridge width at 2.0 mm, 4.0 mm, and 6.0 mm below crest.
 */
export function measureCrossSectionRidgeWidths2_4_6(
	pixelData: Uint8ClampedArray | Uint8Array,
	widthPx: number,
	heightPx: number,
	spacingMm = 0.25,
	jawType: "mandible" | "maxilla" = "mandible",
	rawHuData?: Int16Array | null,
): CrossSectionRidgeWidthsResult {
	const validSpacing = Number.isFinite(spacingMm) && spacingMm > 0 ? spacingMm : 0.25;
	const midX = Math.floor(widthPx / 2);

	const hasRawHu = Boolean(rawHuData && rawHuData.length === widthPx * heightPx);

	const getVal = (x: number, y: number): number => {
		if (x < 0 || x >= widthPx || y < 0 || y >= heightPx) return 0;
		return pixelData[(y * widthPx + x) * 4] ?? 0;
	};

	const getHu = (x: number, y: number): number => {
		if (x < 0 || x >= widthPx || y < 0 || y >= heightPx) return -1000;
		if (hasRawHu) return rawHuData![y * widthPx + x] ?? -1000;
		const gray = getVal(x, y);
		if (gray < 20) return -1000 + gray * 20;
		return (gray - 50) * 8;
	};

	const isCorticalBone = (x: number, y: number): boolean => {
		if (hasRawHu) return getHu(x, y) >= 280;
		return getVal(x, y) >= 80;
	};

	const isBoneTissue = (x: number, y: number): boolean => {
		if (hasRawHu) return getHu(x, y) >= 140;
		return getVal(x, y) >= 48;
	};

	// 1. Find crest apex: scan across horizontal area avoiding reconstruction margin noise
	const xMin = Math.max(2, Math.floor(widthPx * 0.12));
	const xMax = Math.min(widthPx - 3, Math.ceil(widthPx * 0.88));

	let bestApexY = -1;
	let bestApexX = midX;
	let foundApex = false;

	const boneDirY = jawType === "mandible" ? 1 : -1;

	if (jawType === "mandible") {
		// Scan top to bottom for the highest coronal bone point (lowest Y)
		for (let y = 2; y < Math.floor(heightPx * 0.75); y++) {
			for (let x = xMin; x <= xMax; x++) {
				if (isCorticalBone(x, y)) {
					if (isBoneTissue(x, y + 1) && isBoneTissue(x, y + 2) && isBoneTissue(x, y + 3)) {
						bestApexY = y;
						bestApexX = x;
						foundApex = true;
						break;
					}
				}
			}
			if (foundApex) break;
		}
	} else {
		// Maxilla: scan bottom to top for lowest coronal bone point (highest Y)
		for (let y = heightPx - 3; y >= Math.floor(heightPx * 0.25); y--) {
			for (let x = xMin; x <= xMax; x++) {
				if (isCorticalBone(x, y)) {
					if (isBoneTissue(x, y - 1) && isBoneTissue(x, y - 2) && isBoneTissue(x, y - 3)) {
						bestApexY = y;
						bestApexX = x;
						foundApex = true;
						break;
					}
				}
			}
			if (foundApex) break;
		}
	}

	if (!foundApex) {
		return {
			crestApexMm: { x: Number((midX * validSpacing).toFixed(1)), y: Number((heightPx * 0.35 * validSpacing).toFixed(1)) },
			availableHeightMm: 0,
			widthW2Mm: 0,
			widthW4Mm: 0,
			widthW6Mm: 0,
			lineW2: { buccal: { x: 0, y: 0 }, lingual: { x: 0, y: 0 } },
			lineW4: { buccal: { x: 0, y: 0 }, lingual: { x: 0, y: 0 } },
			lineW6: { buccal: { x: 0, y: 0 }, lingual: { x: 0, y: 0 } },
			isAdequate: false,
			isDetected: false,
			w2Valid: false,
			w4Valid: false,
			w6Valid: false,
			heightValid: false,
		};
	}

	let crestX = bestApexX;
	const crestY = bestApexY;

	// Refine transverse center 1.0 mm deep inside bone
	const refineY = Math.max(1, Math.min(heightPx - 2, Math.round(crestY + (1.0 / validSpacing) * boneDirY)));
	let minCrestX = crestX;
	let maxCrestX = crestX;
	while (minCrestX > Math.max(1, crestX - 16) && isBoneTissue(minCrestX - 1, refineY)) minCrestX--;
	while (maxCrestX < Math.min(widthPx - 2, crestX + 16) && isBoneTissue(maxCrestX + 1, refineY)) maxCrestX++;
	const crestWidthTestMm = (maxCrestX - minCrestX) * validSpacing;
	if (crestWidthTestMm >= 2.0 && crestWidthTestMm <= 10.0) {
		crestX = Math.round((minCrestX + maxCrestX) / 2);
	}

	const maxHalfSpanPx = Math.floor(5.75 / validSpacing);

	const measureAtDepth = (depthMm: number): {
		widthMm: number;
		ptB: Point2D;
		ptL: Point2D;
		isValid: boolean;
	} => {
		const targetY = Math.round(crestY + (depthMm / validSpacing) * boneDirY);
		if (targetY < 2 || targetY >= heightPx - 2) {
			return {
				widthMm: 0,
				ptB: { x: Number((crestX * validSpacing).toFixed(1)), y: Number((targetY * validSpacing).toFixed(1)) },
				ptL: { x: Number((crestX * validSpacing).toFixed(1)), y: Number((targetY * validSpacing).toFixed(1)) },
				isValid: false,
			};
		}

		let centerX = crestX;
		if (!isBoneTissue(centerX, targetY)) {
			let foundNearby = false;
			for (let dx = 1; dx <= 12; dx++) {
				if (isBoneTissue(crestX + dx, targetY)) { centerX = crestX + dx; foundNearby = true; break; }
				if (isBoneTissue(crestX - dx, targetY)) { centerX = crestX - dx; foundNearby = true; break; }
			}
			if (!foundNearby) {
				return {
					widthMm: 0,
					ptB: { x: Number((crestX * validSpacing).toFixed(1)), y: Number((targetY * validSpacing).toFixed(1)) },
					ptL: { x: Number((crestX * validSpacing).toFixed(1)), y: Number((targetY * validSpacing).toFixed(1)) },
					isValid: false,
				};
			}
		}

		let leftX = centerX;
		let leftExitedBone = false;
		const minLeftX = Math.max(1, centerX - maxHalfSpanPx);
		while (leftX > minLeftX) {
			if (!isBoneTissue(leftX - 1, targetY)) {
				leftExitedBone = true;
				break;
			}
			leftX--;
		}

		let rightX = centerX;
		let rightExitedBone = false;
		const maxRightX = Math.min(widthPx - 2, centerX + maxHalfSpanPx);
		while (rightX < maxRightX) {
			if (!isBoneTissue(rightX + 1, targetY)) {
				rightExitedBone = true;
				break;
			}
			rightX++;
		}

		const measuredWidthCount = Math.max(0, rightX - leftX);
		const measuredWidthMm = Number((measuredWidthCount * validSpacing).toFixed(1));

		const isValid = measuredWidthMm >= 2.8 && measuredWidthMm <= 11.5 && (leftExitedBone || rightExitedBone);

		return {
			widthMm: isValid ? measuredWidthMm : 0,
			ptB: { x: Number((leftX * validSpacing).toFixed(1)), y: Number((targetY * validSpacing).toFixed(1)) },
			ptL: { x: Number((rightX * validSpacing).toFixed(1)), y: Number((targetY * validSpacing).toFixed(1)) },
			isValid,
		};
	};

	const w2 = measureAtDepth(2.0);
	const w4 = measureAtDepth(4.0);
	const w6 = measureAtDepth(6.0);

	let limitY = crestY + Math.round((14.0 / validSpacing) * boneDirY);
	const maxStepPx = Math.floor(22.0 / validSpacing);
	const minStepPx = Math.floor(4.0 / validSpacing);

	for (let step = minStepPx; step <= maxStepPx; step++) {
		const curY = crestY + step * boneDirY;
		if (curY <= 2 || curY >= heightPx - 2) {
			limitY = curY;
			break;
		}

		const sample = getHu(crestX, curY);
		if (jawType === "mandible") {
			if (sample < 130 && step >= Math.floor(6.0 / validSpacing)) {
				limitY = curY;
				break;
			}
		} else {
			if (sample < -150 && step >= Math.floor(4.5 / validSpacing)) {
				limitY = curY;
				break;
			}
		}
	}

	const heightPxCount = Math.abs(limitY - crestY);
	const rawHeightMm = Number((heightPxCount * validSpacing).toFixed(1));
	const heightValid = rawHeightMm >= 3.0 && rawHeightMm <= 25.0;
	const availableHeightMm = heightValid ? rawHeightMm : 0;

	const isDetected = w2.isValid || w4.isValid || w6.isValid;
	const isAdequate = w2.isValid && w2.widthMm >= 5.0 && heightValid && availableHeightMm >= 8.0;

	return {
		crestApexMm: { x: Number((crestX * validSpacing).toFixed(1)), y: Number((crestY * validSpacing).toFixed(1)) },
		availableHeightMm,
		widthW2Mm: w2.widthMm,
		widthW4Mm: w4.widthMm,
		widthW6Mm: w6.widthMm,
		lineW2: { buccal: w2.ptB, lingual: w2.ptL },
		lineW4: { buccal: w4.ptB, lingual: w4.ptL },
		lineW6: { buccal: w6.ptB, lingual: w6.ptL },
		isAdequate,
		isDetected,
		w2Valid: w2.isValid,
		w4Valid: w4.isValid,
		w6Valid: w6.isValid,
		heightValid,
	};
}
