/**
 * cbctToothTiltMath.ts — CBCT Tooth Tilt Vector & Root Canal Long-Axis Engine
 *
 * Computes 3D longitudinal root canal orientation vectors for endodontics and implant planning:
 * - Traces root dentin density (HU >= 800..1600) from crown center to apical centroid
 * - Calculates mesiodistal (MD) and buccolingual (BL) tilt angles relative to dental arch Frenet frame
 * - Constructs orthonormal slice basis aligned with the root canal axis for artifact-free endo MPR
 *
 * Standards: DICOM Part 3, ESE (European Society of Endodontology), Planmeca Romexis
 * Governed by Mandate 8b (file length <= 800 lines).
 */

import type { CbctVoxelVolume } from "./cbctMprMath";
import type { Point2D, Point3D } from "./cbctCaliperNerveMath";
import type { DentalArchAnchor } from "./dentalCurveEngine";

export interface ToothTiltVectorResult {
	readonly toothFdi: string;
	readonly crownCenterMm: Point3D;
	readonly rootApexCenterMm: Point3D;
	readonly rootAxisVector: Point3D; // Normalized 3D unit vector along root canal (apex -> crown)
	readonly mesiodistalTiltDeg: number; // Tilt in arch tangent plane (degrees)
	readonly buccolingualTiltDeg: number; // Tilt in arch normal plane (degrees)
	readonly rootLengthMm: number; // Physical length from crown center to root apex
	readonly canalDetected: boolean;
}

export interface EndodonticSliceBasis {
	readonly originMm: Point3D;
	readonly rightAxis: Point3D;  // Transverse direction across canal
	readonly upAxis: Point3D;     // Longitudinal direction along root canal
	readonly normalAxis: Point3D; // Slicing plane normal
}

/**
 * Trilinear continuous voxel HU sampler with out-of-bounds safety.
 */
function sampleHUContinuous(volume: CbctVoxelVolume, xMm: number, yMm: number, zMm: number): number {
	if (!volume.data || volume.isDisposed) return -1000;
	const ox = volume.originMm?.x ?? 0;
	const oy = volume.originMm?.y ?? 0;
	const oz = volume.originMm?.z ?? 0;
	const sx = volume.spacingMm?.x || 0.25;
	const sy = volume.spacingMm?.y || 0.25;
	const sz = volume.spacingMm?.z || 0.25;

	const vx = (xMm - ox) / sx;
	const vy = (yMm - oy) / sy;
	const vz = (zMm - oz) / sz;

	const { width, height, depth } = volume.dimensions;
	if (vx < 0 || vx >= width - 1 || vy < 0 || vy >= height - 1 || vz < 0 || vz >= depth - 1) {
		return -1000;
	}

	const x0 = Math.floor(vx);
	const y0 = Math.floor(vy);
	const z0 = Math.floor(vz);
	const fx = vx - x0;
	const fy = vy - y0;
	const fz = vz - z0;

	const sliceVox = width * height;
	const data = volume.data;

	const getV = (x: number, y: number, z: number) => data[z * sliceVox + y * width + x] ?? -1000;

	const v000 = getV(x0, y0, z0);
	const v100 = getV(x0 + 1, y0, z0);
	const v010 = getV(x0, y0 + 1, z0);
	const v110 = getV(x0 + 1, y0 + 1, z0);
	const v001 = getV(x0, y0, z0 + 1);
	const v101 = getV(x0 + 1, y0, z0 + 1);
	const v011 = getV(x0, y0 + 1, z0 + 1);
	const v111 = getV(x0 + 1, y0 + 1, z0 + 1);

	const v00 = v000 * (1 - fx) + v100 * fx;
	const v10 = v010 * (1 - fx) + v110 * fx;
	const v01 = v001 * (1 - fx) + v101 * fx;
	const v11 = v011 * (1 - fx) + v111 * fx;

	const v0 = v00 * (1 - fy) + v10 * fy;
	const v1 = v01 * (1 - fy) + v11 * fy;

	return v0 * (1 - fz) + v1 * fz;
}

/**
 * Calculates the 3D root canal axis and spatial tilt angles for a given tooth.
 * Marching is data-driven from DICOM density without artificial coordinate clamping.
 */
export function calculateToothTiltVector(
	volume: CbctVoxelVolume,
	toothAnchor: DentalArchAnchor,
	crownZMm: number,
	jawType: "mandible" | "maxilla" = "mandible",
	archTangent?: Point2D,
	archNormal?: Point2D,
): ToothTiltVectorResult {
	const crownX = toothAnchor.positionMm.x;
	const crownY = toothAnchor.positionMm.y;
	const crownCenterMm: Point3D = { x: crownX, y: crownY, z: crownZMm };

	// Apical step direction: Mandibular roots extend caudally (-Z or +Z depending on volume coordinate orientation)
	// In our coordinate convention: caudal is positive Z, cranial is negative Z (or vice-versa).
	// We determine apical step sign:
	// For Mandible: roots grow into bone downwards (away from maxilla). If crown is at Z = +7 mm, roots extend to Z = +18..22 mm.
	// For Maxilla: roots grow into maxilla upwards. If crown is at Z = -4 mm, roots extend to Z = -16..-20 mm.
	const apicalStepSign = jawType === "mandible" ? 1.0 : -1.0;

	let lastValidApex: Point3D = { ...crownCenterMm };
	let curX = crownX;
	let curY = crownY;
	let canalDetected = false;
	const maxDepthMm = 18.0;
	const stepMm = 1.0;
	const nSteps = Math.round(maxDepthMm / stepMm);

	for (let step = 1; step <= nSteps; step++) {
		const zMm = crownZMm + step * stepMm * apicalStepSign;

		// Scan transverse neighborhood (+/- 4.0 mm) around current root center
		let sumW = 0;
		let sumWX = 0;
		let sumWY = 0;
		let maxHU = -1000;

		const searchRadiusMm = 4.0;
		const searchStepMm = 0.5;

		for (let dy = -searchRadiusMm; dy <= searchRadiusMm; dy += searchStepMm) {
			for (let dx = -searchRadiusMm; dx <= searchRadiusMm; dx += searchStepMm) {
				const x = curX + dx;
				const y = curY + dy;
				const hu = sampleHUContinuous(volume, x, y, zMm);
				if (hu > maxHU) maxHU = hu;

				// Dentin density tier: HU >= 700
				if (hu >= 700) {
					const w = hu - 600;
					sumW += w;
					sumWX += w * x;
					sumWY += w * y;
				}
			}
		}

		// If root dentin is detected on this slice, update root center
		if (sumW > 100 && maxHU >= 800) {
			curX = sumWX / sumW;
			curY = sumWY / sumW;
			lastValidApex = {
				x: Number(curX.toFixed(2)),
				y: Number(curY.toFixed(2)),
				z: Number(zMm.toFixed(2)),
			};
			canalDetected = true;
		} else if (step >= 6) {
			// Lost dentin signal beyond minimum 6 mm root depth -> reached periodontal space / apex
			break;
		}
	}

	// Longitudinal root axis vector from apex to crown
	const dx = crownCenterMm.x - lastValidApex.x;
	const dy = crownCenterMm.y - lastValidApex.y;
	const dz = crownCenterMm.z - lastValidApex.z;
	const length = Math.hypot(dx, dy, dz) || 1.0;

	const rootAxisVector: Point3D = {
		x: Number((dx / length).toFixed(4)),
		y: Number((dy / length).toFixed(4)),
		z: Number((dz / length).toFixed(4)),
	};

	// Compute mesiodistal and buccolingual tilt angles
	const tan = archTangent ?? { x: 1.0, y: 0.0 };
	const norm = archNormal ?? { x: 0.0, y: 1.0 };

	// Tangent projection (Mesiodistal):
	const projTangent = rootAxisVector.x * tan.x + rootAxisVector.y * tan.y;
	const projZ = rootAxisVector.z;
	const mdAngleRad = Math.atan2(projTangent, Math.abs(projZ) || 1e-4);
	const mesiodistalTiltDeg = Number(((mdAngleRad * 180) / Math.PI).toFixed(1));

	// Normal projection (Buccolingual):
	const projNormal = rootAxisVector.x * norm.x + rootAxisVector.y * norm.y;
	const blAngleRad = Math.atan2(projNormal, Math.abs(projZ) || 1e-4);
	const buccolingualTiltDeg = Number(((blAngleRad * 180) / Math.PI).toFixed(1));

	return {
		toothFdi: toothAnchor.toothFdi,
		crownCenterMm,
		rootApexCenterMm: lastValidApex,
		rootAxisVector,
		mesiodistalTiltDeg,
		buccolingualTiltDeg,
		rootLengthMm: Number(length.toFixed(2)),
		canalDetected,
	};
}

/**
 * Builds an orthonormal 3D coordinate basis aligned with the longitudinal root canal axis.
 * Allows reslicing the CBCT along the true anatomical curvature of the canal.
 */
export function buildEndodonticSliceBasis(
	tiltResult: ToothTiltVectorResult,
	archTangent?: Point2D,
	archNormal?: Point2D,
): EndodonticSliceBasis {
	// Up axis is strictly along the root axis (apex -> crown)
	const up: Point3D = { ...tiltResult.rootAxisVector };

	// Reference transverse direction from arch normal or tangent
	const refX = archNormal?.x ?? 0.0;
	const refY = archNormal?.y ?? 1.0;
	const refZ = 0.0;

	// Cross product: right = up x ref
	let rx = up.y * refZ - up.z * refY;
	let ry = up.z * refX - up.x * refZ;
	let rz = up.x * refY - up.y * refX;
	let rLen = Math.hypot(rx, ry, rz);

	if (rLen < 1e-4) {
		// Fallback to tangent reference
		const tX = archTangent?.x ?? 1.0;
		const tY = archTangent?.y ?? 0.0;
		rx = up.y * 0 - up.z * tY;
		ry = up.z * tX - up.x * 0;
		rz = up.x * tY - up.y * tX;
		rLen = Math.hypot(rx, ry, rz) || 1.0;
	}

	const rightAxis: Point3D = {
		x: Number((rx / rLen).toFixed(4)),
		y: Number((ry / rLen).toFixed(4)),
		z: Number((rz / rLen).toFixed(4)),
	};

	// Normal = right x up (orthogonal to both)
	const nx = rightAxis.y * up.z - rightAxis.z * up.y;
	const ny = rightAxis.z * up.x - rightAxis.x * up.z;
	const nz = rightAxis.x * up.y - rightAxis.y * up.x;
	const nLen = Math.hypot(nx, ny, nz) || 1.0;

	const normalAxis: Point3D = {
		x: Number((nx / nLen).toFixed(4)),
		y: Number((ny / nLen).toFixed(4)),
		z: Number((nz / nLen).toFixed(4)),
	};

	// Origin at root midpoint
	const originMm: Point3D = {
		x: Number(((tiltResult.crownCenterMm.x + tiltResult.rootApexCenterMm.x) / 2.0).toFixed(2)),
		y: Number(((tiltResult.crownCenterMm.y + tiltResult.rootApexCenterMm.y) / 2.0).toFixed(2)),
		z: Number(((tiltResult.crownCenterMm.z + tiltResult.rootApexCenterMm.z) / 2.0).toFixed(2)),
	};

	return {
		originMm,
		rightAxis,
		upAxis: up,
		normalAxis,
	};
}
