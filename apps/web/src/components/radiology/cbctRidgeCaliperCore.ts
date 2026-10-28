/**
 * Automated Alveolar Ridge Caliper Engine — Core Measurement
 * Standards: Misch CE Implant Dentistry 3rd Ed., Buser ITI Consensus, DICOM Part 3
 * Mandate 8b (<= 250 lines).
 */

import type { Point2D } from "./cbctCaliperNerveMath";

export interface AlveolarRidgeCaliperResult {
	readonly toothFdiOrSite: string;
	readonly crestPointMm: Point2D;
	readonly widthAt2Mm: number; // W2 (mm)
	readonly widthAt4Mm?: number; // W4 (mm)
	readonly widthAt6Mm: number; // W6 (mm)
	readonly availableHeightMm: number; // H (mm)
	readonly anatomicalLimit: "mandibular_canal" | "maxillary_sinus" | "inferior_border" | "nasal_floor";
	readonly boneQualityMisch: "D1" | "D2" | "D3" | "D4";
	readonly meanDensityHU: number;
	readonly measurementPoints: {
		readonly crest: Point2D;
		readonly w2Buccal: Point2D;
		readonly w2Lingual: Point2D;
		readonly w4Buccal?: Point2D;
		readonly w4Lingual?: Point2D;
		readonly w6Buccal: Point2D;
		readonly w6Lingual: Point2D;
		readonly baseLimit: Point2D;
	};
}

/**
 * Measures alveolar ridge dimensions (W2, W6, H) and Misch bone quality on a 2D cross-section slice.
 * Coordinate system: X is buccolingual transverse axis, Y is vertical craniocaudal axis.
 */
export function measureAlveolarRidgeCaliper(
	sliceData: Float32Array | Int16Array,
	widthPx: number,
	heightPx: number,
	spacingMm: number,
	jawType: "mandible" | "maxilla" = "mandible",
	toothFdiOrSite = "implant_site",
): AlveolarRidgeCaliperResult {
	const validSpacing = Number.isFinite(spacingMm) && spacingMm > 0 ? spacingMm : 0.25;
	const midX = Math.floor(widthPx / 2);

	const getHU = (x: number, y: number): number => {
		if (x < 0 || x >= widthPx || y < 0 || y >= heightPx) return -1000;
		return sliceData[y * widthPx + x] ?? -1000;
	};

	// 1. Find crest apex: scan vertically down the central zone (+/- 2 mm around midX)
	let crestY = -1;
	let crestX = midX;

	const yStart = 2;
	const yEnd = heightPx - 2;

	if (jawType === "mandible") {
		// Scan from top to bottom
		for (let y = yStart; y < yEnd; y++) {
			for (let dx = -4; dx <= 4; dx++) {
				const x = midX + dx;
				if (getHU(x, y) >= 450) {
					crestY = y;
					crestX = x;
					break;
				}
			}
			if (crestY >= 0) break;
		}
	} else {
		// Maxilla: scan from bottom to top
		for (let y = yEnd; y >= yStart; y--) {
			for (let dx = -4; dx <= 4; dx++) {
				const x = midX + dx;
				if (getHU(x, y) >= 450) {
					crestY = y;
					crestX = x;
					break;
				}
			}
			if (crestY >= 0) break;
		}
	}

	if (crestY < 0) {
		crestY = Math.floor(heightPx / 2);
		crestX = midX;
	} else {
		let minX = crestX;
		let maxX = crestX;
		while (minX > 1 && getHU(minX - 1, crestY) >= 350) minX--;
		while (maxX < widthPx - 2 && getHU(maxX + 1, crestY) >= 350) maxX++;
		crestX = Math.round((minX + maxX) / 2);
	}

	const boneDirY = jawType === "mandible" ? 1 : -1;

	// 2. Measure transverse width at a given depth (mm) below crest
	const measureWidthAtDepth = (depthMm: number): { widthMm: number; ptBuccal: Point2D; ptLingual: Point2D } => {
		const targetY = Math.round(crestY + (depthMm / validSpacing) * boneDirY);
		if (targetY < 0 || targetY >= heightPx) {
			return {
				widthMm: 0,
				ptBuccal: { x: (crestX - 10) * validSpacing, y: targetY * validSpacing },
				ptLingual: { x: (crestX + 10) * validSpacing, y: targetY * validSpacing },
			};
		}

		// Adaptive bone core: find closest bone tissue (+/- 12 voxels) if center is low density
		let centerX = crestX;
		if (getHU(centerX, targetY) < 150) {
			for (let dx = 1; dx <= 16; dx++) {
				if (getHU(crestX + dx, targetY) >= 200) { centerX = crestX + dx; break; }
				if (getHU(crestX - dx, targetY) >= 200) { centerX = crestX - dx; break; }
			}
		}

		// Anatomical cortical boundary search: human alveolar ridge half-width never exceeds 6.0 mm
		const maxHalfSpanPx = Math.min(Math.floor(6.0 / validSpacing), Math.max(1, centerX - 1), Math.max(1, widthPx - 2 - centerX));
		const minBoneThresholdHU = 140;

		let leftX = centerX;
		while (leftX > centerX - maxHalfSpanPx && leftX > 1) {
			if (getHU(leftX, targetY) < minBoneThresholdHU) break;
			leftX--;
		}

		let rightX = centerX;
		while (rightX < centerX + maxHalfSpanPx && rightX < widthPx - 2) {
			if (getHU(rightX, targetY) < minBoneThresholdHU) break;
			rightX++;
		}

		const widthPxCount = Math.max(1, rightX - leftX);
		let widthMm = Number((widthPxCount * validSpacing).toFixed(2));

		if (widthMm > 11.5) {
			widthMm = 11.5;
			leftX = Math.max(1, Math.round(centerX - (5.75 / validSpacing)));
			rightX = Math.min(widthPx - 2, Math.round(centerX + (5.75 / validSpacing)));
		} else if (widthMm < 2.5) {
			widthMm = 0;
		}

		return {
			widthMm,
			ptBuccal: { x: Number((leftX * validSpacing).toFixed(2)), y: Number((targetY * validSpacing).toFixed(2)) },
			ptLingual: { x: Number((rightX * validSpacing).toFixed(2)), y: Number((targetY * validSpacing).toFixed(2)) },
		};
	};

	const w2Result = measureWidthAtDepth(2.0);
	const w4Result = measureWidthAtDepth(4.0);
	const w6Result = measureWidthAtDepth(6.0);

	// 3. Measure available bone height H (to nerve canal or sinus floor)
	let limitY = crestY + Math.round((14.0 / validSpacing) * boneDirY);
	let anatomicalLimit: "mandibular_canal" | "maxillary_sinus" | "inferior_border" | "nasal_floor" =
		jawType === "mandible" ? "mandibular_canal" : "maxillary_sinus";

	const maxSteps = Math.floor(25.0 / validSpacing);

	for (let step = Math.floor(4.0 / validSpacing); step < maxSteps; step++) {
		const y = crestY + step * boneDirY;
		if (y <= 2 || y >= heightPx - 2) {
			limitY = y;
			anatomicalLimit = jawType === "mandible" ? "inferior_border" : "nasal_floor";
			break;
		}

		const hu = getHU(crestX, y);

		if (jawType === "mandible") {
			if (hu < 150 && step >= Math.floor(6.0 / validSpacing)) {
				limitY = y;
				anatomicalLimit = "mandibular_canal";
				break;
			}
		} else {
			if (hu < -150 && step >= Math.floor(5.0 / validSpacing)) {
				limitY = y;
				anatomicalLimit = "maxillary_sinus";
				break;
			}
		}
	}

	const heightPxCount = Math.abs(limitY - crestY);
	const availableHeightMm = Number((heightPxCount * validSpacing).toFixed(2));

	// 4. Sample trabecular bone core density for Misch classification
	let trabecularSum = 0;
	let trabecularCount = 0;
	const sampleStartY = crestY + Math.round((3.0 / validSpacing) * boneDirY);
	const sampleEndY = crestY + Math.round((7.0 / validSpacing) * boneDirY);
	const yMin = Math.min(sampleStartY, sampleEndY);
	const yMax = Math.max(sampleStartY, sampleEndY);

	for (let y = yMin; y <= yMax; y++) {
		for (let dx = -3; dx <= 3; dx++) {
			const hu = getHU(crestX + dx, y);
			if (hu > -500) {
				trabecularSum += hu;
				trabecularCount++;
			}
		}
	}

	const meanDensityHU = trabecularCount > 0 ? Math.round(trabecularSum / trabecularCount) : 650;

	let boneQualityMisch: "D1" | "D2" | "D3" | "D4" = "D3";
	if (meanDensityHU >= 1250) {
		boneQualityMisch = "D1";
	} else if (meanDensityHU >= 850) {
		boneQualityMisch = "D2";
	} else if (meanDensityHU >= 350) {
		boneQualityMisch = "D3";
	} else {
		boneQualityMisch = "D4";
	}

	const crestPointMm: Point2D = {
		x: Number((crestX * validSpacing).toFixed(2)),
		y: Number((crestY * validSpacing).toFixed(2)),
	};

	const baseLimitMm: Point2D = {
		x: crestPointMm.x,
		y: Number((limitY * validSpacing).toFixed(2)),
	};

	return {
		toothFdiOrSite,
		crestPointMm,
		widthAt2Mm: w2Result.widthMm,
		widthAt4Mm: w4Result.widthMm,
		widthAt6Mm: w6Result.widthMm,
		availableHeightMm,
		anatomicalLimit,
		boneQualityMisch,
		meanDensityHU,
		measurementPoints: {
			crest: crestPointMm,
			w2Buccal: w2Result.ptBuccal,
			w2Lingual: w2Result.ptLingual,
			w4Buccal: w4Result.ptBuccal,
			w4Lingual: w4Result.ptLingual,
			w6Buccal: w6Result.ptBuccal,
			w6Lingual: w6Result.ptLingual,
			baseLimit: baseLimitMm,
		},
	};
}
