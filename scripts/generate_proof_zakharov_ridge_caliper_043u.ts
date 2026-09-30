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
import {
	measureAlveolarRidgeCaliper,
	generateRidge043ProtocolText,
} from "../apps/web/src/components/radiology/cbctRidgeCaliperMath.ts";
import { calculateArchTangentsAndNormals } from "../apps/web/src/components/radiology/cbctArchSplineMath.ts";

async function main() {
	console.log("=== GENERATING ZAKHAROV RIDGE CALIPER & FORM 043/U PROOF ===");

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

	const slicesData: any[] = [];

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

		const protocol043 = generateRidge043ProtocolText(caliper, "Захаров И.Д.", tooth);

		slicesData.push({
			tooth,
			anchor,
			basis,
			caliper,
			protocol043,
			rgba: Array.from(rgba),
		});
	}

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

	await page.setContent(`
		<!DOCTYPE html>
		<html>
		<head>
			<style>
				* { box-sizing: border-box; }
				body {
					margin: 0;
					padding: 24px;
					background: #09090b;
					color: #f4f4f5;
					font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
				}
				.header-strip {
					display: flex;
					justify-content: space-between;
					align-items: center;
					border-bottom: 1px solid #27272a;
					padding-bottom: 14px;
					margin-bottom: 20px;
				}
				.title { font-size: 17px; font-weight: 700; color: #38bdf8; letter-spacing: -0.01em; margin: 0 0 4px 0; }
				.subtitle { font-size: 12px; color: #a1a1aa; margin: 0; }
				.badge-emr {
					display: inline-flex;
					align-items: center;
					gap: 6px;
					background: #022c22;
					border: 1px solid #059669;
					color: #34d399;
					font-size: 11px;
					font-weight: 600;
					padding: 6px 12px;
					border-radius: 6px;
				}
				.layout-grid {
					display: grid;
					grid-template-columns: 580px 1fr;
					gap: 20px;
				}
				.slices-col {
					display: flex;
					gap: 16px;
				}
				.slice-card {
					flex: 1;
					background: #18181b;
					border: 1px solid #27272a;
					border-radius: 8px;
					padding: 12px;
					display: flex;
					flex-direction: column;
					align-items: center;
				}
				.slice-header {
					width: 100%;
					display: flex;
					justify-content: space-between;
					align-items: center;
					margin-bottom: 8px;
				}
				.slice-title { font-size: 13px; font-weight: 600; color: #e4e4e7; }
				.slice-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: #0284c7; color: #fff; }
				.canvas-box {
					border: 1px solid #3f3f46;
					border-radius: 4px;
					overflow: hidden;
					background: #000;
					box-shadow: 0 4px 12px rgba(0,0,0,0.5);
				}
				canvas { display: block; }
				.caliper-legend {
					width: 100%;
					margin-top: 10px;
					font-family: ui-monospace, monospace;
					font-size: 11px;
				}
				.caliper-row {
					display: flex;
					justify-content: space-between;
					padding: 2.5px 0;
					border-bottom: 1px solid #27272a;
				}
				.caliper-label { color: #a1a1aa; }
				.caliper-val { font-weight: 600; }
				.caliper-val-w2 { color: #38bdf8; }
				.caliper-val-w6 { color: #fbbf24; }
				.caliper-val-h { color: #f43f5e; }
				.protocol-col {
					background: #18181b;
					border: 1px solid #27272a;
					border-radius: 8px;
					padding: 16px;
					display: flex;
					flex-direction: column;
				}
				.protocol-header {
					display: flex;
					justify-content: space-between;
					align-items: center;
					border-bottom: 1px solid #27272a;
					padding-bottom: 10px;
					margin-bottom: 12px;
				}
				.protocol-title { font-size: 14px; font-weight: 700; color: #f4f4f5; display: flex; align-items: center; gap: 8px; }
				.btn-emr-action {
					background: #0ea5e9;
					color: #000;
					border: none;
					padding: 5px 12px;
					border-radius: 4px;
					font-size: 11px;
					font-weight: 700;
					display: flex;
					align-items: center;
					gap: 6px;
					cursor: pointer;
				}
				.protocol-body {
					flex: 1;
					background: #09090b;
					border: 1px solid #27272a;
					border-radius: 6px;
					padding: 14px;
					font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
					font-size: 11px;
					line-height: 1.5;
					color: #d4d4d8;
					white-space: pre-wrap;
					overflow-y: auto;
				}
				.audit-footer {
					margin-top: 14px;
					display: flex;
					justify-content: space-between;
					font-size: 11px;
					color: #71717a;
					border-top: 1px solid #27272a;
					padding-top: 10px;
				}
				.audit-item { display: flex; gap: 6px; align-items: center; }
				.audit-dot { width: 6px; height: 6px; border-radius: 50%; background: #10b981; }
			</style>
		</head>
		<body>
			<div class="header-strip">
				<div>
					<h1 class="title">ЗАХАРОВ И.Д. — АВТО-КАЛИБР ГРЕБНЯ И ДОКУМЕНТАЦИЯ ФОРМЫ 043/У</h1>
					<p class="subtitle">КЛКТ Томография • Перпендикулярная морфометрия альвеолярного отростка верхней челюсти (Maxilla)</p>
				</div>
				<div class="badge-emr">
					<span style="font-size: 14px;">✓</span>
					<span>ПРИКРЕПЛЕНО В ЭМК 043/У (АВТОМАТ В 1 КЛИК)</span>
				</div>
			</div>

			<div class="layout-grid">
				<!-- Slices Column -->
				<div class="slices-col">
					${slicesData.map((s, idx) => `
						<div class="slice-card">
							<div class="slice-header">
								<span class="slice-title">Дефект #${s.tooth} (отсутствует)</span>
								<span class="slice-badge">Misch ${s.caliper.boneQualityMisch}</span>
							</div>
							<div class="canvas-box">
								<canvas id="canvas-${idx}" width="${s.basis.widthPx}" height="${s.basis.heightPx}" style="width: 250px; height: auto;"></canvas>
							</div>
							<div class="caliper-legend">
								<div class="caliper-row">
									<span class="caliper-label">Ширина W2 (2 мм):</span>
									<span class="caliper-val caliper-val-w2">${s.caliper.widthAt2Mm} мм</span>
								</div>
								<div class="caliper-row">
									<span class="caliper-label">Базальная W6 (6 мм):</span>
									<span class="caliper-val caliper-val-w6">${s.caliper.widthAt6Mm} мм</span>
								</div>
								<div class="caliper-row">
									<span class="caliper-label">Высота кости H:</span>
									<span class="caliper-val caliper-val-h">${s.caliper.availableHeightMm} мм</span>
								</div>
								<div class="caliper-row">
									<span class="caliper-label">Плотность:</span>
									<span class="caliper-val" style="color:#e4e4e7;">${s.caliper.meanDensityHU} HU</span>
								</div>
								<div class="caliper-row">
									<span class="caliper-label">Ограничитель:</span>
									<span class="caliper-val" style="color:#94a3b8;">${s.caliper.anatomicalLimit === "maxillary_sinus" ? "Гайморова пазуха" : "Носовая полость"}</span>
								</div>
								<div class="caliper-row">
									<span class="caliper-label">Тактика:</span>
									<span class="caliper-val" style="color:${s.protocol043.sinusLiftNeeded ? "#f43f5e" : "#10b981"};">${s.protocol043.sinusLiftType === "lateral_open" ? "Открытый синус-лифт" : s.protocol043.sinusLiftType === "transcrestal_closed" ? "Закрытый синус-лифт" : "Без пластики"}</span>
								</div>
							</div>
						</div>
					`).join("")}
				</div>

				<!-- Protocol Column -->
				<div class="protocol-col">
					<div class="protocol-header">
						<div class="protocol-title">
							<span>ПРОТОКОЛ ОБСЛЕДОВАНИЯ КЛКТ (043/У)</span>
						</div>
						<button class="btn-emr-action">
							<span>Экспорт в дневник</span>
						</button>
					</div>
					<div class="protocol-body">${slicesData[0].protocol043.fullProtocolText}\n\n` +
					`───────────────────────────────────────────────────────────────────────────────\n` +
					`СМЕЖНЫЙ ДЕФЕКТ FDI #27:\n` +
					`  • Морфометрия гребня: W2 = ${slicesData[1].caliper.widthAt2Mm} мм, W6 = ${slicesData[1].caliper.widthAt6Mm} мм, H = ${slicesData[1].caliper.availableHeightMm} мм\n` +
					`  • Оптическая плотность: ${slicesData[1].caliper.meanDensityHU} HU (Класс ${slicesData[1].caliper.boneQualityMisch})\n` +
					`  • Рекомендация: ${slicesData[1].protocol043.surgicalRecommendation043.split("\n")[1]}\n` +
					`═══════════════════════════════════════════════════════════════════════════════` + `</div>
					<div class="audit-footer">
						<div class="audit-item">
							<div class="audit-dot"></div>
							<span>Анти-свалка: тихий 1-клик экспорт в ЭМК</span>
						</div>
						<div class="audit-item">
							<div class="audit-dot"></div>
							<span>Misch CE & ITI Consensus Guidelines</span>
						</div>
					</div>
				</div>
			</div>

			<script>
				const slices = ${JSON.stringify(slicesData)};
				slices.forEach((s, idx) => {
					const c = document.getElementById("canvas-" + idx);
					const ctx = c.getContext("2d");
					const imgData = ctx.createImageData(s.basis.widthPx, s.basis.heightPx);
					imgData.data.set(new Uint8ClampedArray(s.rgba));
					ctx.putImageData(imgData, 0, 0);

					const sp = s.basis.pixelSpacingX;

					// Crest point
					const cp = s.caliper.crestPointMm;
					const cxPx = cp.x / sp;
					const cyPx = cp.y / sp;
					ctx.fillStyle = "#38bdf8";
					ctx.beginPath();
					ctx.arc(cxPx, cyPx, 3, 0, Math.PI * 2);
					ctx.fill();

					// Height line H (dashed)
					const baseP = s.caliper.measurementPoints.baseLimit;
					const bxPx = baseP.x / sp;
					const byPx = baseP.y / sp;
					ctx.strokeStyle = s.caliper.availableHeightMm < 8 ? "#f43f5e" : "#10b981";
					ctx.lineWidth = 1.5;
					ctx.setLineDash([3, 3]);
					ctx.beginPath();
					ctx.moveTo(cxPx, cyPx);
					ctx.lineTo(bxPx, byPx);
					ctx.stroke();
					ctx.setLineDash([]);

					// W2 line (cyan)
					const w2B = s.caliper.measurementPoints.w2Buccal;
					const w2L = s.caliper.measurementPoints.w2Lingual;
					ctx.strokeStyle = "#38bdf8";
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.moveTo(w2B.x / sp, w2B.y / sp);
					ctx.lineTo(w2L.x / sp, w2L.y / sp);
					ctx.stroke();

					// W6 line (amber)
					const w6B = s.caliper.measurementPoints.w6Buccal;
					const w6L = s.caliper.measurementPoints.w6Lingual;
					ctx.strokeStyle = "#fbbf24";
					ctx.lineWidth = 1.5;
					ctx.beginPath();
					ctx.moveTo(w6B.x / sp, w6B.y / sp);
					ctx.lineTo(w6L.x / sp, w6L.y / sp);
					ctx.stroke();
				});
			</script>
		</body>
		</html>
	`);

	await page.waitForTimeout(600);
	const targetPath = path.resolve("docs/screenshots/cbct_live/proof_zakharov_ridge_caliper_043u.png");
	await page.screenshot({ path: targetPath, fullPage: true });
	await browser.close();
	console.log(`Proof screenshot generated at: ${targetPath}`);
}

main().catch(console.error);
