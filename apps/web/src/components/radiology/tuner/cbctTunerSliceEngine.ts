/**
 * DENTE CRM — CBCT Contrast & Slice Tuner Rendering Engine
 * Direct memory voxel slice extraction, high-speed LUT application, and Canvas rendering.
 * Standards: DICOM Part 3 PS 3.3, Planmeca Romexis 6.x. Mandate 8b (< 800 lines).
 */

import type { CbctVoxelVolume } from "../cbctMprMath";
import type { DentalArchCurve, PanoramicReconstructionResult } from "../dentalCurveEngine";
import type { TunerParams } from "./cbctTunerTypes";

/**
 * Builds a fast 65536-entry Uint8Array Look-Up Table (LUT) for instant mapping of 16-bit HU (-32768..32767).
 */
export function generateTunerLut(params: TunerParams): Uint8Array {
	const lut = new Uint8Array(65536);
	const safeWW = Math.max(1, params.windowWidth);
	const wl = params.windowLevel;
	const low = wl - safeWW / 2.0;
	const high = wl + safeWW / 2.0;
	const invWW = 1.0 / safeWW;
	const gamma = params.gamma;
	const isGamma = gamma !== 1.0 && gamma > 0;
	const airCutoff = params.airCutoffHU;
	const invert = params.invert;

	const bottomVal = invert ? 255 : 0;
	const peakEnamel = params.useSoftKnee ? Math.max(50, Math.min(255, params.softKneeCeiling)) : 255;
	const topVal = invert ? (params.useSoftKnee ? Math.max(0, 255 - peakEnamel) : 0) : peakEnamel;

	if (params.useSoftKnee) {
		const trabecularBoneHU = 600;
		const trabecularIntensity = 92;
		const corticalBoneHU = 1200;
		const corticalIntensity = 114;
		const maxDelta = Math.max(1, peakEnamel - corticalIntensity);
		const k = 240;
		const gammaPow = isGamma ? gamma * 1.15 : 1.2;

		for (let i = 0; i < 65536; i++) {
			const hu = i - 32768;
			if (hu <= airCutoff) {
				lut[i] = bottomVal;
				continue;
			}

			let val: number;
			if (hu <= trabecularBoneHU) {
				const t = Math.max(0, (hu - airCutoff) / Math.max(1, trabecularBoneHU - airCutoff));
				val = Math.round(Math.pow(t, gammaPow) * trabecularIntensity);
			} else if (hu <= corticalBoneHU) {
				const t = (hu - trabecularBoneHU) / Math.max(1, corticalBoneHU - trabecularBoneHU);
				val = Math.round(trabecularIntensity + t * (corticalIntensity - trabecularIntensity));
			} else {
				const deltaHU = hu - corticalBoneHU;
				const comp = maxDelta * (deltaHU / (deltaHU + k));
				val = Math.min(peakEnamel, Math.round(corticalIntensity + comp));
			}

			lut[i] = invert ? 255 - val : val;
		}

		if (invert) {
			const darkAirIdx = Math.max(0, Math.min(65536, Math.floor(-600 + 32768)));
			for (let i = 0; i < darkAirIdx; i++) {
				lut[i] = 10;
			}
		}

		return lut;
	}

	// Pure Linear DICOM VOI LUT Windowing
	const lowIdx = Math.max(0, Math.min(65536, Math.floor(low + 32768)));
	const highIdx = Math.max(0, Math.min(65536, Math.ceil(high + 32768)));

	lut.fill(bottomVal, 0, lowIdx);
	lut.fill(topVal, highIdx, 65536);

	for (let i = lowIdx; i < highIdx; i++) {
		const hu = i - 32768;
		if (hu <= airCutoff) {
			lut[i] = bottomVal;
			continue;
		}
		if (hu <= low) {
			lut[i] = bottomVal;
		} else if (hu >= high) {
			lut[i] = topVal;
		} else {
			const t = Math.max(0, Math.min(1.0, (hu - low) * invWW));
			const correctedT = isGamma ? Math.pow(t, gamma) : t;
			const val = Math.round(correctedT * 255);
			lut[i] = invert ? 255 - val : val;
		}
	}

	if (invert) {
		const darkAirIdx = Math.max(0, Math.min(65536, Math.floor(-600 + 32768)));
		for (let i = 0; i < darkAirIdx; i++) {
			lut[i] = 10;
		}
	}

	return lut;
}

/**
 * Extracts and renders an axial slice from the 3D voxel volume with slab thickness and projection modes.
 */
export function renderAxialSliceToCanvas(
	canvas: HTMLCanvasElement,
	volume: CbctVoxelVolume,
	params: TunerParams,
	lut: Uint8Array,
	archCurve?: DentalArchCurve | null,
): void {
	const ctx = canvas.getContext("2d", { willReadFrequently: false });
	if (!ctx) return;

	const { width, height, depth } = volume.dimensions;
	if (width <= 0 || height <= 0 || depth <= 0 || !volume.data) return;

	if (canvas.width !== width || canvas.height !== height) {
		canvas.width = width;
		canvas.height = height;
	}

	const sliceZ = Math.max(0, Math.min(depth - 1, params.sliceZIndex));
	const sliceVoxelCount = width * height;
	const voxels = volume.data;

	const imgData = ctx.createImageData(width, height);
	const rgba = imgData.data;

	const spZ = volume.spacingMm?.z || 0.25;
	const thicknessSlices = params.sliceThicknessMm > 0.05
		? Math.max(1, Math.round(params.sliceThicknessMm / spZ))
		: 1;

	const isSingleSlice = params.projectionMode === "native" || thicknessSlices <= 1;

	if (isSingleSlice) {
		const baseIdx = sliceZ * sliceVoxelCount;
		let p = 0;
		for (let i = 0; i < sliceVoxelCount; i++) {
			const hu = voxels[baseIdx + i]!;
			const gray = lut[(hu + 32768) & 0xffff]!;
			rgba[p] = gray;
			rgba[p + 1] = gray;
			rgba[p + 2] = gray;
			rgba[p + 3] = 255;
			p += 4;
		}
	} else {
		const halfSteps = Math.floor(thicknessSlices / 2);
		const zMin = Math.max(0, sliceZ - halfSteps);
		const zMax = Math.min(depth - 1, sliceZ + halfSteps);
		const numSteps = Math.max(1, zMax - zMin + 1);
		const mode = params.projectionMode;

		let p = 0;
		for (let i = 0; i < sliceVoxelCount; i++) {
			let finalHU = -1000;

			if (mode === "mip") {
				let maxHU = -32768;
				for (let z = zMin; z <= zMax; z++) {
					const val = voxels[z * sliceVoxelCount + i]!;
					if (val > maxHU) maxHU = val;
				}
				finalHU = maxHU;
			} else if (mode === "average") {
				let sum = 0;
				for (let z = zMin; z <= zMax; z++) {
					sum += voxels[z * sliceVoxelCount + i]!;
				}
				finalHU = Math.round(sum / numSteps);
			} else if (mode === "ray_sum") {
				let sum = 0;
				for (let z = zMin; z <= zMax; z++) {
					const hu = voxels[z * sliceVoxelCount + i]!;
					sum += Math.max(0, hu);
				}
				finalHU = Math.min(3071, Math.round(sum / Math.sqrt(numSteps)));
			}

			const gray = lut[(finalHU + 32768) & 0xffff]!;
			rgba[p] = gray;
			rgba[p + 1] = gray;
			rgba[p + 2] = gray;
			rgba[p + 3] = 255;
			p += 4;
		}
	}

	ctx.putImageData(imgData, 0, 0);

	// Overlay Dental Arch Path
	if (archCurve && archCurve.splinePointsMm && archCurve.splinePointsMm.length > 1) {
		const originX = volume.originMm?.x ?? 0;
		const originY = volume.originMm?.y ?? 0;
		const spX = volume.spacingMm?.x || 0.25;
		const spY = volume.spacingMm?.y || 0.25;

		ctx.save();
		ctx.beginPath();
		ctx.strokeStyle = "rgba(6, 182, 212, 0.85)"; // Neon cyan
		ctx.lineWidth = 2.0;
		ctx.setLineDash([4, 3]);

		for (let i = 0; i < archCurve.splinePointsMm.length; i++) {
			const pt = archCurve.splinePointsMm[i]!;
			const vx = (pt.x - originX) / spX;
			const vy = (pt.y - originY) / spY;
			if (i === 0) {
				ctx.moveTo(vx, vy);
			} else {
				ctx.lineTo(vx, vy);
			}
		}
		ctx.stroke();

		// Draw Key Tooth FDI Markers on Arch
		if (archCurve.anchors) {
			for (const anchor of archCurve.anchors) {
				const vx = (anchor.positionMm.x - originX) / spX;
				const vy = (anchor.positionMm.y - originY) / spY;
				ctx.beginPath();
				ctx.arc(vx, vy, 3.5, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(245, 158, 11, 0.9)"; // Amber
				ctx.fill();
			}
		}
		ctx.restore();
	}
}

/**
 * Draws the panoramic reconstruction result with HUD markers and slice line onto the canvas.
 */
export function renderPanoToCanvas(
	canvas: HTMLCanvasElement,
	pano: PanoramicReconstructionResult,
	currentZMm?: number,
): void {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	if (canvas.width !== pano.widthPx || canvas.height !== pano.heightPx) {
		canvas.width = pano.widthPx;
		canvas.height = pano.heightPx;
	}

	const imgData = ctx.createImageData(pano.widthPx, pano.heightPx);
	imgData.data.set(pano.pixelData);
	ctx.putImageData(imgData, 0, 0);

	// Horizontal Slice Line indicating current Axial Z plane
	if (typeof currentZMm === "number" && pano.heightMm && pano.centerZMm !== undefined) {
		const halfH = pano.heightMm / 2.0;
		const topZ = pano.centerZMm + halfH;
		const bottomZ = pano.centerZMm - halfH;
		if (currentZMm >= bottomZ && currentZMm <= topZ) {
			const ratio = (topZ - currentZMm) / pano.heightMm;
			const yPx = Math.round(ratio * pano.heightPx);

			ctx.save();
			ctx.strokeStyle = "rgba(16, 185, 129, 0.85)"; // Emerald
			ctx.lineWidth = 1.5;
			ctx.setLineDash([5, 4]);
			ctx.beginPath();
			ctx.moveTo(0, yPx);
			ctx.lineTo(pano.widthPx, yPx);
			ctx.stroke();

			ctx.fillStyle = "rgba(16, 185, 129, 0.95)";
			ctx.font = "bold 10px monospace";
			ctx.fillText(`Z: ${currentZMm.toFixed(1)} mm`, 10, yPx - 4);
			ctx.restore();
		}
	}

	// Tooth FDI Markers Top Ribbon
	if (pano.toothMarkersOnPano && pano.toothMarkersOnPano.length > 0) {
		ctx.save();
		ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
		ctx.font = "9px sans-serif";
		ctx.textAlign = "center";
		for (const marker of pano.toothMarkersOnPano) {
			ctx.fillText(marker.toothFdi, marker.xPx, 14);
		}
		ctx.restore();
	}
}
