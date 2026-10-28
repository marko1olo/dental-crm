/**
 * DENTE CRM — CBCT FDI Dental Arch Anchor Fitting & Harmonization
 * Standards: DICOM Part 3, FDI Two-Digit Notation (11..48), Mandate 8b (<= 120 lines).
 */

import {
	type DentalArchAnchor,
	DEFAULT_MANDIBULAR_ARCH_ANCHORS,
	DEFAULT_MAXILLARY_ARCH_ANCHORS,
} from "../dentalCurveEngine";
import type { MipSlabRef } from "./polarRayTracer";
import { computeJawCenter, rayTraceRidgeRadius } from "./polarRayTracer";

const ANGLE_DEGS = [-14, 0, 16, 30, 45, 60, 74, 87, 93, 106, 120, 135, 150, 164, 180, 194];
const MAND_FDI = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
const MAX_FDI = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];

/** Detects anatomical dental arch centroids via polar ray casting and fits 16 FDI anchors. */
export function detectDentalArchCentroids(
	mip: MipSlabRef,
	jawType: "mandible" | "maxilla" = "mandible",
): DentalArchAnchor[] {
	const defaultAnchors = jawType === "mandible" ? DEFAULT_MANDIBULAR_ARCH_ANCHORS : DEFAULT_MAXILLARY_ARCH_ANCHORS;
	const jawCenter = computeJawCenter(mip);
	const fdiList = jawType === "mandible" ? MAND_FDI : MAX_FDI;

	const specs = ANGLE_DEGS.map((deg, i) => ({
		fdi: fdiList[i]!,
		angleRad: (deg * Math.PI) / 180,
		isRight: i < 8,
	}));

	const rawRadii = specs.map((spec, i) => {
		const def = defaultAnchors[i] ?? defaultAnchors[0]!;
		const defR = Math.hypot(def.positionMm.x - jawCenter.centerX, def.positionMm.y - jawCenter.centerY);
		return rayTraceRidgeRadius(mip, spec.angleRad, defR, jawCenter);
	});

	// 1D Median Filter
	const medRadii = rawRadii.map((cur, i) => {
		const prev = rawRadii[Math.max(0, i - 1)] ?? cur;
		const next = rawRadii[Math.min(rawRadii.length - 1, i + 1)] ?? cur;
		return [prev, cur, next].sort((a, b) => a - b)[1]!;
	});

	// Step Clamping (<= 8 mm delta)
	for (let i = 1; i < medRadii.length; i++) {
		const diff = medRadii[i]! - medRadii[i - 1]!;
		if (Math.abs(diff) > 8.0) medRadii[i] = medRadii[i - 1]! + Math.sign(diff) * 8.0;
	}
	for (let i = medRadii.length - 2; i >= 0; i--) {
		const diff = medRadii[i]! - medRadii[i + 1]!;
		if (Math.abs(diff) > 8.0) medRadii[i] = medRadii[i + 1]! + Math.sign(diff) * 8.0;
	}

	// Bilateral Symmetry Regularization
	const symRadii = [...medRadii];
	for (let i = 0; i < 8; i++) {
		const rR = medRadii[i]!, rL = medRadii[15 - i]!;
		const rMean = 0.5 * (rR + rL);
		const asym = Math.abs(rR - rL);
		if (asym > 12.0) {
			symRadii[i] = 0.3 * rR + 0.7 * rMean;
			symRadii[15 - i] = 0.3 * rL + 0.7 * rMean;
		} else {
			symRadii[i] = 0.85 * rR + 0.15 * rMean;
			symRadii[15 - i] = 0.85 * rL + 0.15 * rMean;
		}
	}

	// 1D Gaussian Smoothing
	const smoothedRadii = symRadii.map((cur, i) => {
		const prev = symRadii[Math.max(0, i - 1)] ?? cur;
		const next = symRadii[Math.min(symRadii.length - 1, i + 1)] ?? cur;
		return 0.2 * prev + 0.6 * cur + 0.2 * next;
	});

	return specs.map((spec, i) => {
		const def = defaultAnchors[i] ?? defaultAnchors[0]!;
		const r = smoothedRadii[i] ?? 40.0;
		const posX = Number((jawCenter.centerX - r * Math.cos(spec.angleRad)).toFixed(2));
		const posY = Number((jawCenter.centerY - r * Math.sin(spec.angleRad)).toFixed(2));
		return {
			id: `a-${spec.fdi}`,
			toothFdi: spec.fdi,
			labelRu: def.labelRu,
			positionMm: { x: posX, y: posY },
			isQuadrantRight: spec.isRight,
		};
	});
}
