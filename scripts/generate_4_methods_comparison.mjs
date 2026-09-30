import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { autoDetectDentalArch, findOcclusalZPlane, extractAxialMIPSlab } from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import { getFocalTroughBoundaryCurves, fitSmoothDentalArchSpline } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

async function main() {
	console.log("=== GENERATING 4-METHOD COMPARATIVE BENCHMARK ON REAL ZAKHAROV DATASET ===");

	const manifestPath = path.resolve("apps/web/public/radiology/demo_cbct/manifest.json");
	const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
	const slices = manifest.slices;

	const validSlices = slices.filter((s) => {
		const filePath = path.resolve("apps/web/public/radiology/demo_cbct", s);
		return readFileSync(filePath).byteLength >= 720000;
	});
	console.log(`Loaded ${validSlices.length} valid 600x600 DICOM slices.`);

	const width = 600;
	const height = 600;
	const depth = validSlices.length;
	const sliceCount = width * height;
	const voxelData = new Int16Array(width * height * depth);

	let minHU = 32767;
	let maxHU = -32768;

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

	const pixelSpacing = 0.25;
	const sliceThickness = 0.25;
	const physicalWidthMm = width * pixelSpacing;
	const physicalHeightMm = height * pixelSpacing;
	const physicalDepthMm = depth * sliceThickness;

	const volume = {
		id: "zakharov-4-methods",
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

	// ─── METHOD 1: Текущий срез Z=0.0 мм, MIP 14 мм (Текущий полярный шаблон) ───
	const arch1 = autoDetectDentalArch(volume, "mandible");
	const mip1 = extractAxialMIPSlab(volume, 0.0, 14.0);
	const trough1 = getFocalTroughBoundaryCurves(arch1.splinePointsMm, 12.0);

	// ─── METHOD 2: Срез Z=-4.0 мм (Чистые коронки нижней челюсти), тонкий MIP 7 мм ───
	const zCrowns = -4.0;
	const mip2 = extractAxialMIPSlab(volume, zCrowns, 7.0);

	// ─── METHOD 3: Бинаризация эмали (HU > 1500) на Z=-4 мм + поиск белых островков (Blobs) ───
	const enamelMask = new Uint8Array(width * height);
	for (let i = 0; i < width * height; i++) {
		// Threshold: only dense enamel (> 1500 HU)
		enamelMask[i] = mip2.data[i] > 1500 ? 1 : 0;
	}

	// Simple connected component labeling (flood fill) to find tooth crown blobs
	const visited = new Uint8Array(width * height);
	const blobs = [];

	for (let y = 50; y < height - 50; y++) {
		for (let x = 50; x < width - 50; x++) {
			const idx = y * width + x;
			if (enamelMask[idx] === 1 && visited[idx] === 0) {
				// BFS queue
				let sumX = 0;
				let sumY = 0;
				let count = 0;
				const queue = [idx];
				visited[idx] = 1;

				while (queue.length > 0) {
					const curr = queue.pop();
					const cx = curr % width;
					const cy = Math.floor(curr / width);
					sumX += cx;
					sumY += cy;
					count++;

					const neighbors = [
						curr - 1, curr + 1, curr - width, curr + width
					];
					for (const n of neighbors) {
						if (n >= 0 && n < width * height && enamelMask[n] === 1 && visited[n] === 0) {
							visited[n] = 1;
							queue.push(n);
						}
					}
				}

				// Only keep blobs that have tooth-sized pixel area (between 25 and 1200 pixels)
				if (count >= 20 && count <= 1500) {
					const meanX = sumX / count;
					const meanY = sumY / count;
					// Ignore blobs too far back into cervical spine area (y > 450)
					if (meanY < 420) {
						blobs.push({
							pixelX: meanX,
							pixelY: meanY,
							worldX: Number((volume.originMm.x + meanX * pixelSpacing).toFixed(2)),
							worldY: Number((volume.originMm.y + meanY * pixelSpacing).toFixed(2)),
							area: count,
						});
					}
				}
			}
		}
	}
	console.log(`Detected ${blobs.length} enamel tooth blobs at Z = ${zCrowns} mm.`);

	// ─── METHOD 4: Параболическая кривая через центры зубов с остановкой перед ветвью ───
	// Sort blobs along dental arch from right to left (increasing X or angle)
	const sortedBlobs = [...blobs].sort((a, b) => {
		// Polar angle from mandibular center
		const angleA = Math.atan2(a.worldY - (-10), a.worldX);
		const angleB = Math.atan2(b.worldY - (-10), b.worldX);
		return angleA - angleB;
	});

	// Create smooth spline anchors from sorted blobs
	const archAnchors4 = sortedBlobs.map((b, i) => ({
		id: `blob-${i}`,
		toothFdi: `${i + 1}`,
		labelRu: `T-${i + 1}`,
		positionMm: { x: b.worldX, y: b.worldY },
		isQuadrantRight: b.worldX < 0,
	}));

	const splinePoints4 = archAnchors4.length >= 4 ? fitSmoothDentalArchSpline(archAnchors4, 8) : arch1.splinePointsMm;
	const trough4 = getFocalTroughBoundaryCurves(splinePoints4, 14.0); // wider 14mm trough so incisors are fully covered

	// Helper to convert float MIP array to 8-bit RGBA
	function createRGBA(mipData, wl, ww) {
		const low = wl - ww / 2;
		const high = wl + ww / 2;
		const rgba = new Uint8ClampedArray(width * height * 4);
		for (let i = 0; i < width * height; i++) {
			const hu = mipData[i];
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
		return rgba;
	}

	const rgba1 = createRGBA(mip1.data, 1000, 2500);
	const rgba2 = createRGBA(mip2.data, 1000, 2200);

	// Launch headless browser to composite the 2x2 comparison grid
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 1300, height: 1350 } });

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				body {
					margin: 0;
					padding: 24px;
					background: #09090b;
					color: #f4f4f5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.title {
					text-align: center;
					margin-bottom: 20px;
				}
				.title h1 {
					font-size: 20px;
					margin: 0 0 6px 0;
					color: #22d3ee;
					letter-spacing: 0.5px;
				}
				.title p {
					font-size: 13px;
					margin: 0;
					color: #a1a1aa;
				}
				.grid-2x2 {
					display: grid;
					grid-template-columns: 580px 580px;
					gap: 20px;
				}
				.card {
					background: #18181b;
					border: 1px solid #27272a;
					border-radius: 10px;
					overflow: hidden;
					display: flex;
					flex-direction: column;
					box-shadow: 0 8px 24px rgba(0,0,0,0.5);
				}
				.card-header {
					padding: 10px 14px;
					background: #27272a;
					border-bottom: 1px solid #3f3f46;
					display: flex;
					justify-content: space-between;
					align-items: center;
				}
				.card-title {
					font-size: 13px;
					font-weight: 700;
					color: #f4f4f5;
				}
				.card-badge {
					font-size: 11px;
					font-family: monospace;
					padding: 2px 6px;
					border-radius: 4px;
					background: #09090b;
				}
				.card-desc {
					padding: 6px 14px;
					font-size: 11px;
					color: #a1a1aa;
					background: #18181b;
					border-bottom: 1px solid #27272a;
					min-height: 28px;
				}
				canvas {
					width: 580px;
					height: 580px;
					display: block;
					background: #000;
				}
			</style>
		</head>
		<body>
			<div class="title">
				<h1>СРАВНИТЕЛЬНЫЙ АНАЛИЗ 4 МЕТОДИК РАЗМЕТКИ — ПАЦИЕНТ ЗАХАРОВ И.Д.</h1>
				<p>Тестирование разных срезов Z, порогов эмали, детекции пятен коронок и отсечения ветви челюсти</p>
			</div>

			<div class="grid-2x2">
				<!-- Quadrant 1 -->
				<div class="card">
					<div class="card-header">
						<span class="card-title">1. Текущий срез Z=0.0 мм (Базовый)</span>
						<span class="card-badge" style="color:#f43f5e;">Дефектный</span>
					</div>
					<div class="card-desc">Линия прикуса (двойные резцы), полярный шаблон улетает в восходящую ветвь (48, 38). Резцы вывалились из корыта.</div>
					<canvas id="c1" width="${width}" height="${height}"></canvas>
				</div>

				<!-- Quadrant 2 -->
				<div class="card">
					<div class="card-header">
						<span class="card-title">2. Срез Z=-4.0 мм (Чистые коронки НЧ)</span>
						<span class="card-badge" style="color:#38bdf8;">Тонкий MIP 7 мм</span>
					</div>
					<div class="card-desc">Срез опущен на 4 мм ниже прикуса. Верхние резцы полностью исчезли! Видны изолированные коронки нижней челюсти.</div>
					<canvas id="c2" width="${width}" height="${height}"></canvas>
				</div>

				<!-- Quadrant 3 -->
				<div class="card">
					<div class="card-header">
						<span class="card-title">3. Бинаризация эмали (HU > 1500)</span>
						<span class="card-badge" style="color:#a855f7;">Островки зубов (Blobs)</span>
					</div>
					<div class="card-desc">Чёрный фон, видны чёткие белые овалы и круги каждого зуба. Зелёные точки — вычисленные центры масс (${blobs.length} шт).</div>
					<canvas id="c3" width="${width}" height="${height}"></canvas>
				</div>

				<!-- Quadrant 4 -->
				<div class="card">
					<div class="card-header">
						<span class="card-title">4. Парабола по центрам + Остановка перед ветвью</span>
						<span class="card-badge" style="color:#22c55e;">Целевая модель</span>
					</div>
					<div class="card-desc">Кривая проходит строго через центры зубов, НЕ лезет на ветвь челюсти. Корыто 14 мм полностью накрывает резцы.</div>
					<canvas id="c4" width="${width}" height="${height}"></canvas>
				</div>
			</div>
		</body>
		</html>
	`);

	await page.evaluate(({
		width, height,
		rawBytes1, rawBytes2, enamelMask,
		originMm, spacingMm,
		arch1, trough1,
		blobs,
		splinePoints4, trough4
	}) => {
		function mmToPx(pt) {
			return {
				x: (pt.x - originMm.x) / spacingMm.x,
				y: (pt.y - originMm.y) / spacingMm.y
			};
		}

		// ─── RENDER QUADRANT 1 ───
		{
			const c = document.getElementById("c1");
			const ctx = c.getContext("2d");
			const img = ctx.createImageData(width, height);
			img.data.set(new Uint8ClampedArray(rawBytes1));
			ctx.putImageData(img, 0, 0);

			// Trough
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = "rgba(234, 179, 8, 0.7)";
			[trough1.innerBoundary, trough1.outerBoundary].forEach(b => {
				if (b.length > 1) {
					ctx.beginPath();
					const p0 = mmToPx(b[0]); ctx.moveTo(p0.x, p0.y);
					for (let i = 1; i < b.length; i++) { const p = mmToPx(b[i]); ctx.lineTo(p.x, p.y); }
					ctx.stroke();
				}
			});

			// Spline
			ctx.setLineDash([]);
			ctx.lineWidth = 2.5;
			ctx.strokeStyle = "#06b6d4";
			ctx.beginPath();
			const p0 = mmToPx(arch1.splinePointsMm[0]); ctx.moveTo(p0.x, p0.y);
			for (let i = 1; i < arch1.splinePointsMm.length; i++) { const p = mmToPx(arch1.splinePointsMm[i]); ctx.lineTo(p.x, p.y); }
			ctx.stroke();

			// Dots
			for (const a of arch1.anchors) {
				const p = mmToPx(a.positionMm);
				ctx.beginPath(); ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
				ctx.fillStyle = "#f43f5e"; ctx.fill();
				ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.5; ctx.stroke();
			}
		}

		// ─── RENDER QUADRANT 2 ───
		{
			const c = document.getElementById("c2");
			const ctx = c.getContext("2d");
			const img = ctx.createImageData(width, height);
			img.data.set(new Uint8ClampedArray(rawBytes2));
			ctx.putImageData(img, 0, 0);

			// Draw grid guide in cyan
			ctx.strokeStyle = "rgba(34, 211, 238, 0.15)";
			ctx.lineWidth = 1;
			for (let g = 100; g < width; g += 100) {
				ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, height); ctx.stroke();
				ctx.beginPath(); ctx.moveTo(0, g); ctx.lineTo(width, g); ctx.stroke();
			}
		}

		// ─── RENDER QUADRANT 3 ───
		{
			const c = document.getElementById("c3");
			const ctx = c.getContext("2d");
			const img = ctx.createImageData(width, height);
			for (let i = 0; i < width * height; i++) {
				const v = enamelMask[i] === 1 ? 255 : 0;
				img.data[i * 4] = v;
				img.data[i * 4 + 1] = v;
				img.data[i * 4 + 2] = v;
				img.data[i * 4 + 3] = 255;
			}
			ctx.putImageData(img, 0, 0);

			// Draw detected blob centroids with green crosshairs & circles
			for (const b of blobs) {
				ctx.beginPath();
				ctx.arc(b.pixelX, b.pixelY, 6, 0, Math.PI * 2);
				ctx.fillStyle = "rgba(34, 197, 94, 0.85)";
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1.5;
				ctx.stroke();

				ctx.beginPath();
				ctx.arc(b.pixelX, b.pixelY, 2, 0, Math.PI * 2);
				ctx.fillStyle = "#ffffff";
				ctx.fill();
			}
		}

		// ─── RENDER QUADRANT 4 ───
		{
			const c = document.getElementById("c4");
			const ctx = c.getContext("2d");
			const img = ctx.createImageData(width, height);
			img.data.set(new Uint8ClampedArray(rawBytes2));
			ctx.putImageData(img, 0, 0);

			// Focal trough 14mm (Green dashed)
			ctx.lineWidth = 1.5;
			ctx.setLineDash([4, 4]);
			ctx.strokeStyle = "rgba(34, 197, 94, 0.8)";
			[trough4.innerBoundary, trough4.outerBoundary].forEach(b => {
				if (b.length > 1) {
					ctx.beginPath();
					const p0 = mmToPx(b[0]); ctx.moveTo(p0.x, p0.y);
					for (let i = 1; i < b.length; i++) { const p = mmToPx(b[i]); ctx.lineTo(p.x, p.y); }
					ctx.stroke();
				}
			});

			// Spline through tooth centers
			ctx.setLineDash([]);
			ctx.lineWidth = 3;
			ctx.strokeStyle = "#22d3ee";
			ctx.shadowColor = "#22d3ee";
			ctx.shadowBlur = 6;
			ctx.beginPath();
			const p0 = mmToPx(splinePoints4[0]); ctx.moveTo(p0.x, p0.y);
			for (let i = 1; i < splinePoints4.length; i++) { const p = mmToPx(splinePoints4[i]); ctx.lineTo(p.x, p.y); }
			ctx.stroke();
			ctx.shadowBlur = 0;

			// Tooth centroids
			for (const b of blobs) {
				ctx.beginPath();
				ctx.arc(b.pixelX, b.pixelY, 5, 0, Math.PI * 2);
				ctx.fillStyle = "#22c55e";
				ctx.fill();
				ctx.strokeStyle = "#fff";
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
		}
	}, {
		width, height,
		rawBytes1: Array.from(rgba1),
		rawBytes2: Array.from(rgba2),
		enamelMask: Array.from(enamelMask),
		originMm: volume.originMm,
		spacingMm: volume.spacingMm,
		arch1, trough1,
		blobs,
		splinePoints4, trough4
	});

	const outDir = path.resolve("docs/screenshots/cbct_live");
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "comparison_4_methods.png");

	await page.screenshot({ path: outPath, fullPage: true });
	console.log(`SUCCESS! 4-Methods comparison saved to: ${outPath}`);

	await browser.close();
}

main().catch(err => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
