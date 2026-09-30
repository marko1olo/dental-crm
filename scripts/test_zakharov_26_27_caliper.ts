import { readFileSync } from "node:fs";
import path from "node:path";
import {
	autoDetectDentalArch,
	findOcclusalZPlane,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import {
	computeCrossSectionAffineBasis,
	findNearestToothAnchorToDistance,
} from "../apps/web/src/components/radiology/cbctCrossSectionResliceMath.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";
import { measureAlveolarRidgeCaliper } from "../apps/web/src/components/radiology/cbctRidgeCaliperMath.ts";
import { calculateArchTangentsAndNormals } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

async function run() {
	const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const validSlices = manifest.slices.filter(
		(s: string) => readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", s)).byteLength >= 720000
	);

	const width = 600;
	const height = 600;
	const depth = validSlices.length;
	const sliceCount = width * height;
	const voxelData = new Int16Array(sliceCount * depth);

	for (let z = 0; z < depth; z++) {
		const buf = readFileSync(path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]));
		const raw = new Uint16Array(buf.buffer, buf.byteOffset + buf.byteLength - sliceCount * 2, sliceCount);
		const base = z * sliceCount;
		for (let i = 0; i < sliceCount; i++) {
			voxelData[base + i] = (raw[i] || 0) - 1000;
		}
	}

	const pixelSpacing = 0.25;
	const sliceThickness = 0.25;
	const physicalDepthMm = depth * sliceThickness;
	const physicalWidthMm = width * pixelSpacing;
	const physicalHeightMm = height * pixelSpacing;
	const originZ = -physicalDepthMm * 0.5;

	const volume: any = {
		dimensions: { width, height, depth },
		spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
		originMm: {
			x: -physicalWidthMm * 0.5,
			y: -physicalHeightMm * 0.5,
			z: originZ,
		},
		data: voxelData,
		isDisposed: false,
	};

	const maxArch = autoDetectDentalArch(volume, "maxilla", 14.0);
	const centerZMm = maxArch.planeZMm ?? findOcclusalZPlane(volume, "maxilla");
	console.log(`Maxilla detected at Z = ${centerZMm.toFixed(2)} mm`);

	const normals = calculateArchTangentsAndNormals(maxArch.splinePointsMm);
	console.log(`Spline points: ${maxArch.splinePointsMm.length}, Normals: ${normals.length}`);

	for (const tooth of ["26", "27"]) {
		const anchor = maxArch.anchors.find((a: any) => a.toothFdi === tooth);
		console.log(`\n--- TOOTH ${tooth} ---`);
		console.log(`Anchor:`, anchor);
		if (!anchor) continue;

		// Find closest normal along spline to anchor.positionMm
		let bestIdx = 0;
		let bestDist = 1e9;
		for (let i = 0; i < normals.length; i++) {
			const d = Math.hypot(normals[i]!.point.x - anchor.positionMm.x, normals[i]!.point.y - anchor.positionMm.y);
			if (d < bestDist) {
				bestDist = d;
				bestIdx = i;
			}
		}

		const normInfo = normals[bestIdx]!;
		const centerMm = { x: normInfo.point.x, y: normInfo.point.y, z: centerZMm };
		const normal2D = normInfo.normal;

		const basis = computeCrossSectionAffineBasis(volume, centerMm, normal2D, {
			widthMm: 24.0,
			heightMm: 34.0,
			pixelSpacingMm: 0.25,
		});

		const huData = new Float32Array(basis.widthPx * basis.heightPx);
		for (let y = 0; y < basis.heightPx; y++) {
			const curZ = basis.vox00.z + y * basis.stepVoxVz;
			const rowStartX = basis.vox00.x;
			const rowStartY = basis.vox00.y;
			const rowOffset = y * basis.widthPx;
			for (let x = 0; x < basis.widthPx; x++) {
				const curX = rowStartX + x * basis.stepVoxU.x;
				const curY = rowStartY + x * basis.stepVoxU.y;
				huData[rowOffset + x] = sampleVoxelTrilinearHU(curX, curY, curZ, volume);
			}
		}

		const caliper = measureAlveolarRidgeCaliper(
			huData,
			basis.widthPx,
			basis.heightPx,
			basis.pixelSpacingX,
			"maxilla",
			tooth,
		);

		console.log(`Caliper measurement for ${tooth}:`, {
			widthAt2Mm: caliper.widthAt2Mm,
			widthAt6Mm: caliper.widthAt6Mm,
			availableHeightMm: caliper.availableHeightMm,
			anatomicalLimit: caliper.anatomicalLimit,
			boneQualityMisch: caliper.boneQualityMisch,
			meanDensityHU: caliper.meanDensityHU,
			crestPointMm: caliper.crestPointMm,
		});
	}
}

run().catch(console.error);
