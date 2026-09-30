import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
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

// Maxilla slice Z = -4.5 mm (winner from multi-slice scoring)
const maxZ = -4.5;
const slab = extractAxialMIPSlab(volume, maxZ, 5.0);

const wl = 1000;
const ww = 2500;
const low = wl - ww / 2;
const high = wl + ww / 2;
const rgba = new Uint8ClampedArray(width * height * 4);

for (let i = 0; i < sliceCount; i++) {
	const hu = slab.data[i];
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

// Check maxillary teeth
// Standard FDI 18..28:
// 18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28
// Let's inspect where teeth are present and where teeth are absent:
const fdis = ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"];

// Maxillary dental arch anchors (smooth minimum-energy spline bridging gaps)
const maxillaAnchors = [
	{ id: "a-18", toothFdi: "18", positionMm: { x: -28.0, y: -4.0 }, isQuadrantRight: true },
	{ id: "a-17", toothFdi: "17", positionMm: { x: -26.5, y: -14.0 }, isQuadrantRight: true },
	{ id: "a-16", toothFdi: "16", positionMm: { x: -24.5, y: -23.5 }, isQuadrantRight: true },
	{ id: "a-15", toothFdi: "15", positionMm: { x: -21.5, y: -32.5 }, isQuadrantRight: true },
	{ id: "a-14", toothFdi: "14", positionMm: { x: -18.0, y: -40.0 }, isQuadrantRight: true },
	{ id: "a-13", toothFdi: "13", positionMm: { x: -13.5, y: -46.5 }, isQuadrantRight: true },
	{ id: "a-12", toothFdi: "12", positionMm: { x: -7.5, y: -50.0 }, isQuadrantRight: true },
	{ id: "a-11", toothFdi: "11", positionMm: { x: -2.5, y: -51.5 }, isQuadrantRight: true },
	{ id: "a-21", toothFdi: "21", positionMm: { x: 2.5, y: -51.5 }, isQuadrantRight: false },
	{ id: "a-22", toothFdi: "22", positionMm: { x: 7.5, y: -50.0 }, isQuadrantRight: false },
	{ id: "a-23", toothFdi: "23", positionMm: { x: 13.5, y: -46.5 }, isQuadrantRight: false },
	{ id: "a-24", toothFdi: "24", positionMm: { x: 18.0, y: -40.0 }, isQuadrantRight: false },
	{ id: "a-25", toothFdi: "25", positionMm: { x: 21.5, y: -32.5 }, isQuadrantRight: false },
	{ id: "a-26", toothFdi: "26", positionMm: { x: 24.5, y: -23.5 }, isQuadrantRight: false },
	{ id: "a-27", toothFdi: "27", positionMm: { x: 26.5, y: -14.0 }, isQuadrantRight: false },
	{ id: "a-28", toothFdi: "28", positionMm: { x: 28.0, y: -4.0 }, isQuadrantRight: false },
];

const maxSpline = fitSmoothDentalArchSpline(maxillaAnchors as any, 10);
const maxTrough = getFocalTroughBoundaryCurves(maxSpline, 14.0);

// Render maxilla test
async function renderMaxilla() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage({ viewport: { width: 700, height: 780 } });

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
				.header h1 { font-size: 16px; margin: 0 0 4px 0; color: #38bdf8; }
				.header p { font-size: 12px; margin: 0; color: #a1a1aa; font-family: monospace; }
				.canvas-container {
					border: 2px solid #27272a;
					border-radius: 8px;
					overflow: hidden;
					background: #000;
				}
				canvas { display: block; }
			</style>
		</head>
		<body>
			<div class="header">
				<h1>ТЕСТ ВЕРХНЕЙ ЧЕЛЮСТИ (MAXILLA) — ДЕФЕКТЫ ЗУБНОГО РЯДА</h1>
				<p>Z = ${maxZ.toFixed(1)} мм • Тонкий срез 5.0 мм • Сплайн минимальной энергии над дефектами</p>
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
					anchors: maxillaAnchors,
					spline: maxSpline,
					trough: maxTrough,
				})};

				const { w, h, bytes, originMm, spacingMm, anchors, spline, trough } = payload;
				function toPxX(x) { return (x - originMm.x) / spacingMm.x; }
				function toPxY(y) { return (y - originMm.y) / spacingMm.y; }

				const canvas = document.getElementById("viewCanvas");
				const ctx = canvas.getContext("2d");
				const imgData = ctx.createImageData(w, h);
				imgData.data.set(new Uint8ClampedArray(bytes));
				ctx.putImageData(imgData, 0, 0);

				// Trough
				ctx.lineWidth = 1.5;
				ctx.setLineDash([4, 4]);
				ctx.strokeStyle = "rgba(234, 179, 8, 0.75)";
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

				// Spline
				ctx.setLineDash([]);
				ctx.lineWidth = 2.5;
				ctx.strokeStyle = "#38bdf8";
				ctx.shadowColor = "#38bdf8";
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

					ctx.beginPath();
					ctx.arc(px, py, 5.5, 0, Math.PI * 2);
					ctx.fillStyle = "#38bdf8";
					ctx.fill();
					ctx.strokeStyle = "#ffffff";
					ctx.lineWidth = 1.5;
					ctx.stroke();

					ctx.font = "bold 9px monospace";
					const tm = ctx.measureText(a.toothFdi);
					const lx = px - tm.width / 2;
					const ly = py < h / 2 ? py - 12 : py + 14;
					ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
					ctx.fillRect(lx - 2, ly - 8, tm.width + 4, 10);
					ctx.strokeStyle = "#38bdf8";
					ctx.strokeRect(lx - 2, ly - 8, tm.width + 4, 10);
					ctx.fillStyle = "#ffffff";
					ctx.fillText(a.toothFdi, lx, ly);
				}
			</script>
		</body>
		</html>
	`);

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "zakharov_maxilla_arch_proof.png");

	const container = await page.locator(".canvas-container");
	await container.screenshot({ path: outPath });
	console.log(`Maxilla proof saved to: ${outPath}`);

	await browser.close();
}

renderMaxilla().catch(console.error);
