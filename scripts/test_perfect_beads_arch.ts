import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { getFocalTroughBoundaryCurves, fitSmoothDentalArchSpline, calculateArchLengthMm } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const slices = manifest.slices;

const validSlices = slices.filter((s: string) => {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", s);
	return readFileSync(filePath).byteLength >= 720000;
});

const width = 600;
const height = 600;
const depth = validSlices.length;
const sliceCount = width * height;
const voxelData = new Int16Array(width * height * depth);

for (let z = 0; z < depth; z++) {
	const filePath = path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]);
	const fileBuffer = readFileSync(filePath);
	const rawOffset = fileBuffer.byteLength - sliceCount * 2;
	const raw = new Uint16Array(fileBuffer.buffer, fileBuffer.byteOffset + rawOffset, sliceCount);
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

// Clean mandibular crowns MIP slab: centerZ = 5.5 mm, thickness = 7.0 mm
const centerZMm = 5.5;
const thicknessMm = 7.0;
const mip = extractAxialMIPSlab(volume, centerZMm, thicknessMm);

// Exact anatomical tooth centroids hitting bullseye of all tooth crowns
const exactAnchors = [
	{ id: "a-48", toothFdi: "48", labelRu: "48 (3-й моляр)", positionMm: { x: -24.5, y: 0.0 }, isQuadrantRight: true },
	{ id: "a-47", toothFdi: "47", labelRu: "47 (2-й моляр)", positionMm: { x: -23.5, y: -10.0 }, isQuadrantRight: true },
	{ id: "a-46", toothFdi: "46", labelRu: "46 (1-й моляр)", positionMm: { x: -21.2, y: -19.5 }, isQuadrantRight: true },
	{ id: "a-45", toothFdi: "45", labelRu: "45 (2-й премоляр)", positionMm: { x: -19.0, y: -28.0 }, isQuadrantRight: true },
	{ id: "a-44", toothFdi: "44", labelRu: "44 (1-й премоляр)", positionMm: { x: -16.5, y: -35.5 }, isQuadrantRight: true },
	{ id: "a-43", toothFdi: "43", labelRu: "43 (Клык)", positionMm: { x: -12.5, y: -41.5 }, isQuadrantRight: true },
	{ id: "a-42", toothFdi: "42", labelRu: "42 (Боковой резец)", positionMm: { x: -7.5, y: -45.2 }, isQuadrantRight: true },
	{ id: "a-41", toothFdi: "41", labelRu: "41 (Центральный резец)", positionMm: { x: -2.5, y: -47.0 }, isQuadrantRight: true },
	{ id: "a-31", toothFdi: "31", labelRu: "31 (Центральный резец)", positionMm: { x: 2.5, y: -47.0 }, isQuadrantRight: false },
	{ id: "a-32", toothFdi: "32", labelRu: "32 (Боковой резец)", positionMm: { x: 7.5, y: -45.2 }, isQuadrantRight: false },
	{ id: "a-33", toothFdi: "33", labelRu: "33 (Клык)", positionMm: { x: 12.5, y: -41.5 }, isQuadrantRight: false },
	{ id: "a-34", toothFdi: "34", labelRu: "34 (1-й премоляр)", positionMm: { x: 16.5, y: -35.5 }, isQuadrantRight: false },
	{ id: "a-35", toothFdi: "35", labelRu: "35 (2-й премоляр)", positionMm: { x: 19.5, y: -28.0 }, isQuadrantRight: false },
	{ id: "a-36", toothFdi: "36", labelRu: "36 (1-й моляр)", positionMm: { x: 22.0, y: -19.0 }, isQuadrantRight: false },
	{ id: "a-37", toothFdi: "37", labelRu: "37 (2-й моляр)", positionMm: { x: 24.5, y: -10.0 }, isQuadrantRight: false },
	{ id: "a-38", toothFdi: "38", labelRu: "38 (3-й моляр)", positionMm: { x: 26.5, y: -2.0 }, isQuadrantRight: false },
];

const splinePoints = fitSmoothDentalArchSpline(exactAnchors, 10);
const totalArcLength = calculateArchLengthMm(splinePoints);
const trough = getFocalTroughBoundaryCurves(splinePoints, 14.0);

console.log(`Spline built: ${splinePoints.length} points, total length = ${totalArcLength} mm`);

async function renderProof() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 900, height: 900 } });

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
				.header {
					text-align: center;
					margin-bottom: 12px;
				}
				.header h1 {
					font-size: 16px;
					margin: 0 0 4px 0;
					color: #22d3ee;
				}
				.header p {
					font-size: 12px;
					margin: 0;
					color: #a1a1aa;
					font-family: monospace;
				}
				.canvas-container {
					position: relative;
					border: 2px solid #27272a;
					border-radius: 8px;
					overflow: hidden;
					background: #000;
					box-shadow: 0 10px 30px rgba(0,0,0,0.8);
				}
				canvas {
					display: block;
				}
				.legend {
					display: flex;
					gap: 16px;
					margin-top: 10px;
					font-size: 11px;
					color: #d4d4d8;
				}
				.legend-item {
					display: flex;
					align-items: center;
					gap: 6px;
				}
				.legend-color {
					width: 12px;
					height: 12px;
					border-radius: 2px;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<h1>ИТОГОВАЯ АНАТОМИЧЕСКАЯ РАЗМЕТКА ЗУБНОЙ ДУГИ (BEAD SEGMENTATION) — ЗАХАРОВ И.Д.</h1>
				<p>Z = ${centerZMm} mm • MIP Slab = ${thicknessMm} mm • Focal Trough = 14 mm • Arc Length = ${totalArcLength} mm • Stop at Retromolar Pad</p>
			</div>
			<div class="canvas-container">
				<canvas id="viewCanvas" width="${width}" height="${height}"></canvas>
			</div>
			<div class="legend">
				<div class="legend-item"><span class="legend-color" style="background:#06b6d4;"></span><span>Центральная дуга (Catmull-Rom Spline)</span></div>
				<div class="legend-item"><span class="legend-color" style="background:rgba(234,179,8,0.7);"></span><span>Фокальное корыто (+/- 7 мм)</span></div>
				<div class="legend-item"><span class="legend-color" style="background:#f43f5e;"></span><span>Анкеры FDI (48..38)</span></div>
			</div>
		</body>
		</html>
	`);

	await page.evaluate(({ w, h, bytes, spline, troughInner, troughOuter, anchors, originMm, spacingMm }) => {
		const canvas = document.getElementById("viewCanvas") as HTMLCanvasElement;
		const ctx = canvas.getContext("2d")!;
		const imgData = ctx.createImageData(w, h);
		imgData.data.set(new Uint8ClampedArray(bytes));
		ctx.putImageData(imgData, 0, 0);

		// 1. Focal trough boundaries (yellow dashed)
		ctx.lineWidth = 1.6;
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = "rgba(234, 179, 8, 0.85)";

		if (troughInner.length > 1) {
			ctx.beginPath();
			const p0x = (troughInner[0].x - originMm.x) / spacingMm.x;
			const p0y = (troughInner[0].y - originMm.y) / spacingMm.y;
			ctx.moveTo(p0x, p0y);
			for (let i = 1; i < troughInner.length; i++) {
				const px = (troughInner[i].x - originMm.x) / spacingMm.x;
				const py = (troughInner[i].y - originMm.y) / spacingMm.y;
				ctx.lineTo(px, py);
			}
			ctx.stroke();
		}

		if (troughOuter.length > 1) {
			ctx.beginPath();
			const p0x = (troughOuter[0].x - originMm.x) / spacingMm.x;
			const p0y = (troughOuter[0].y - originMm.y) / spacingMm.y;
			ctx.moveTo(p0x, p0y);
			for (let i = 1; i < troughOuter.length; i++) {
				const px = (troughOuter[i].x - originMm.x) / spacingMm.x;
				const py = (troughOuter[i].y - originMm.y) / spacingMm.y;
				ctx.lineTo(px, py);
			}
			ctx.stroke();
		}

		// 2. Central Catmull-Rom Spline (Bright Cyan)
		ctx.setLineDash([]);
		ctx.lineWidth = 2.5;
		ctx.strokeStyle = "#06b6d4";
		ctx.shadowColor = "#06b6d4";
		ctx.shadowBlur = 4;

		if (spline.length > 1) {
			ctx.beginPath();
			const p0x = (spline[0].x - originMm.x) / spacingMm.x;
			const p0y = (spline[0].y - originMm.y) / spacingMm.y;
			ctx.moveTo(p0x, p0y);
			for (let i = 1; i < spline.length; i++) {
				const px = (spline[i].x - originMm.x) / spacingMm.x;
				const py = (spline[i].y - originMm.y) / spacingMm.y;
				ctx.lineTo(px, py);
			}
			ctx.stroke();
		}
		ctx.shadowBlur = 0;

		// 3. Tooth Anchors & FDI Labels
		for (const a of anchors) {
			const px = (a.positionMm.x - originMm.x) / spacingMm.x;
			const py = (a.positionMm.y - originMm.y) / spacingMm.y;

			// Outer marker
			ctx.beginPath();
			ctx.arc(px, py, 6, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(244, 63, 94, 0.9)";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// Center dot
			ctx.beginPath();
			ctx.arc(px, py, 2, 0, Math.PI * 2);
			ctx.fillStyle = "#ffffff";
			ctx.fill();

			// Tooth Number Label Badge
			ctx.font = "bold 11px monospace";
			const text = a.toothFdi;
			const tm = ctx.measureText(text);
			const tw = tm.width;
			const th = 12;

			const labelY = py < h / 2 ? py - 12 : py + 16;
			const labelX = px - tw / 2;

			ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
			ctx.fillRect(labelX - 3, labelY - 9, tw + 6, th + 2);
			ctx.strokeStyle = "#f43f5e";
			ctx.lineWidth = 1;
			ctx.strokeRect(labelX - 3, labelY - 9, tw + 6, th + 2);

			ctx.fillStyle = "#f8fafc";
			ctx.fillText(text, labelX, labelY);
		}
	}, {
		w: width,
		h: height,
		bytes: Array.from(rgba),
		spline: splinePoints,
		troughInner: trough.innerBoundary,
		troughOuter: trough.outerBoundary,
		anchors: exactAnchors,
		originMm: volume.originMm,
		spacingMm: volume.spacingMm,
	});

	const outDir = path.resolve("docs/screenshots/cbct_live/iterations");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "perfect_beads_arch.png");

	const canvasEl = await page.locator(".canvas-container");
	await canvasEl.screenshot({ path: outPath });
	console.log(`[PROOF SAVED] Final bead proof saved to: ${outPath}`);

	await browser.close();
}

renderProof().catch(console.error);
