import type { CbctVoxelVolume } from "../cbctMprMath";
import type { Point2D, Point3D } from "../cbctCaliperNerveMath";
import type { GlSliceCoordinates } from "../mpr/webgl/CbctVolumeGlContext";
import type { CrossSectionAffineBasis, CrossSectionRenderOptions } from "./types";

export function computeCrossSectionAffineBasis(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	options?: CrossSectionRenderOptions,
): CrossSectionAffineBasis {
	const dim = volume.dimensions;
	const sp = volume.spacingMm;
	const origin = volume.originMm;

	const widthMm = Number.isFinite(options?.widthMm) && (options?.widthMm ?? 0) > 0 ? options!.widthMm! : 24.0;
	const heightMm = Number.isFinite(options?.heightMm) && (options?.heightMm ?? 0) > 0 ? options!.heightMm! : 34.0;
	const pixelSpacingMm = Number.isFinite(options?.pixelSpacingMm) && (options?.pixelSpacingMm ?? 0) > 0 ? options!.pixelSpacingMm! : 0.25;

	const widthPx = Math.max(1, Math.round(widthMm / pixelSpacingMm));
	const heightPx = Math.max(1, Math.round(heightMm / pixelSpacingMm));
	const pixelSpacingX = pixelSpacingMm;
	const pixelSpacingY = pixelSpacingMm;
	const halfW = widthMm / 2.0;
	const halfH = heightMm / 2.0;

	const nLen = Math.hypot(normal2D.x, normal2D.y);
	const unitNormal: Point2D = Number.isFinite(nLen) && nLen > 1e-6 ? { x: normal2D.x / nLen, y: normal2D.y / nLen } : { x: 0, y: 1 };
	const unitTangent: Point2D = { x: unitNormal.y === 0 ? 0 : unitNormal.y, y: unitNormal.x === 0 ? 0 : -unitNormal.x };

	const maxCoordX = Math.max(1, dim.width - 1);
	const maxCoordY = Math.max(1, dim.height - 1);
	const maxCoordZ = Math.max(1, dim.depth - 1);

	const blOffset = options?.buccoLingualOffsetMm ?? 0;
	const zOffset = options?.heightOffsetMm ?? 0;
	const effCenterX = centerMm.x + (blOffset !== 0 ? unitNormal.x * blOffset : 0);
	const effCenterY = centerMm.y + (blOffset !== 0 ? unitNormal.y * blOffset : 0);
	const effCenterZ = typeof options?.sliceCenterZMm === "number" && Number.isFinite(options.sliceCenterZMm)
		? options.sliceCenterZMm
		: centerMm.z + zOffset;

	const world00X = effCenterX - unitNormal.x * halfW;
	const world00Y = effCenterY - unitNormal.y * halfW;
	const world00Z = effCenterZ + halfH;

	const spX = (sp?.x && sp.x > 0) ? sp.x : 0.2;
	const spY = (sp?.y && sp.y > 0) ? sp.y : 0.2;
	const spZ = (sp?.z && sp.z > 0) ? sp.z : 0.2;

	const vox00X = (world00X - origin.x) / spX;
	const vox00Y = (world00Y - origin.y) / spY;
	const vox00Z = (world00Z - origin.z) / spZ;

	const sliceOrigin: [number, number, number] = [vox00X / maxCoordX, vox00Y / maxCoordY, vox00Z / maxCoordZ];
	const uX = (unitNormal.x * widthMm) / (spX * maxCoordX);
	const uY = (unitNormal.y * widthMm) / (spY * maxCoordY);
	const axisU: [number, number, number] = [uX === 0 ? 0 : uX, uY === 0 ? 0 : uY, 0];
	const axisV: [number, number, number] = [0, 0, -heightMm / (spZ * maxCoordZ)];

	const normalStepMm = Math.min(spX, Math.min(spY, spZ));
	const slabMode = options?.slabMode ?? "single";
	const slabThicknessMm = options?.slabThicknessMm ?? 2.0;
	const isSlabActive = slabMode !== "single" && slabThicknessMm > normalStepMm;
	const slabSteps = isSlabActive ? Math.max(1, Math.round(slabThicknessMm / normalStepMm)) : 1;
	const stepMm = isSlabActive ? slabThicknessMm / slabSteps : 0;
	const nX = (unitTangent.x * stepMm) / (spX * maxCoordX);
	const nY = (unitTangent.y * stepMm) / (spY * maxCoordY);
	const axisNorm: [number, number, number] = [nX === 0 ? 0 : nX, nY === 0 ? 0 : nY, 0];

	let slabModeCode = 0;
	if (slabMode === "mip") slabModeCode = 1;
	else if (slabMode === "minip") slabModeCode = 2;
	else if (slabMode === "average") slabModeCode = 3;

	return {
		widthPx, heightPx, pixelSpacingX, pixelSpacingY, sliceOrigin, axisU, axisV, axisNorm, slabModeCode, slabSteps,
		world00: { x: world00X, y: world00Y, z: world00Z },
		unitNormal, unitTangent,
		stepVoxU: { x: (unitNormal.x * pixelSpacingMm) / spX, y: (unitNormal.y * pixelSpacingMm) / spY },
		stepVoxVz: -pixelSpacingMm / spZ,
		vox00: { x: vox00X, y: vox00Y, z: vox00Z },
	};
}

export function computeGlCrossSectionCoordinates(
	volume: CbctVoxelVolume,
	centerMm: Point3D,
	normal2D: Point2D,
	options?: CrossSectionRenderOptions,
): GlSliceCoordinates {
	const basis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, options);
	return {
		widthPx: basis.widthPx, heightPx: basis.heightPx, pixelSpacingX: basis.pixelSpacingX, pixelSpacingY: basis.pixelSpacingY,
		sliceOrigin: basis.sliceOrigin, axisU: basis.axisU, axisV: basis.axisV, axisNorm: basis.axisNorm,
		slabModeCode: basis.slabModeCode, slabSteps: basis.slabSteps,
	};
}

export function isCrossSectionBasisOrthonormal(basis: CrossSectionAffineBasis, tolerance = 1e-4): boolean {
	const dotUV = basis.axisU[0] * basis.axisV[0] + basis.axisU[1] * basis.axisV[1] + basis.axisU[2] * basis.axisV[2];
	const dotUNorm = basis.axisU[0] * basis.unitTangent.x + basis.axisU[1] * basis.unitTangent.y;
	const dotVNorm = basis.axisV[0] * basis.unitTangent.x + basis.axisV[1] * basis.unitTangent.y;
	const dotNormalTangent = basis.unitNormal.x * basis.unitTangent.x + basis.unitNormal.y * basis.unitTangent.y;
	const normNormal = Math.hypot(basis.unitNormal.x, basis.unitNormal.y);
	const normTangent = Math.hypot(basis.unitTangent.x, basis.unitTangent.y);

	return (
		Math.abs(dotUV) < tolerance && Math.abs(dotUNorm) < tolerance && Math.abs(dotVNorm) < tolerance &&
		Math.abs(dotNormalTangent) < tolerance && Math.abs(normNormal - 1.0) < tolerance && Math.abs(normTangent - 1.0) < tolerance
	);
}
