import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import {
	autoDetectDentalArch,
	findOcclusalZPlane,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.ts";
import {
	computeCrossSectionAffineBasis,
} from "../apps/web/src/components/radiology/cbctCrossSectionResliceMath.ts";
import { sampleVoxelTrilinearHU } from "../apps/web/src/components/radiology/cbctMprMath.ts";
import { measureAlveolarRidgeCaliper } from "../apps/web/src/components/radiology/cbctRidgeCaliperMath.ts";
import { calculateArchTangentsAndNormals } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

async function render() {
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
	const normals = calculateArchTangentsAndNormals(maxArch.splinePointsMm);

	const slicesInfo: any[] = [];

	for (const tooth of ["26", "27"]) {
		const anchor = maxArch.anchors.find((a: any) => a.toothFdi === tooth);
		if (!anchor) continue;

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
		const rgba = new Uint8ClampedArray(basis.widthPx * basis.heightPx * 4);
		const wl = 600;
		const ww = 2000;
		const low = wl - ww / 2;
		const high = wl + ww / 2;

		for (let y = 0; y < basis.heightPx; y++) {
			const curZ = basis.vox00.z + y * basis.stepVoxVz;
			const rowStartX = basis.vox00.x;
			const rowStartY = basis.vox00.y;
			const rowOffset = y * basis.widthPx;
			for (let x = 0; x < basis.widthPx; x++) {
				const curX = rowStartX + x * basis.stepVoxU.x;
				const curY = rowStartY + x * basis.stepVoxU.y;
				const hu = sampleVoxelTrilinearHU(curX, curY, curZ, volume);
				huData[rowOffset + x] = hu;

				let norm = (hu - low) / (high - low);
				if (norm < 0) norm = 0;
				if (norm > 1) norm = 1;
				const v = Math.round(norm * 255);
				const pIdx = (rowOffset + x) * 4;
				rgba[pIdx] = v;
				rgba[pIdx + 1] = v;
				rgba[pIdx + 2] = v;
				rgba[pIdx + 3] = 255;
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

		slicesInfo.push({
			tooth,
			anchor,
			basis,
			caliper,
			rgba: Array.from(rgba),
		});
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage({ viewport: { width: 900, height: 700 } });

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
				}
				.title { font-size: 18px; font-weight: 700; color: #38bdf8; margin-bottom: 6px; }
				.subtitle { font-size: 13px; color: #a1a1aa; margin-bottom: 20px; }
				.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
				.card {
					background: #18181b;
					border: 1px solid #27272a;
					border-radius: 8px;
					padding: 16px;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.card-header { width: 100%; display: flex; justify-content: space-between; margin-bottom: 12px; }
				.card-title { font-size: 15px; font-weight: 600; color: #f4f4f5; }
				.badge { background: #0284c7; color: #fff; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
				.canvas-wrap { position: relative; border: 1px solid #3f3f46; border-radius: 4px; overflow: hidden; background: #000; }
				canvas { display: block; }
				.metrics { width: 100%; margin-top: 14px; font-family: ui-monospace, monospace; font-size: 12px; }
				.metric-row { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #27272a; }
				.metric-label { color: #a1a1aa; }
				.metric-val { color: #38bdf8; font-weight: 600; }
			</style>
		</head>
		<body>
			<div class="title">ЗАХАРОВ И.Д. — АВТО-КАЛИБР АЛЬВЕОЛЯРНОГО ГРЕБНЯ В ЗОНЕ АДЕНТИИ 26 И 27</div>
			<div class="subtitle">Кросс-секционные срезы (Cross-Sections) • Перпендикулярная проекция по дуге верхней челюсти</div>
			<div class="grid">
				${slicesInfo.map((s, idx) => `
					<div class="card">
						<div class="card-header">
							<span class="card-title">Область зуба FDI #${s.tooth} (отсутствует)</span>
							<span class="badge">Misch ${s.caliper.boneQualityMisch}</span>
						</div>
						<div class="canvas-wrap">
							<canvas id="c-${idx}" width="${s.basis.widthPx}" height="${s.basis.heightPx}" style="width: 280px; height: auto;"></canvas>
						</div>
						<div class="metrics">
							<div class="metric-row">
								<span class="metric-label">Ширина W2 (2 мм от вершины):</span>
								<span class="metric-val">${s.caliper.widthAt2Mm} мм</span>
							</div>
							<div class="metric-row">
								<span class="metric-label">Ширина W6 (6 мм от вершины):</span>
								<span class="metric-val">${s.caliper.widthAt6Mm} мм</span>
							</div>
							<div class="metric-row">
								<span class="metric-label">Высота до дна пазухи (H):</span>
								<span class="metric-val" style="color: ${s.caliper.availableHeightMm < 8 ? '#f43f5e' : '#10b981'}">${s.caliper.availableHeightMm} мм</span>
							</div>
							<div class="metric-row">
								<span class="metric-label">Средняя плотность гребня:</span>
								<span class="metric-val">${s.caliper.meanDensityHU} HU</span>
							</div>
							<div class="metric-row">
								<span class="metric-label">Анатомический ограничитель:</span>
								<span class="metric-val">${s.caliper.anatomicalLimit === 'maxillary_sinus' ? 'Дно гайморовой пазухи' : 'Носовая полость'}</span>
							</div>
							<div class="metric-row">
								<span class="metric-label">Клиническая тактика:</span>
								<span class="metric-val" style="color: #fbbf24">${s.caliper.availableHeightMm < 8 ? 'Показан синус-лифтинг' : 'Стандартная имплантация'}</span>
							</div>
						</div>
					</div>
				`).join("")}
			</div>

			<script>
				const slices = ${JSON.stringify(slicesInfo)};
				slices.forEach((s, idx) => {
					const c = document.getElementById("c-" + idx);
					const ctx = c.getContext("2d");
					const imgData = ctx.createImageData(s.basis.widthPx, s.basis.heightPx);
					imgData.data.set(new Uint8ClampedArray(s.rgba));
					ctx.putImageData(imgData, 0, 0);

					const sp = s.basis.pixelSpacingX;

					// Draw caliper lines
					ctx.lineWidth = 1.5;

					// Crest point
					const cp = s.caliper.crestPointMm;
					const cxPx = cp.x / sp;
					const cyPx = cp.y / sp;
					ctx.fillStyle = "#38bdf8";
					ctx.beginPath();
					ctx.arc(cxPx, cyPx, 3, 0, Math.PI * 2);
					ctx.fill();

					// Height line (H)
					const baseP = s.caliper.measurementPoints.baseLimit;
					const bxPx = baseP.x / sp;
					const byPx = baseP.y / sp;
					ctx.strokeStyle = s.caliper.availableHeightMm < 8 ? "#f43f5e" : "#10b981";
					ctx.setLineDash([3, 3]);
					ctx.beginPath();
					ctx.moveTo(cxPx, cyPx);
					ctx.lineTo(bxPx, byPx);
					ctx.stroke();
					ctx.setLineDash([]);

					// W2 line
					const w2B = s.caliper.measurementPoints.w2Buccal;
					const w2L = s.caliper.measurementPoints.w2Lingual;
					ctx.strokeStyle = "#38bdf8";
					ctx.beginPath();
					ctx.moveTo(w2B.x / sp, w2B.y / sp);
					ctx.lineTo(w2L.x / sp, w2L.y / sp);
					ctx.stroke();

					// W6 line
					const w6B = s.caliper.measurementPoints.w6Buccal;
					const w6L = s.caliper.measurementPoints.w6Lingual;
					ctx.strokeStyle = "#fbbf24";
					ctx.beginPath();
					ctx.moveTo(w6B.x / sp, w6B.y / sp);
					ctx.lineTo(w6L.x / sp, w6L.y / sp);
					ctx.stroke();
				});
			</script>
		</body>
		</html>
	`);

	await page.waitForTimeout(500);
	await page.screenshot({ path: "docs/screenshots/cbct_live/test_zakharov_26_27_cross_sections.png", fullPage: true });
	await browser.close();
	console.log("Screenshot written to docs/screenshots/cbct_live/test_zakharov_26_27_cross_sections.png");
}

render().catch(console.error);
