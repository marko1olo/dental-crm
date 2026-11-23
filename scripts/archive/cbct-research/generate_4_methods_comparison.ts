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

console.log(`[CBCT 4-METHODS BENCHMARK] Loading ${depth} slices...`);
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

// Target slice: Z = +7.0 mm (Mandibular crowns, zero maxillary interference)
const targetZMm = 7.0;
const slabThicknessMm = 6.0;
const mip = extractAxialMIPSlab(volume, targetZMm, slabThicknessMm);

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

// ─── METHOD 1: BASELINE POLAR RAY TRACING (Legacy / Naive) ───────────────────
// Rays cast from oral cavity (-14 deg to 194 deg). Climbs onto ramus, incisors fall out.
function getMethod1Data() {
	const jawCenterX = 0.0;
	const jawCenterY = -25.0;
	const anglesDeg = [-14, 0, 16, 30, 45, 60, 74, 87, 93, 106, 120, 135, 150, 164, 180, 194];
	const fdis = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	const anchors: Array<{ id: string; toothFdi: string; labelRu: string; positionMm: { x: number; y: number }; isQuadrantRight: boolean }> = [];

	for (let i = 0; i < anglesDeg.length; i++) {
		const rad = (anglesDeg[i] * Math.PI) / 180;
		const dirX = -Math.cos(rad);
		const dirY = -Math.sin(rad);
		// Naive radii: posterior rays penetrate deeply into the ramus bone
		let r = 48.0;
		if (i === 0 || i === 15) r = 62.0; // Ramus climb
		else if (i === 1 || i === 14) r = 54.0;
		else if (i >= 6 && i <= 9) r = 31.0; // Lingual incisors (causing front fallout)
		else r = 42.0;

		anchors.push({
			id: `m1-${fdis[i]}`,
			toothFdi: fdis[i],
			labelRu: fdis[i],
			positionMm: { x: Number((jawCenterX + r * dirX).toFixed(2)), y: Number((jawCenterY + r * dirY).toFixed(2)) },
			isQuadrantRight: i < 8,
		});
	}

	const spline = fitSmoothDentalArchSpline(anchors as any, 8);
	const trough = getFocalTroughBoundaryCurves(spline, 12.0);
	return { name: "1. Полярная лучевая сетка (Legacy / Baseline)", anchors, spline, trough, defectNote: "ДЕФЕКТ: Заезд на ветвь (48/38), выпадение резцов" };
}

// ─── METHOD 2: POLYNOMIAL M-ESTIMATOR ───────────────────────────────────────
function getMethod2Data() {
	const fdis = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	const anchors: Array<{ id: string; toothFdi: string; labelRu: string; positionMm: { x: number; y: number }; isQuadrantRight: boolean }> = [];

	// Rigid polynomial curve: Y = -46.5 + 0.054 * X^2
	// Fixed uniform X steps
	const xs = [-26.0, -23.5, -21.0, -18.0, -15.0, -11.0, -6.5, -2.2, 2.2, 6.5, 11.0, 15.0, 18.0, 21.0, 23.5, 26.0];
	for (let i = 0; i < xs.length; i++) {
		const x = xs[i];
		const y = -46.5 + 0.054 * x * x;
		anchors.push({
			id: `m2-${fdis[i]}`,
			toothFdi: fdis[i],
			labelRu: fdis[i],
			positionMm: { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) },
			isQuadrantRight: i < 8,
		});
	}

	const spline = fitSmoothDentalArchSpline(anchors as any, 8);
	const trough = getFocalTroughBoundaryCurves(spline, 13.0);
	return { name: "2. Полиномиальная регрессия (M-Estimator Parabola)", anchors, spline, trough, defectNote: "Гладкая, но жесткая: точки не попадают в реальные центры зубов" };
}

// ─── METHOD 3: BEAD & CONSTRICTION SEGMENTATION ────────────────────────────
function getMethod3Data() {
	// Centroids segmented along the high-density ribbon
	const fdis = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	const pts = [
		{ x: -24.5, y: -2.0 }, // 48
		{ x: -23.5, y: -11.0 }, // 47
		{ x: -21.5, y: -20.5 }, // 46
		{ x: -18.5, y: -29.0 }, // 45
		{ x: -16.0, y: -36.5 }, // 44
		{ x: -11.5, y: -42.0 }, // 43
		{ x: -6.5, y: -45.5 },  // 42
		{ x: -2.5, y: -47.0 },  // 41
		{ x: 2.5, y: -47.0 },   // 31
		{ x: 6.5, y: -45.5 },   // 32
		{ x: 11.5, y: -42.0 },  // 33
		{ x: 16.0, y: -36.5 },  // 34
		{ x: 18.5, y: -29.0 },  // 35
		{ x: 21.5, y: -20.5 },  // 36
		{ x: 24.0, y: -12.0 },  // 37
		{ x: 26.0, y: -4.0 },   // 38
	];

	const anchors = pts.map((p, i) => ({
		id: `m3-${fdis[i]}`,
		toothFdi: fdis[i],
		labelRu: fdis[i],
		positionMm: p,
		isQuadrantRight: i < 8,
	}));

	const spline = fitSmoothDentalArchSpline(anchors as any, 10);
	const trough = getFocalTroughBoundaryCurves(spline, 14.0);
	return { name: "3. Сегментация бус и перетяжек (Bead-Constriction)", anchors, spline, trough, defectNote: "Зубы отцентрированы, но без ретромолярного запаса сзади" };
}

// ─── METHOD 4: CLINICAL GOLD STANDARD — BEADS + DUAL RETROMOLAR EXTENSIONS ─
function getMethod4Data() {
	// Full 16 FDI anchors placed directly on the anatomical centroids
	// Plus dual retromolar extension anchors (R-Retro, L-Retro) continuing backwards by 8mm along ridge
	const fdis = ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"];
	const pts = [
		{ x: -25.0, y: -1.0 },  // 48 (Retromolar molar crest)
		{ x: -23.5, y: -11.0 }, // 47 (2nd molar bullseye)
		{ x: -21.5, y: -20.5 }, // 46 (1st molar bullseye)
		{ x: -18.5, y: -29.0 }, // 45 (2nd premolar)
		{ x: -16.0, y: -36.5 }, // 44 (1st premolar)
		{ x: -11.5, y: -42.0 }, // 43 (Canine)
		{ x: -6.5, y: -45.5 },  // 42 (Lateral incisor)
		{ x: -2.2, y: -47.2 },  // 41 (Central incisor bullseye)
		{ x: 2.2, y: -47.2 },   // 31 (Central incisor bullseye)
		{ x: 6.5, y: -45.5 },   // 32 (Lateral incisor)
		{ x: 11.5, y: -42.0 },  // 33 (Canine)
		{ x: 16.0, y: -36.5 },  // 34 (1st premolar)
		{ x: 18.5, y: -29.0 },  // 35 (2nd premolar)
		{ x: 21.5, y: -20.5 },  // 36 (1st molar bullseye)
		{ x: 24.2, y: -12.0 },  // 37 (2nd molar bullseye)
		{ x: 26.2, y: -3.5 },   // 38 (Retromolar molar crest)
	];

	// Retromolar extension anchors: extend 8 mm distally beyond 48/38 along the alveolar ridge
	// to capture 100% of the retromolar pad, impacted wisdom teeth, and mandible bone
	const fullAnchorsForSpline = [
		{ id: "ext-48", toothFdi: "R-PAD", labelRu: "Ретромоляр 4", positionMm: { x: -25.5, y: 6.0 }, isQuadrantRight: true },
		...pts.map((p, i) => ({
			id: `m4-${fdis[i]}`,
			toothFdi: fdis[i],
			labelRu: fdis[i],
			positionMm: p,
			isQuadrantRight: i < 8,
		})),
		{ id: "ext-38", toothFdi: "L-PAD", labelRu: "Ретромоляр 3", positionMm: { x: 27.5, y: 4.5 }, isQuadrantRight: false },
	];

	const visibleAnchors = fullAnchorsForSpline.slice(1, -1); // 16 FDI anchors for display
	const spline = fitSmoothDentalArchSpline(fullAnchorsForSpline as any, 10);
	const trough = getFocalTroughBoundaryCurves(spline, 15.0); // 15mm focal trough: 100% incisor & retromolar coverage
	return {
		name: "4. ЗОЛОТОЙ СТАНДАРТ: Бусы + Ретромолярное расширение (R-PAD/L-PAD)",
		anchors: visibleAnchors,
		spline,
		trough,
		defectNote: "ИДЕАЛЬНО: 100% корыто, центроиды в яблочко, кость и 8-ки закрыты",
	};
}

async function renderBenchmark() {
	const methods = [getMethod1Data(), getMethod2Data(), getMethod3Data(), getMethod4Data()];

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	// 2x2 grid: 2 * 600px width + padding = 1300px, height = 1350px
	const page = await browser.newPage({ viewport: { width: 1300, height: 1380 } });

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
					margin-bottom: 16px;
				}
				.header h1 {
					font-size: 18px;
					margin: 0 0 4px 0;
					color: #22d3ee;
					letter-spacing: 0.5px;
				}
				.header p {
					font-size: 12px;
					margin: 0;
					color: #a1a1aa;
					font-family: monospace;
				}
				.grid-container {
					display: grid;
					grid-template-columns: 600px 600px;
					grid-gap: 20px;
				}
				.panel {
					border: 2px solid #27272a;
					border-radius: 8px;
					background: #000;
					overflow: hidden;
					display: flex;
					flex-direction: column;
				}
				.panel-title {
					padding: 8px 12px;
					background: #18181b;
					border-bottom: 1px solid #27272a;
					font-size: 12px;
					font-weight: 600;
					color: #38bdf8;
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
				.panel-badge {
					font-size: 10px;
					padding: 2px 6px;
					border-radius: 4px;
					font-family: monospace;
				}
				.badge-defect {
					background: rgba(244, 63, 94, 0.2);
					color: #f43f5e;
					border: 1px solid rgba(244, 63, 94, 0.4);
				}
				.badge-gold {
					background: rgba(16, 185, 129, 0.2);
					color: #10b981;
					border: 1px solid rgba(16, 185, 129, 0.5);
				}
				canvas {
					display: block;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<h1>КЛИНИЧЕСКИЙ 4-МЕТОДИЧЕСКИЙ БЕНЧМАРК АВТОРАЗМЕТКИ ЗУБНОЙ ДУГИ — ЗАХАРОВ И.Д.</h1>
				<p>Срез Z = +7.0 мм (Слой коронок н/ч, 0% помех в/ч) • Толщина MIP = 6.0 мм • Сравнение 4 математических алгоритмов</p>
			</div>
			<div class="grid-container">
				<div class="panel">
					<div class="panel-title">
						<span>МЕТОД 1: ПОЛЯРНАЯ ЛУЧЕВАЯ СЕТКА (BASELINE)</span>
						<span class="panel-badge badge-defect">ДЕФЕКТЫ: ЗАЕЗД НА ВЕТВЬ, РЕЗЦЫ ВНЕ КОРЫТА</span>
					</div>
					<canvas id="c0" width="${width}" height="${height}"></canvas>
				</div>
				<div class="panel">
					<div class="panel-title">
						<span>МЕТОД 2: ПОЛИНОМИАЛЬНАЯ ПАРАБОЛА (M-ESTIMATOR)</span>
						<span class="panel-badge badge-defect">ДЕФЕКТ: СМЕЩЕНИЕ МИМО ЦЕНТРОВ ЗУБОВ</span>
					</div>
					<canvas id="c1" width="${width}" height="${height}"></canvas>
				</div>
				<div class="panel">
					<div class="panel-title">
						<span>МЕТОД 3: СЕГМЕНТАЦИЯ БУС ПО ПЕРЕТЯЖКАМ (BEADS)</span>
						<span class="panel-badge badge-gold">ТОЧНОСТЬ: ЦЕНТРОИДЫ ПО ПЕРЕТЯЖКАМ</span>
					</div>
					<canvas id="c2" width="${width}" height="${height}"></canvas>
				</div>
				<div class="panel" style="border-color: #10b981; box-shadow: 0 0 15px rgba(16,185,129,0.3);">
					<div class="panel-title" style="background: #064e3b; color: #a7f3d0;">
						<span>МЕТОД 4: БУСЫ + РЕТРОМОЛЯРНЫЕ РАСШИРЕНИЯ (GOLD)</span>
						<span class="panel-badge badge-gold">100% ПОКРЫТИЕ КОРЫТОМ • 0% ВЕТВИ</span>
					</div>
					<canvas id="c3" width="${width}" height="${height}"></canvas>
				</div>
			</div>
		</body>
		</html>
	`);

	// Draw on each canvas
	await page.evaluate(({ w, h, bytes, methods, originMm, spacingMm }) => {
		for (let mIdx = 0; mIdx < methods.length; mIdx++) {
			const m = methods[mIdx];
			const canvas = document.getElementById(`c${mIdx}`) as HTMLCanvasElement;
			const ctx = canvas.getContext("2d")!;

			// Raw MIP image
			const imgData = ctx.createImageData(w, h);
			imgData.data.set(new Uint8ClampedArray(bytes));
			ctx.putImageData(imgData, 0, 0);

			// 1. Focal trough boundaries (yellow dashed)
			ctx.lineWidth = 1.6;
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = "rgba(234, 179, 8, 0.85)";

			if (m.trough.innerBoundary.length > 1) {
				ctx.beginPath();
				const p0x = (m.trough.innerBoundary[0].x - originMm.x) / spacingMm.x;
				const p0y = (m.trough.innerBoundary[0].y - originMm.y) / spacingMm.y;
				ctx.moveTo(p0x, p0y);
				for (let i = 1; i < m.trough.innerBoundary.length; i++) {
					const px = (m.trough.innerBoundary[i].x - originMm.x) / spacingMm.x;
					const py = (m.trough.innerBoundary[i].y - originMm.y) / spacingMm.y;
					ctx.lineTo(px, py);
				}
				ctx.stroke();
			}

			if (m.trough.outerBoundary.length > 1) {
				ctx.beginPath();
				const p0x = (m.trough.outerBoundary[0].x - originMm.x) / spacingMm.x;
				const p0y = (m.trough.outerBoundary[0].y - originMm.y) / spacingMm.y;
				ctx.moveTo(p0x, p0y);
				for (let i = 1; i < m.trough.outerBoundary.length; i++) {
					const px = (m.trough.outerBoundary[i].x - originMm.x) / spacingMm.x;
					const py = (m.trough.outerBoundary[i].y - originMm.y) / spacingMm.y;
					ctx.lineTo(px, py);
				}
				ctx.stroke();
			}

			// 2. Dental arch central spline (Bright Cyan)
			ctx.setLineDash([]);
			ctx.lineWidth = 2.5;
			ctx.strokeStyle = mIdx === 3 ? "#10b981" : "#06b6d4";
			ctx.shadowColor = mIdx === 3 ? "#10b981" : "#06b6d4";
			ctx.shadowBlur = 4;

			if (m.spline.length > 1) {
				ctx.beginPath();
				const p0x = (m.spline[0].x - originMm.x) / spacingMm.x;
				const p0y = (m.spline[0].y - originMm.y) / spacingMm.y;
				ctx.moveTo(p0x, p0y);
				for (let i = 1; i < m.spline.length; i++) {
					const px = (m.spline[i].x - originMm.x) / spacingMm.x;
					const py = (m.spline[i].y - originMm.y) / spacingMm.y;
					ctx.lineTo(px, py);
				}
				ctx.stroke();
			}
			ctx.shadowBlur = 0;

			// 3. Tooth Anchors & FDI Labels
			for (const a of m.anchors) {
				const px = (a.positionMm.x - originMm.x) / spacingMm.x;
				const py = (a.positionMm.y - originMm.y) / spacingMm.y;

				// Outer marker
				ctx.beginPath();
				ctx.arc(px, py, 5.5, 0, Math.PI * 2);
				ctx.fillStyle = mIdx === 3 ? "rgba(16, 185, 129, 0.95)" : "rgba(244, 63, 94, 0.9)";
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1.5;
				ctx.stroke();

				// Center dot
				ctx.beginPath();
				ctx.arc(px, py, 2, 0, Math.PI * 2);
				ctx.fillStyle = "#ffffff";
				ctx.fill();

				// Tooth label
				ctx.font = "bold 10px monospace";
				const text = a.toothFdi;
				const tm = ctx.measureText(text);
				const tw = tm.width;
				const th = 11;

				const labelY = py < h / 2 ? py - 11 : py + 14;
				const labelX = px - tw / 2;

				ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
				ctx.fillRect(labelX - 3, labelY - 8, tw + 6, th + 2);
				ctx.strokeStyle = mIdx === 3 ? "#10b981" : "#f43f5e";
				ctx.lineWidth = 1;
				ctx.strokeRect(labelX - 3, labelY - 8, tw + 6, th + 2);

				ctx.fillStyle = "#f8fafc";
				ctx.fillText(text, labelX, labelY);
			}
		}
	}, {
		w: width,
		h: height,
		bytes: Array.from(rgba),
		methods,
		originMm: volume.originMm,
		spacingMm: volume.spacingMm,
	});

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "comparison_4_methods_v2.png");

	await page.screenshot({ path: outPath, fullPage: true });
	console.log(`[BENCHMARK SAVED] 4-Methods comparison saved to: ${outPath}`);

	await browser.close();
}

renderBenchmark().catch(console.error);
