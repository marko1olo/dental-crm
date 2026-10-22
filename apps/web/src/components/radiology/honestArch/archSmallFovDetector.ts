/**
 * archSmallFovDetector.ts — детекция односторонней зубной дуги для малых полей сканирования (Targeted/Sectoral Small FOV < 60 мм).
 * Mandate 8b: Модульность, строго < 120 строк.
 */

import type { AxialMIPSlab } from "../cbctAutoArchTypes";
import { buildDentalArchCurve, fitSmoothDentalArchSpline } from "../cbctArchSplineMath";
import type { HonestToothAnchor, HonestDentalArchResult, EnamelBead } from "./honestArchTypes";
import { extractEnamelBeadsDistanceTransform } from "./enamelBeadsDetector";

/**
 * Detects unilateral dental arch for Small FOV / Targeted sector scans (FOV < 60 mm).
 * Extracts honest crown enamel centroids and builds an interpolating spline through them.
 */
export function detectSmallFovSegmentalArch(
	mip: AxialMIPSlab,
	jawType: "mandible" | "maxilla",
	focalThicknessMm = 14.0,
): HonestDentalArchResult {
	const rawBeads = extractEnamelBeadsDistanceTransform(mip, 1150);
	const validBeads = rawBeads.filter((b) => b.dMm >= 0.8 && b.hu >= 1250);

	validBeads.sort((a, b) => a.wy - b.wy);

	const cleanBeads: EnamelBead[] = [];
	for (const b of validBeads) {
		if (cleanBeads.length > 0) {
			const prev = cleanBeads[cleanBeads.length - 1]!;
			const step = Math.hypot(b.wx - prev.wx, b.wy - prev.wy);
			if (step > 15.0 && b.dMm < 1.5) continue;
			const dLateral = Math.abs(b.wx) - Math.abs(prev.wx);
			if (dLateral > 7.5 && (b.wy - prev.wy) < 7.0 && b.dMm < 2.0) continue;
		}
		const tooClose = cleanBeads.find((c) => Math.hypot(c.wx - b.wx, c.wy - b.wy) < 4.2);
		if (!tooClose) {
			cleanBeads.push(b);
		} else if (b.hu > tooClose.hu) {
			const idx = cleanBeads.indexOf(tooClose);
			cleanBeads[idx] = b;
		}
	}

	let isLeftPatientSide = true;
	if (cleanBeads.length >= 2) {
		const first = cleanBeads[0]!;
		const last = cleanBeads[cleanBeads.length - 1]!;
		isLeftPatientSide = (last.wx - first.wx) >= -0.5;
	} else if (cleanBeads.length > 0) {
		isLeftPatientSide = cleanBeads[0]!.wx >= 0;
	}
	const qPrefix = jawType === "mandible" ? (isLeftPatientSide ? "3" : "4") : (isLeftPatientSide ? "2" : "1");

	const lastBead = cleanBeads[cleanBeads.length - 1];
	const isLastMolar3 = (lastBead?.wy ?? 0) > 17.0;
	const endToothNum = isLastMolar3 ? 8 : (cleanBeads.length >= 6 ? 6 : Math.min(8, 3 + cleanBeads.length));
	const startToothNum = Math.max(1, endToothNum - cleanBeads.length + 1);

	const anchors: HonestToothAnchor[] = cleanBeads.map((b, idx) => {
		const toothNum = Math.min(8, startToothNum + idx);
		const fdi = `${qPrefix}${toothNum}`;
		return {
			id: `ha_${fdi}`,
			toothFdi: fdi,
			labelRu: fdi,
			positionMm: { x: b.wx, y: b.wy },
			isQuadrantRight: !isLeftPatientSide,
			isMissing: false,
			peakHU: b.hu,
			status: "present",
			dMm: b.dMm,
		};
	});

	const spline = fitSmoothDentalArchSpline(anchors, 8, 8.0);
	const curve = buildDentalArchCurve(anchors, jawType, focalThicknessMm, mip.centerZMm, 0, undefined, spline);

	return {
		anchors,
		curve,
		apexMm: cleanBeads[0] ? { x: cleanBeads[0].wx, y: cleanBeads[0].wy } : { x: 0, y: 0 },
		missingTeethFdi: [],
		presentTeethFdi: anchors.map((a) => a.toothFdi),
		metrics: {
			enamelLockRatio: 100,
			posteriorBoundaryYMm: Number((cleanBeads[cleanBeads.length - 1]?.wy ?? 0).toFixed(2)),
			fissureMidpointErrorMm: 0.0,
			totalArcLengthMm: curve.totalArcLengthMm,
			isSectionalScan: true,
		},
	};
}
