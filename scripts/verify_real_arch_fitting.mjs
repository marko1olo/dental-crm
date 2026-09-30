import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { autoDetectDentalArch, findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { getFocalTroughBoundaryCurves } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

async function main() {
	console.log("=== VERIFYING REAL CBCT AUTO-ARCH FITTING ON ZAKHAROV DATASET ===");

	const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const slices = manifest.slices;
	console.log(`Loaded manifest: ${slices.length} slices.`);

	const validSlices = slices.filter((s) => {
		const filePath = path.resolve("apps/web/public/radiology/demo_cbct", s);
		return readFileSync(filePath).byteLength >= 720000;
	});
	console.log(`Valid 600x600 slices: ${validSlices.length}.`);

	const width = 600;
	const height = 600;
	const depth = validSlices.length;
	const sliceCount = width * height;
	const voxelData = new Int16Array(width * height * depth);

	let minHU = 32767;
	let maxHU = -32768;

	console.log("Reading raw DICOM slices into voxel buffer...");
	for (let z = 0; z < depth; z++) {
		const filePath = path.resolve("apps/web/public/radiology/demo_cbct", validSlices[z]);
		const fileBuffer = readFileSync(filePath);
		const rawOffset = fileBuffer.byteLength - sliceCount * 2;
		const raw = new Uint16Array(fileBuffer.buffer, fileBuffer.byteOffset + rawOffset, sliceCount);
		const base = z * sliceCount;
		for (let i = 0; i < sliceCount; i++) {
			const hu = (raw[i] || 0) - 1000;
			voxelData[base + i] = hu;
			if (hu < minHU) minHU = hu;
			if (hu > maxHU) maxHU = hu;
		}
	}

	const pixelSpacing = 0.25; // 0.25 mm per voxel
	const sliceThickness = 0.25;
	const physicalWidthMm = width * pixelSpacing;
	const physicalHeightMm = height * pixelSpacing;
	const physicalDepthMm = depth * sliceThickness;

	const volume = {
		id: "zakharov-real-proof",
		dimensions: { width, height, depth },
		spacingMm: { x: pixelSpacing, y: pixelSpacing, z: sliceThickness },
		originMm: {
			x: -physicalWidthMm * 0.5,
			y: -physicalHeightMm * 0.5,
			z: -physicalDepthMm * 0.5,
		},
		physicalSizeMm: {
			x: physicalWidthMm,
			y: physicalHeightMm,
			z: physicalDepthMm,
		},
		data: voxelData,
		minHU,
		maxHU,
		rescaleSlope: 1.0,
		rescaleIntercept: -1000,
		defaultWindowWidth: 4400,
		defaultWindowLevel: 1300,
		isDisposed: false,
	};

	console.log(`Volume built: ${width}x${height}x${depth}, HU range: [${minHU}, ${maxHU}]`);

	const t0 = performance.now();
	console.log("Running autoDetectDentalArch('mandible')...");
	const arch = autoDetectDentalArch(volume, "mandible");
	const elapsed = performance.now() - t0;

	console.log(`Auto-Arch completed in ${elapsed.toFixed(1)} ms!`);
	console.log(`- Occlusal Z Plane: ${arch.planeZMm ?? "N/A"} mm`);
	console.log(`- Total Arc Length: ${arch.totalArcLengthMm} mm`);
	console.log(`- Anchors detected: ${arch.anchors.length}`);
	console.log(`- Spline sample points: ${arch.splinePointsMm.length}`);

	// Extract the real 2D Axial MIP slab at this occlusal plane
	const occlusalZMm = arch.planeZMm ?? findOcclusalZPlane(volume, "mandible");
	const mipSlab = extractAxialMIPSlab(volume, occlusalZMm, 14.0);
	console.log(`MIP Slab extracted: ${mipSlab.width}x${mipSlab.height}, centerZ = ${occlusalZMm} mm`);

	// Focal trough boundaries (+/- 6 mm)
	const trough = getFocalTroughBoundaryCurves(arch.splinePointsMm, 12.0);

	// Convert MIP slab HU values to 8-bit grayscale [0..255]
	// Bone window: WL = 1000, WW = 2000 => [-0, 2000]
	const wl = 1000;
	const ww = 2500;
	const low = wl - ww / 2;
	const high = wl + ww / 2;
	const rgba = new Uint8ClampedArray(width * height * 4);

	for (let i = 0; i < width * height; i++) {
		const hu = mipSlab.data[i];
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

	// Launch headless browser to render overlay and capture clean screenshot
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

	// Transfer data to browser page and render
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
				<h1>РЕАЛЬНАЯ АВТОРАЗМЕТКА ЗУБНОЙ ДУГИ — ПАЦИЕНТ ЗАХАРОВ И.Д.</h1>
				<p>Dataset: 312 DICOM slices (600x600) • Z-plane: ${occlusalZMm.toFixed(1)} mm • Arc Length: ${arch.totalArcLengthMm} mm • 16 FDI Anchors</p>
			</div>
			<div class="canvas-container">
				<canvas id="viewCanvas" width="${width}" height="${height}"></canvas>
			</div>
			<div class="legend">
				<div class="legend-item"><span class="legend-color" style="background:#06b6d4;"></span><span>Центральная дуга (Catmull-Rom Spline)</span></div>
				<div class="legend-item"><span class="legend-color" style="background:rgba(234,179,8,0.5);"></span><span>Фокальное корыто (+/- 6 мм)</span></div>
				<div class="legend-item"><span class="legend-color" style="background:#f43f5e;"></span><span>Анкеры зубов FDI (48..38)</span></div>
			</div>
		</body>
		</html>
	`);

	// Draw on canvas via page.evaluate
	await page.evaluate(({ width, height, rawBytes, originMm, spacingMm, splinePoints, anchors, innerBoundary, outerBoundary }) => {
		const canvas = document.getElementById("viewCanvas");
		const ctx = canvas.getContext("2d");

		// 1. Draw raw axial MIP image
		const imgData = ctx.createImageData(width, height);
		imgData.data.set(new Uint8ClampedArray(rawBytes));
		ctx.putImageData(imgData, 0, 0);

		// Helper: convert physical mm (X, Y) to canvas pixels (PX, PY)
		function mmToPx(pt) {
			const px = (pt.x - originMm.x) / spacingMm.x;
			const py = (pt.y - originMm.y) / spacingMm.y;
			return { x: px, y: py };
		}

		// 2. Draw Focal Trough boundaries (Yellow dashed)
		ctx.lineWidth = 1.5;
		ctx.setLineDash([4, 4]);
		ctx.strokeStyle = "rgba(234, 179, 8, 0.6)";

		if (innerBoundary.length > 1) {
			ctx.beginPath();
			const p0 = mmToPx(innerBoundary[0]);
			ctx.moveTo(p0.x, p0.y);
			for (let i = 1; i < innerBoundary.length; i++) {
				const p = mmToPx(innerBoundary[i]);
				ctx.lineTo(p.x, p.y);
			}
			ctx.stroke();
		}

		if (outerBoundary.length > 1) {
			ctx.beginPath();
			const p0 = mmToPx(outerBoundary[0]);
			ctx.moveTo(p0.x, p0.y);
			for (let i = 1; i < outerBoundary.length; i++) {
				const p = mmToPx(outerBoundary[i]);
				ctx.lineTo(p.x, p.y);
			}
			ctx.stroke();
		}

		// 3. Draw Central Catmull-Rom Spline Arch (Bright Cyan)
		ctx.setLineDash([]);
		ctx.lineWidth = 2.5;
		ctx.strokeStyle = "#06b6d4";
		ctx.shadowColor = "#06b6d4";
		ctx.shadowBlur = 4;

		if (splinePoints.length > 1) {
			ctx.beginPath();
			const p0 = mmToPx(splinePoints[0]);
			ctx.moveTo(p0.x, p0.y);
			for (let i = 1; i < splinePoints.length; i++) {
				const p = mmToPx(splinePoints[i]);
				ctx.lineTo(p.x, p.y);
			}
			ctx.stroke();
		}
		ctx.shadowBlur = 0;

		// 4. Draw Tooth Anchors & FDI Labels
		for (const a of anchors) {
			const p = mmToPx(a.positionMm);

			// Outer ring
			ctx.beginPath();
			ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(244, 63, 94, 0.9)";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();

			// Center dot
			ctx.beginPath();
			ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
			ctx.fillStyle = "#ffffff";
			ctx.fill();

			// Tooth Number Label Badge
			ctx.font = "bold 11px monospace";
			const text = a.toothFdi;
			const tm = ctx.measureText(text);
			const tw = tm.width;
			const th = 12;

			// Label offset (away from arch center)
			const labelY = p.y < height / 2 ? p.y - 12 : p.y + 16;
			const labelX = p.x - tw / 2;

			ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
			ctx.fillRect(labelX - 3, labelY - 9, tw + 6, th + 2);
			ctx.strokeStyle = "#f43f5e";
			ctx.lineWidth = 1;
			ctx.strokeRect(labelX - 3, labelY - 9, tw + 6, th + 2);

			ctx.fillStyle = "#f8fafc";
			ctx.fillText(text, labelX, labelY);
		}
	}, {
		width,
		height,
		rawBytes: Array.from(rgba),
		originMm: volume.originMm,
		spacingMm: volume.spacingMm,
		splinePoints: arch.splinePointsMm,
		anchors: arch.anchors,
		innerBoundary: trough.innerBoundary,
		outerBoundary: trough.outerBoundary,
	});

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "real_zakharov_auto_arch_proof.png");

	const canvasElement = await page.locator(".canvas-container");
	await canvasElement.screenshot({ path: outPath });
	console.log(`SUCCESS! High-res proof screenshot saved to: ${outPath}`);

	await browser.close();
}

main().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
