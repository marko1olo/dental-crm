/**
 * cbctRidgeCaliperMath.ts — Automated Alveolar Ridge Caliper Engine
 *
 * Implements objective automated alveolar ridge bone caliber measurements on CBCT cross-sections:
 * 1. Crest Apex Detection (highest coronal bone boundary)
 * 2. Width W2: Alveolar ridge width at 2.0 mm apical to crest
 * 3. Width W6: Alveolar ridge width at 6.0 mm apical to crest
 * 4. Available Bone Height H: Crest to mandibular canal roof or maxillary sinus floor
 * 5. Misch Bone Quality Classification (D1..D4) from internal trabecular HU
 *
 * Standards: Misch CE Implant Dentistry 3rd Ed., Buser ITI Consensus, DICOM Part 3
 * Governed by Mandate 8b (file length <= 800 lines).
 */

import type { Point2D } from "./cbctCaliperNerveMath";

export interface AlveolarRidgeCaliperResult {
	readonly toothFdiOrSite: string;
	readonly crestPointMm: Point2D;
	readonly widthAt2Mm: number;    // W2 (mm)
	readonly widthAt4Mm?: number;   // W4 (mm)
	readonly widthAt6Mm: number;    // W6 (mm)
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
	// For Mandible: crest is near the top of the bone (lower Y in screen coords), roots go down (+Y)
	// For Maxilla: crest is near the bottom of the bone (higher Y in screen coords), roots go up (-Y)
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

	// Step direction into bone:
	// In mandible, advancing into bone is increasing Y (+1)
	// In maxilla, advancing into bone is decreasing Y (-1)
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

		// Anatomical cortical boundary search: human alveolar ridge half-width never exceeds 6.0 mm (max total width 11.5 mm).
		const maxHalfSpanPx = Math.min(Math.floor(6.0 / validSpacing), Math.max(1, centerX - 1), Math.max(1, widthPx - 2 - centerX));
		const minBoneThresholdHU = 140;

		// Find left cortical boundary (Buccal)
		let leftX = centerX;
		while (leftX > centerX - maxHalfSpanPx && leftX > 1) {
			if (getHU(leftX, targetY) < minBoneThresholdHU) break;
			leftX--;
		}

		// Find right cortical boundary (Lingual/Palatal)
		let rightX = centerX;
		while (rightX < centerX + maxHalfSpanPx && rightX < widthPx - 2) {
			if (getHU(rightX, targetY) < minBoneThresholdHU) break;
			rightX++;
		}

		let widthPxCount = Math.max(1, rightX - leftX);
		let widthMm = Number((widthPxCount * validSpacing).toFixed(2));

		// Anatomical bounds guard: alveolar ridge width in humans is strictly within 3.0 .. 11.5 mm
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
	let limitY = crestY + Math.round((14.0 / validSpacing) * boneDirY); // Default 14 mm
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
			// Mandibular canal: dark lumen (< 100 HU) inside bone
			if (hu < 150 && step >= Math.floor(6.0 / validSpacing)) {
				limitY = y;
				anatomicalLimit = "mandibular_canal";
				break;
			}
		} else {
			// Maxillary sinus floor: air cavity (< -200 HU)
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

	// Misch Bone Classification:
	// D1: > 1250 HU (dense cortical)
	// D2: 850..1250 HU (dense to porous cortical & coarse trabecular)
	// D3: 350..850 HU (thin porous cortical & fine trabecular)
	// D4: < 350 HU (fine trabecular / low density)
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
 * Standards: Carl Misch CE (2008), Buser ITI Consensus.
 * Governed by Mandate 8l: strict anatomical sanity bounds [3.0 .. 11.5 mm]. Zero canvas-wide fake measurements.
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
					// Verify bone continuity underneath (at least 3 voxels deep)
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

	// Strict anatomical bound: human alveolar ridge half-width from center never exceeds 5.75 mm
	// (maximum physiological alveolar ridge width is 11.5 mm in large molars).
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

		// Locate bone core on target level
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

		// Scan buccal (left)
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

		// Scan lingual (right)
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

		// Human alveolar ridge sanity gate:
		// Normal range is 3.0 .. 10.0 mm (down to 2.8 mm in extreme atrophy, up to 11.5 mm in wide molars).
		// Any measurement > 11.5 mm is an artifact/jaw body runaway.
		// If both borders exited into soft-tissue/air and width is in [2.8 .. 11.5] mm -> valid.
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

	// Estimate anatomical height limit (mandibular canal roof or sinus floor)
	let limitY = crestY + Math.round((14.0 / validSpacing) * boneDirY);
	let heightDetected = false;
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
			// Mandibular canal lumen: dark zone (HU < 120 or gray < 40) enclosed in bone
			if (sample < 130 && step >= Math.floor(6.0 / validSpacing)) {
				limitY = curY;
				heightDetected = true;
				break;
			}
		} else {
			// Maxillary sinus floor: air cavity (HU < -150 or gray < 20)
			if (sample < -150 && step >= Math.floor(4.5 / validSpacing)) {
				limitY = curY;
				heightDetected = true;
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

// ─── 043/U CLINICAL PROTOCOL & SINUS LIFT RECOMMENDATION ENGINE ─────────────

export interface Ridge043ProtocolResult {
	readonly toothFdi: string;
	readonly statusLocalis043: string;
	readonly surgicalRecommendation043: string;
	readonly sinusLiftNeeded: boolean;
	readonly sinusLiftType: "none" | "transcrestal_closed" | "lateral_open";
	readonly boneAugmentationNeeded: boolean;
	readonly fullProtocolText: string;
}

/**
 * Generates official Form 043/u medical record protocol and evidence-based surgical
 * bone augmentation / sinus lift recommendations (ITI Consensus / Misch CE / Buser).
 */
export function generateRidge043ProtocolText(
	caliper: AlveolarRidgeCaliperResult,
	patientName = "Пациент",
	toothFdi?: string,
): Ridge043ProtocolResult {
	const effectiveTooth = toothFdi || caliper.toothFdiOrSite || "implant_site";
	const isMaxilla = caliper.anatomicalLimit === "maxillary_sinus" || caliper.anatomicalLimit === "nasal_floor";
	const isSinus = caliper.anatomicalLimit === "maxillary_sinus";

	let sinusLiftNeeded = false;
	let sinusLiftType: "none" | "transcrestal_closed" | "lateral_open" = "none";
	let sinusLiftText = "";

	if (isSinus) {
		if (caliper.availableHeightMm >= 10.0) {
			sinusLiftNeeded = false;
			sinusLiftType = "none";
			sinusLiftText = `Высота резидуальной кости достаточна для дентальной имплантации (H = ${caliper.availableHeightMm.toFixed(1)} мм >= 10 мм). Синус-лифтинг не требуется.`;
		} else if (caliper.availableHeightMm >= 5.0) {
			sinusLiftNeeded = true;
			sinusLiftType = "transcrestal_closed";
			sinusLiftText = `Умеренный дефицит высоты резидуальной кости альвеолярного отростка верхней челюсти (H = ${caliper.availableHeightMm.toFixed(1)} мм). Показана дентальная имплантация с симультанным закрытым (транскрестальным / остеотомным по Summers) синус-лифтингом.`;
		} else {
			sinusLiftNeeded = true;
			sinusLiftType = "lateral_open";
			sinusLiftText = `Выраженная вертикальная атрофия альвеолярного отростка верхней челюсти (H = ${caliper.availableHeightMm.toFixed(1)} мм < 5 мм). Показан предварительный или симультанный открытый (латеральный по Tatum) синус-лифтинг с остеопластическим материалом и коллагеновой мембраной.`;
		}
	} else if (caliper.anatomicalLimit === "mandibular_canal") {
		if (caliper.availableHeightMm < 8.0) {
			sinusLiftText = `Дефицит высоты кости над нижнечелюстным каналом (H = ${caliper.availableHeightMm.toFixed(1)} мм < 8 мм). Показана вертикальная костная пластика или использование коротких имплантатов с повышенным диаметром.`;
		} else {
			sinusLiftText = `Высота кости над нижнечелюстным каналом достаточна для стандартной имплантации (H = ${caliper.availableHeightMm.toFixed(1)} мм).`;
		}
	} else {
		sinusLiftText = `Высота доступной костной ткани составляет H = ${caliper.availableHeightMm.toFixed(1)} мм.`;
	}

	const boneAugmentationNeeded = caliper.widthAt2Mm < 5.0 || caliper.widthAt6Mm < 6.0;
	let widthAugmentationText = "";
	if (caliper.widthAt2Mm < 5.0) {
		widthAugmentationText = `Горизонтальный дефицит гребня в коронковой трети (W2 = ${caliper.widthAt2Mm.toFixed(1)} мм < 5.0 мм). Показана направленная костная регенерация (НКР / GBR) или расщепление альвеолярного гребня (ridge split).`;
	}

	const anatLimitRu =
		caliper.anatomicalLimit === "maxillary_sinus"
			? "дна верхнечелюстного синуса (гайморовой пазухи)"
			: caliper.anatomicalLimit === "mandibular_canal"
				? "верхней стенки нижнечелюстного канала (IAN)"
				: caliper.anatomicalLimit === "nasal_floor"
					? "дна носовой полости"
					: "базального края челюсти";

	const w6Formatted =
		caliper.widthAt6Mm > 0
			? `${caliper.widthAt6Mm.toFixed(1)} мм`
			: `н/д (H = ${caliper.availableHeightMm.toFixed(1)} мм < 6.0 мм)`;

	const statusLocalis043 =
		`КЛКТ-морфометрия альвеолярного гребня в области отсутствующего зуба #${effectiveTooth}: ` +
		`ширина гребня на 2 мм ниже вершины W2 = ${caliper.widthAt2Mm.toFixed(1)} мм, ` +
		`базальная ширина на 6 мм ниже вершины W6 = ${w6Formatted}. ` +
		`Высота резидуальной кости до ${anatLimitRu}: H = ${caliper.availableHeightMm.toFixed(1)} мм. ` +
		`Плотность кости: класс Misch ${caliper.boneQualityMisch} (средняя плотность ${caliper.meanDensityHU} HU).`;

	const surgicalRecommendation043 = [
		`План хирургического лечения (область #${effectiveTooth}):`,
		sinusLiftText,
		widthAugmentationText,
		`Рекомендованный тип костной ткани: Misch ${caliper.boneQualityMisch}.`,
	]
		.filter(Boolean)
		.join("\n");

	const fullProtocolText =
		`═══════════════════════════════════════════════════════════════════════════════\n` +
		`ПРОТОКОЛ РЕНТГЕНОЛОГИЧЕСКОГО ИССЛЕДОВАНИЯ КЛКТ (МЕДИЦИНСКАЯ КАРТА ФОРМЫ 043/У)\n` +
		`═══════════════════════════════════════════════════════════════════════════════\n` +
		`Пациент:                   ${patientName}\n` +
		`Область обследования:      Дефект зубного ряда, область отсутствующего зуба FDI #${effectiveTooth}\n` +
		`Анатомическая зона:        ${isMaxilla ? "Верхняя челюсть (Maxilla)" : "Нижняя челюсть (Mandible)"}\n` +
		`───────────────────────────────────────────────────────────────────────────────\n` +
		`1. ОБЪЕКТИВНЫЕ ЗАМЕРЫ АЛЬВЕОЛЯРНОГО ГРЕБНЯ (МОРФОМЕТРИЯ):\n` +
		`  • Ширина гребня W2 (на 2 мм апикальнее вершины):   ${caliper.widthAt2Mm.toFixed(1)} мм\n` +
		`  • Базальная ширина W6 (на 6 мм апикальнее вершины): ${w6Formatted}\n` +
		`  • Высота доступной кости H (до ориентира):           ${caliper.availableHeightMm.toFixed(1)} мм\n` +
		`  • Анатомический ориентир дна:                       ${anatLimitRu}\n` +
		`  • Оптическая плотность трабекулярного ядра:         ${caliper.meanDensityHU} HU\n` +
		`  • Классификация плотности кости по C.E. Misch:      Класс ${caliper.boneQualityMisch}\n` +
		`───────────────────────────────────────────────────────────────────────────────\n` +
		`2. КЛИНИЧЕСКОЕ ЗАКЛЮЧЕНИЕ И ТАКТИКА (ФОРМА 043/У):\n` +
		`  ${statusLocalis043}\n\n` +
		`  Хирургические рекомендации:\n` +
		`  - ${sinusLiftText}\n` +
		(widthAugmentationText ? `  - ${widthAugmentationText}\n` : "") +
		`═══════════════════════════════════════════════════════════════════════════════`;

	return {
		toothFdi: effectiveTooth,
		statusLocalis043,
		surgicalRecommendation043,
		sinusLiftNeeded,
		sinusLiftType,
		boneAugmentationNeeded,
		fullProtocolText,
	};
}

