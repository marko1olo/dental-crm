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

// Mandibular crown layer Z = +7.0 mm (Slab = 6.0 mm)
const mandZ = 7.0;
const mip = extractAxialMIPSlab(volume, mandZ, 6.0);

// Convert MIP to grayscale [0..255]
const wl = 1000;
const ww = 2500;
const low = wl - ww / 2;
const high = wl + ww / 2;
const rgba = new Uint8ClampedArray(width * height * 4);

for (let i = 0; i < sliceCount; i++) {
	const hu = mip.data[i];
	let norm = (hu - low) / (high - low);
	if (norm < 0) norm = 0;
	if (norm > 1) norm = 1;
	const v = Math.round(norm * 255);
	const idx = i * 4;
	rgba[idx] = v;
	rgba[idx + 1] = v;
	rgba[idx + 2] = v;
	rgba[idx + 3] = 255;
}

// 16 FDI Anchors on beads
const toothAnchors = [
	{ x: -25.2, y: 1.5, fdi: "48", labelRu: "48" },   // 48 (Alveolar socket center)
	{ x: -23.6, y: -10.5, fdi: "47", labelRu: "47" }, // 47
	{ x: -21.4, y: -20.5, fdi: "46", labelRu: "46" }, // 46
	{ x: -18.6, y: -29.0, fdi: "45", labelRu: "45" }, // 45
	{ x: -16.0, y: -36.5, fdi: "44", labelRu: "44" }, // 44
	{ x: -11.5, y: -42.0, fdi: "43", labelRu: "43" }, // 43
	{ x: -6.5, y: -45.5, fdi: "42", labelRu: "42" },  // 42
	{ x: -2.2, y: -47.2, fdi: "41", labelRu: "41" },  // 41 (Fissure midpoint)
	{ x: 2.2, y: -47.2, fdi: "31", labelRu: "31" },   // 31 (Fissure midpoint)
	{ x: 6.5, y: -45.5, fdi: "32", labelRu: "32" },   // 32
	{ x: 11.5, y: -42.0, fdi: "33", labelRu: "33" },  // 33
	{ x: 16.0, y: -36.5, fdi: "34", labelRu: "34" },  // 34
	{ x: 18.6, y: -29.0, fdi: "35", labelRu: "35" },  // 35
	{ x: 21.4, y: -20.5, fdi: "36", labelRu: "36" },  // 36
	{ x: 24.0, y: -11.5, fdi: "37", labelRu: "37" },  // 37
	{ x: 26.2, y: -2.0, fdi: "38", labelRu: "38" },   // 38 (Alveolar socket center)
];

// ADAPTIVE BONE RIDGE TRACKER FOR POSTERIOR TAILS:
// Dynamically finds the center of cortical bone for any given Y level
function findBoneRidgeCenter(yMm: number, isRight: boolean, prevX: number): { x: number; y: number; boneFound: boolean } {
	let sumW = 0;
	let sumWX = 0;
	let minBoneX = 0;
	let maxBoneX = 0;
	let found = false;

	// Search range: laterally outwards from prevX by up to 25 mm
	const minX = isRight ? Math.min(-15.0, prevX + 5.0) : Math.max(15.0, prevX - 5.0);
	const maxX = isRight ? Math.max(-55.0, prevX - 25.0) : Math.min(55.0, prevX + 25.0);

	const step = isRight ? -0.25 : 0.25;
	const count = Math.abs(Math.round((maxX - minX) / step));

	for (let i = 0; i <= count; i++) {
		const x = minX + i * step;
		const hu = sampleMipHUContinuous(mip, x, yMm);
		if (hu >= 500) {
			const w = hu - 400;
			sumW += w;
			sumWX += w * x;
			if (!found) {
				minBoneX = x;
				found = true;
			}
			maxBoneX = x;
		}
	}

	if (found && sumW > 0) {
		const boneCenter = (minBoneX + maxBoneX) / 2.0;
		return { x: Number(boneCenter.toFixed(2)), y: yMm, boneFound: true };
	}

	// Fallback to outward flare extrapolation
	const fallbackX = isRight ? prevX - 4.0 : prevX + 4.0;
	return { x: Number(fallbackX.toFixed(2)), y: yMm, boneFound: false };
}

// Track 3 bone extension points on Right (beyond 48)
const p48 = toothAnchors[0]!;
const rExt1 = findBoneRidgeCenter(p48.y + 8.0, true, p48.x);
const rExt2 = findBoneRidgeCenter(p48.y + 17.0, true, rExt1.x);
const rExt3 = findBoneRidgeCenter(p48.y + 26.0, true, rExt2.x);

console.log("Adaptive Right Bone Tails:");
console.log("R-Ext1:", rExt1);
console.log("R-Ext2:", rExt2);
console.log("R-Ext3:", rExt3);

// Track 3 bone extension points on Left (beyond 38)
const p38 = toothAnchors[toothAnchors.length - 1]!;
const lExt1 = findBoneRidgeCenter(p38.y + 8.0, false, p38.x);
const lExt2 = findBoneRidgeCenter(p38.y + 17.0, false, lExt1.x);
const lExt3 = findBoneRidgeCenter(p38.y + 26.0, false, lExt2.x);

console.log("\nAdaptive Left Bone Tails:");
console.log("L-Ext1:", lExt1);
console.log("L-Ext2:", lExt2);
console.log("L-Ext3:", lExt3);

// Full Spline Anchors (including the adaptive flared bone tails)
const fullAnchors = [
	{ id: "rext-3", toothFdi: "R-Ext3", labelRu: "Ветвь R3", positionMm: { x: rExt3.x, y: rExt3.y }, isQuadrantRight: true },
	{ id: "rext-2", toothFdi: "R-Ext2", labelRu: "Ветвь R2", positionMm: { x: rExt2.x, y: rExt2.y }, isQuadrantRight: true },
	{ id: "rext-1", toothFdi: "R-Ext1", labelRu: "Ветвь R1", positionMm: { x: rExt1.x, y: rExt1.y }, isQuadrantRight: true },
	...toothAnchors.map((t, i) => ({
		id: `tooth-${t.fdi}`,
		toothFdi: t.fdi,
		labelRu: t.fdi,
		positionMm: { x: t.x, y: t.y },
		isQuadrantRight: i < 8,
	})),
	{ id: "lext-1", toothFdi: "L-Ext1", labelRu: "Ветвь L1", positionMm: { x: lExt1.x, y: lExt1.y }, isQuadrantRight: false },
	{ id: "lext-2", toothFdi: "L-Ext2", labelRu: "Ветвь L2", positionMm: { x: lExt2.x, y: lExt2.y }, isQuadrantRight: false },
	{ id: "lext-3", toothFdi: "L-Ext3", labelRu: "Ветвь L3", positionMm: { x: lExt3.x, y: lExt3.y }, isQuadrantRight: false },
];

const spline = fitSmoothDentalArchSpline(fullAnchors as any, 10);
const trough = getFocalTroughBoundaryCurves(spline, 15.0); // 15mm focal trough

// Render proof image
async function renderProof() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage({ viewport: { width: 900, height: 950 } });

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body {
					margin: 0;
					padding: 20px;
					background: #09090b;
					color: #f4f4f5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.header { text-align: center; margin-bottom: 12px; }
				.header h1 { font-size: 16px; margin: 0 0 4px 0; color: #10b981; }
				.header p { font-size: 12px; margin: 0; color: #a1a1aa; font-family: monospace; }
				.canvas-container {
					border: 2px solid #10b981;
					border-radius: 8px;
					overflow: hidden;
					background: #000;
					box-shadow: 0 0 20px rgba(16,185,129,0.3);
				}
				canvas { display: block; }
			</style>
		</head>
		<body>
			<div class="header">
				<h1>ЗОЛОТОЙ СТАНДАРТ: АДАПТИВНЫЙ ОТГИБ ХВОСТОВ ПО КОСТИ ЧЕЛЮСТИ</h1>
				<p>Z = +${mandZ.toFixed(1)} мм • Хвосты R-Ext/L-Ext строго по центру кости угла челюсти • Корыто 15 мм</p>
			</div>
			<div class="canvas-container">
				<canvas id="viewCanvas" width="${width}" height="${height}"></canvas>
			</div>
			<script>
				const payload = ${JSON.stringify({
					w: width,
					h: height,
					bytes: Array.from(rgba),
					originMm: volume.originMm,
					spacingMm: volume.spacingMm,
					anchors: fullAnchors,
					spline,
					trough,
				})};

				const { w, h, bytes, originMm, spacingMm, anchors, spline, trough } = payload;
				function toPxX(x) { return (x - originMm.x) / spacingMm.x; }
				function toPxY(y) { return (y - originMm.y) / spacingMm.y; }

				const canvas = document.getElementById("viewCanvas");
				const ctx = canvas.getContext("2d");
				const imgData = ctx.createImageData(w, h);
				imgData.data.set(new Uint8ClampedArray(bytes));
				ctx.putImageData(imgData, 0, 0);

				// Focal trough (15mm, yellow dashed)
				ctx.lineWidth = 1.6;
				ctx.setLineDash([4, 4]);
				ctx.strokeStyle = "rgba(234, 179, 8, 0.85)";
				if (trough.innerBoundary.length > 1) {
					ctx.beginPath();
					ctx.moveTo(toPxX(trough.innerBoundary[0].x), toPxY(trough.innerBoundary[0].y));
					for (let i = 1; i < trough.innerBoundary.length; i++) {
						ctx.lineTo(toPxX(trough.innerBoundary[i].x), toPxY(trough.innerBoundary[i].y));
					}
					ctx.stroke();
				}
				if (trough.outerBoundary.length > 1) {
					ctx.beginPath();
					ctx.moveTo(toPxX(trough.outerBoundary[0].x), toPxY(trough.outerBoundary[0].y));
					for (let i = 1; i < trough.outerBoundary.length; i++) {
						ctx.lineTo(toPxX(trough.outerBoundary[i].x), toPxY(trough.outerBoundary[i].y));
					}
					ctx.stroke();
				}

				// Central Catmull-Rom Spline (Mint Emerald)
				ctx.setLineDash([]);
				ctx.lineWidth = 2.8;
				ctx.strokeStyle = "#10b981";
				ctx.shadowColor = "#10b981";
				ctx.shadowBlur = 4;
				ctx.beginPath();
				for (let i = 0; i < spline.length; i++) {
					const px = toPxX(spline[i].x);
					const py = toPxY(spline[i].y);
					if (i === 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				}
				ctx.stroke();
				ctx.shadowBlur = 0;

				// Anchors
				for (const a of anchors) {
					const px = toPxX(a.positionMm.x);
					const py = toPxY(a.positionMm.y);
					const isExt = a.toothFdi.startsWith("R-Ext") || a.toothFdi.startsWith("L-Ext");

					ctx.beginPath();
					ctx.arc(px, py, isExt ? 5.5 : 6.5, 0, Math.PI * 2);
					ctx.fillStyle = isExt ? "#06b6d4" : "#10b981";
					ctx.fill();
					ctx.strokeStyle = "#ffffff";
					ctx.lineWidth = 1.5;
					ctx.stroke();

					ctx.beginPath();
					ctx.arc(px, py, 2, 0, Math.PI * 2);
					ctx.fillStyle = "#ffffff";
					ctx.fill();

					// Label
					ctx.font = "bold 9px monospace";
					const tm = ctx.measureText(a.toothFdi);
					const lx = px - tm.width / 2;
					const ly = py < h / 2 ? py - 12 : py + 14;

					ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
					ctx.fillRect(lx - 2, ly - 8, tm.width + 4, 10);
					ctx.strokeStyle = isExt ? "#06b6d4" : "#10b981";
					ctx.strokeRect(lx - 2, ly - 8, tm.width + 4, 10);
					ctx.fillStyle = isExt ? "#22d3ee" : "#ffffff";
					ctx.fillText(a.toothFdi, lx, ly);
				}
			</script>
		</body>
		</html>
	`);

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "perfect_synthesized_arch_proof.png");

	const container = await page.locator(".canvas-container");
	await container.screenshot({ path: outPath });
	console.log(`SUCCESS: Synthesized proof saved to: ${outPath}`);

	await browser.close();
}

renderProof().catch(console.error);
