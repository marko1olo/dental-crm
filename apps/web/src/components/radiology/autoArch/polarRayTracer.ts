/**
 * DENTE CRM — CBCT Polar Ridge Ray Tracing
 * Standards: DICOM Part 3, Misch CE, Mandate 8b (<= 120 lines).
 */

import type { Point2D } from "../cbctCaliperNerveMath";
import type { AxialMIPSlab } from "../cbctAutoArchTypes";
import { sampleMipHUContinuous } from "./axialMipExtractor";

export type MipSlabRef = AxialMIPSlab | { data: Float32Array; width: number; height: number; originMm: Point2D; spacingMm: Point2D };

/** Computes the weighted anatomical jaw center from Axial MIP slab. */
export function computeJawCenter(mip: MipSlabRef): { centerX: number; centerY: number; hasSignal: boolean } {
	let maxHU = -1000;
	for (let i = 0; i < mip.data.length; i++) {
		const hu = mip.data[i] ?? -1000;
		if (hu > maxHU) maxHU = hu;
	}

	let threshold = 800, baseline = 700, weightPow = 1.5;
	if (maxHU >= 1800) { threshold = 800; baseline = 700; weightPow = 1.5; }
	else if (maxHU >= 750) { threshold = 550; baseline = 450; weightPow = 1.2; }
	else if (maxHU >= 350) { threshold = 350; baseline = 250; weightPow = 1.0; }

	let totalW = 0, sumX = 0, sumY = 0;
	for (let y = 0; y < mip.height; y++) {
		const worldY = mip.originMm.y + y * mip.spacingMm.y;
		const rowOffset = y * mip.width;
		for (let x = 0; x < mip.width; x++) {
			const hu = Math.min(mip.data[rowOffset + x] ?? -1000, 3500);
			if (hu >= threshold) {
				const w = Math.pow(hu - baseline, weightPow);
				totalW += w;
				sumX += w * (mip.originMm.x + x * mip.spacingMm.x);
				sumY += w * worldY;
			}
		}
	}

	if (totalW > 100) {
		const teethX = sumX / totalW;
		const teethY = sumY / totalW;
		return {
			centerX: Math.max(-45.0, Math.min(45.0, teethX)),
			centerY: teethY + 25.0,
			hasSignal: true,
		};
	}
	return { centerX: 0.0, centerY: 0.0, hasSignal: false };
}

/** Samples ridge radius along polar angle theta using peak centroid detection. */
export function rayTraceRidgeRadius(
	mip: MipSlabRef,
	theta: number,
	defaultR: number,
	jawCenter: { centerX: number; centerY: number; hasSignal: boolean },
): number {
	const dirX = -Math.cos(theta);
	const dirY = -Math.sin(theta);
	const minR = jawCenter.hasSignal ? 5.0 : Math.max(12.0, defaultR - 16.0);
	const maxR = jawCenter.hasSignal ? 68.0 : Math.min(80.0, defaultR + 16.0);

	const samples: Array<{ r: number; hu: number }> = [];
	let maxHU = -1000, peakR = defaultR;

	for (let r = minR; r <= maxR; r += 0.5) {
		const sx = jawCenter.centerX + r * dirX;
		const sy = jawCenter.centerY + r * dirY;
		const hu = Math.min(sampleMipHUContinuous(mip, sx, sy), 3500);
		samples.push({ r, hu });
		if (hu > maxHU) { maxHU = hu; peakR = r; }
	}

	let rayThresh = 1000, rayBase = 700, rayPow = 1.5;
	if (maxHU >= 1800) { rayThresh = 1000; rayBase = 700; rayPow = 1.5; }
	else if (maxHU >= 750) { rayThresh = 550; rayBase = 400; rayPow = 1.2; }
	else if (maxHU >= 350) { rayThresh = 320; rayBase = 200; rayPow = 1.0; }
	else return defaultR;

	let rPal = -1, rVest = -1;
	for (const s of samples) {
		if (s.r >= peakR - 10.0 && s.r <= peakR + 10.0) {
			if (s.hu >= rayThresh && rPal < 0) rPal = s.r;
			if (rPal > 0 && s.hu < rayBase && rVest < 0 && s.r > rPal + 2.0) rVest = s.r;
		}
	}
	if (rPal > 0 && rVest > rPal) return (rPal + rVest) / 2.0;

	let sumW = 0, sumWR = 0;
	for (const s of samples) {
		if (Math.abs(s.r - peakR) <= 6.0 && s.hu >= rayThresh) {
			const w = Math.pow(s.hu - rayBase, rayPow);
			sumW += w;
			sumWR += w * s.r;
		}
	}
	return sumW > 0 ? sumWR / sumW : peakR;
}
