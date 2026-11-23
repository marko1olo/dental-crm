import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { extractAxialMIPSlab, sampleMipHUContinuous } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { fitSmoothDentalArchSpline, getFocalTroughBoundaryCurves } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

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

// Test on Maxilla (Z = -4.5 mm)
const maxZ = -4.5;
const mip = extractAxialMIPSlab(volume, maxZ, 5.0);

// Find center of oral cavity / palate
// Weighted center of mass of maxilla
let totalW = 0, sumX = 0, sumY = 0;
for (let y = 0; y < height; y++) {
	const worldY = volume.originMm.y + y * pixelSpacing;
	for (let x = 0; x < width; x++) {
		const hu = mip.data[y * width + x] ?? -1000;
		if (hu >= 800) {
			const w = hu - 700;
			totalW += w;
			sumX += w * (volume.originMm.x + x * pixelSpacing);
			sumY += w * worldY;
		}
	}
}

const teethCenterX = sumX / totalW;
const teethCenterY = sumY / totalW;
const jawCenterX = teethCenterX;
const jawCenterY = teethCenterY + 20.0; // origin in oral cavity

console.log(`Jaw center origin: (${jawCenterX.toFixed(1)}, ${jawCenterY.toFixed(1)}) mm`);

// FDI angles for Maxilla (18..28):
const toothAngleSpecs = [
	{ fdi: "18", angleRad: (-14 * Math.PI) / 180, isRight: true },
	{ fdi: "17", angleRad: (0 * Math.PI) / 180, isRight: true },
	{ fdi: "16", angleRad: (16 * Math.PI) / 180, isRight: true },
	{ fdi: "15", angleRad: (30 * Math.PI) / 180, isRight: true },
	{ fdi: "14", angleRad: (45 * Math.PI) / 180, isRight: true },
	{ fdi: "13", angleRad: (60 * Math.PI) / 180, isRight: true },
	{ fdi: "12", angleRad: (74 * Math.PI) / 180, isRight: true },
	{ fdi: "11", angleRad: (87 * Math.PI) / 180, isRight: true },
	{ fdi: "21", angleRad: (93 * Math.PI) / 180, isRight: false },
	{ fdi: "22", angleRad: (106 * Math.PI) / 180, isRight: false },
	{ fdi: "23", angleRad: (120 * Math.PI) / 180, isRight: false },
	{ fdi: "24", angleRad: (135 * Math.PI) / 180, isRight: false },
	{ fdi: "25", angleRad: (150 * Math.PI) / 180, isRight: false },
	{ fdi: "26", angleRad: (164 * Math.PI) / 180, isRight: false },
	{ fdi: "27", angleRad: (180 * Math.PI) / 180, isRight: false },
	{ fdi: "28", angleRad: (194 * Math.PI) / 180, isRight: false },
];

// Fissure / Midpoint Ray Tracer:
// Finds R_inner (palatal entry) and R_outer (vestibular exit)
// R_center = (R_inner + R_outer) / 2
function traceFissureCentroid(theta: number): { x: number; y: number; rInner: number; rOuter: number; rCenter: number } {
	const dirX = -Math.cos(theta);
	const dirY = -Math.sin(theta);

	const minR = 10.0;
	const maxR = 60.0;
	const stepR = 0.4;

	let rInner = -1;
	let rOuter = -1;
	let maxHU = -1000;
	let peakR = 35.0;

	// Thresholds: Enamel/bone entry is >= 800 HU
	for (let r = minR; r <= maxR; r += stepR) {
		const sampleX = jawCenterX + r * dirX;
		const sampleY = jawCenterY + r * dirY;
		const hu = sampleMipHUContinuous(mip, sampleX, sampleY);

		if (hu > maxHU) {
			maxHU = hu;
			peakR = r;
		}

		if (hu >= 800 && rInner < 0) {
			rInner = r; // First entry (Palatal / Lingual boundary)
		}

		if (rInner > 0 && hu < 600 && rOuter < 0 && r > rInner + 2.0) {
			rOuter = r; // Exit (Vestibular boundary)
		}
	}

	// If no outer drop-off found (e.g. dense cheek or volume edge)
	if (rOuter < 0 && rInner > 0) {
		rOuter = Math.min(maxR, rInner + 9.0); // Normal tooth thickness ~8-9 mm
	}

	let rCenter = peakR;
	if (rInner > 0 && rOuter > rInner) {
		rCenter = (rInner + rOuter) / 2.0;
	}

	return {
		x: Number((jawCenterX + rCenter * dirX).toFixed(2)),
		y: Number((jawCenterY + rCenter * dirY).toFixed(2)),
		rInner,
		rOuter,
		rCenter,
	};
}

const calculatedAnchors = toothAngleSpecs.map((spec, i) => {
	const res = traceFissureCentroid(spec.angleRad);
	console.log(`Tooth ${spec.fdi}: R_inner=${res.rInner.toFixed(1)}, R_outer=${res.rOuter.toFixed(1)} => R_center=${res.rCenter.toFixed(1)} mm, Pos=(${res.x}, ${res.y})`);
	return {
		id: `a-${spec.fdi}`,
		toothFdi: spec.fdi,
		labelRu: spec.fdi,
		positionMm: { x: res.x, y: res.y },
		isQuadrantRight: spec.isRight,
	};
});

// Fit spline with 25 mm retromolar extension
const spline = fitSmoothDentalArchSpline(calculatedAnchors as any, 10, 22.0);
const trough = getFocalTroughBoundaryCurves(spline, 14.0);

console.log(`Fitted spline count: ${spline.length} points, arch length: ${spline.length * 0.5} mm`);
