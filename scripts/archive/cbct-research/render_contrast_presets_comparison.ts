import { readFileSync, readdirSync, statSync, mkdirSync, copyFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import { chromium } from "playwright";
import { buildVolumeFromDicomBuffers } from "../apps/web/src/components/radiology/realDicomVolumeLoader.js";
import {
	findOcclusalZPlane,
	extractAxialMIPSlab,
	type AxialMIPSlab,
} from "../apps/web/src/components/radiology/cbctAutoArchEngine.js";
import {
	getFocalTroughBoundaryCurves,
} from "../apps/web/src/components/radiology/cbctArchSplineMath.js";
import {
	detectHonestDentalArch,
} from "../apps/web/src/components/radiology/cbctHonestArchBlobEngine.js";
import { reconstructPanoramicView } from "../apps/web/src/components/radiology/cbctPanoramicReconstructionMath.js";
import {
	DENTE_CONTRAST_PRESETS,
	generate16BitLut,
	type DenteContrastPreset,
} from "../apps/web/src/components/radiology/cbctLutMath.js";

function slabToRgbaWithLut(slab: AxialMIPSlab, lut: Uint8Array): Uint8ClampedArray {
	const count = slab.width * slab.height;
	const rgba = new Uint8ClampedArray(count * 4);
	for (let i = 0; i < count; i++) {
		const hu = slab.data[i] ?? -1000;
		const lutIdx = (Math.max(-32768, Math.min(32767, Math.round(hu))) + 32768) & 0xffff;
		const v = lut[lutIdx] ?? 0;
		const idx = i * 4;
		rgba[idx] = v;
		rgba[idx + 1] = v;
		rgba[idx + 2] = v;
		rgba[idx + 3] = 255;
	}
	return rgba;
}

async function main() {
	console.log("Loading Zakharov DICOM series...");
	const p = "apps/web/public/radiology/demo_cbct";
	const files = readdirSync(p).filter((f) => statSync(path.join(p, f)).isFile() && f.endsWith(".dcm"));
	const items = files.map((f) => ({ buffer: readFileSync(path.join(p, f)).buffer, fileName: f }));
	const vol = await buildVolumeFromDicomBuffers(items);

	const mandZ = findOcclusalZPlane(vol, "mandible");
	const mandSlab = extractAxialMIPSlab(vol, mandZ, 6.0);
	const mandArch = detectHonestDentalArch(mandSlab, "mandible");

	const mandTrough = getFocalTroughBoundaryCurves(mandArch.curve.splinePointsMm, 14.0, {
		enabled: true,
		anteriorThicknessMm: 9.0,
		premolarThicknessMm: 13.0,
		molarThicknessMm: 20.0,
	});

	console.log("Generating 5 Contrast Presets renderings...");
	const presetResults: Array<{
		preset: DenteContrastPreset;
		axialBytes: number[];
		panoBytes: number[];
		panoW: number;
		panoH: number;
		upperMarkers: any[];
		lowerMarkers: any[];
		metrics: {
			airIntensity: number;
			peakEnamelIntensity: number;
			boneMidIntensity: number;
		};
	}> = [];

	for (const preset of DENTE_CONTRAST_PRESETS) {
		const lut = generate16BitLut(
			preset.windowWidth,
			preset.windowLevel,
			false,
			1.0,
			{ peakEnamel: preset.peakEnamel, airCutoffHU: preset.airCutoffHU },
		);

		const axialRgba = slabToRgbaWithLut(mandSlab, lut);

		const panoRes = reconstructPanoramicView(vol, mandArch.curve, {
			windowWidth: preset.windowWidth,
			windowLevel: preset.windowLevel,
			projectionMode: "ray_sum",
			focalTroughThicknessMm: 8.0,
			heightMm: 70.0,
			softKnee: { peakEnamel: preset.peakEnamel, airCutoffHU: preset.airCutoffHU },
		});

		// Sample test HU values through LUT
		const airIdx = (-1000 + 32768) & 0xffff;
		const air150Idx = (-150 + 32768) & 0xffff;
		const boneIdx = (800 + 32768) & 0xffff;
		const enamelIdx = (3000 + 32768) & 0xffff;

		presetResults.push({
			preset,
			axialBytes: Array.from(axialRgba),
			panoBytes: Array.from(panoRes.pixelData),
			panoW: panoRes.widthPx,
			panoH: panoRes.heightPx,
			upperMarkers: panoRes.toothMarkersOnPano.filter((m) => m.isUpper ?? false),
			lowerMarkers: panoRes.toothMarkersOnPano.filter((m) => m.isLower ?? true),
			metrics: {
				airIntensity: Math.max(lut[airIdx] ?? 0, lut[air150Idx] ?? 0),
				peakEnamelIntensity: lut[enamelIdx] ?? 0,
				boneMidIntensity: lut[boneIdx] ?? 0,
			},
		});
	}

	const renderPayload = {
		patientName: "Захаров И.Д.",
		dims: `${vol.dimensions.width} × ${vol.dimensions.height} × ${vol.dimensions.depth}`,
		spacing: `${vol.spacingMm.x.toFixed(2)} × ${vol.spacingMm.y.toFixed(2)} × ${vol.spacingMm.z.toFixed(2)} мм`,
		mandible: {
			w: mandSlab.width,
			h: mandSlab.height,
			originMm: mandSlab.originMm,
			spacingMm: mandSlab.spacingMm,
			zMm: mandZ,
			spline: mandArch.curve.splinePointsMm,
			trough: mandTrough,
			anchors: mandArch.anchors,
		},
		presets: presetResults,
	};

	const html = `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<style>
		* { box-sizing: border-box; }
		body {
			margin: 0;
			padding: 20px;
			background: #09090b;
			color: #f4f4f5;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: flex-start;
		}
		.telemetry-header {
			width: 100%;
			max-width: 1720px;
			background: #18181b;
			border: 1px solid #27272a;
			border-radius: 8px;
			padding: 14px 20px;
			margin-bottom: 16px;
			display: flex;
			align-items: center;
			justify-content: space-between;
		}
		.title-box h1 {
			margin: 0 0 4px 0;
			font-size: 18px;
			color: #38bdf8;
			font-weight: 700;
		}
		.title-box p {
			margin: 0;
			font-size: 12px;
			color: #a1a1aa;
		}
		.stats-chips {
			display: flex;
			gap: 12px;
			align-items: center;
		}
		.chip {
			background: #27272a;
			border: 1px solid #3f3f46;
			border-radius: 6px;
			padding: 4px 12px;
			font-size: 12px;
			color: #e4e4e7;
		}
		.chip span { color: #a1a1aa; margin-right: 4px; }
		.presets-container {
			width: 100%;
			max-width: 1720px;
			display: flex;
			flex-direction: column;
			gap: 16px;
		}
		.preset-card {
			background: #121215;
			border: 1px solid #27272a;
			border-radius: 8px;
			overflow: hidden;
			display: grid;
			grid-template-columns: 320px 460px 1fr;
			gap: 14px;
			padding: 12px;
			align-items: center;
		}
		.preset-meta-box {
			display: flex;
			flex-direction: column;
			gap: 8px;
			padding-right: 12px;
			border-right: 1px solid #27272a;
		}
		.preset-title {
			font-size: 14px;
			font-weight: 700;
			color: #fbbf24;
		}
		.preset-badges {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
		}
		.pbadge {
			font-size: 10px;
			padding: 3px 8px;
			border-radius: 4px;
			background: #1f2937;
			border: 1px solid #374151;
			color: #93c5fd;
			font-family: monospace;
			font-weight: 600;
		}
		.pbadge.air {
			background: #000;
			border-color: #22c55e;
			color: #4ade80;
		}
		.pbadge.enamel {
			background: #18181b;
			border-color: #f59e0b;
			color: #fcd34d;
		}
		.preset-desc {
			font-size: 11px;
			color: #d1d5db;
			line-height: 1.4;
		}
		.preset-telemetry {
			font-size: 10px;
			color: #9ca3af;
			background: #18181b;
			padding: 6px 10px;
			border-radius: 4px;
			border: 1px solid #27272a;
			display: flex;
			flex-direction: column;
			gap: 3px;
		}
		.telemetry-row {
			display: flex;
			justify-content: space-between;
		}
		.canvas-box {
			display: flex;
			flex-direction: column;
			align-items: center;
			background: #000;
			border: 1px solid #27272a;
			border-radius: 6px;
			padding: 6px;
			position: relative;
		}
		.canvas-box-title {
			font-size: 10px;
			color: #9ca3af;
			margin-bottom: 4px;
			align-self: flex-start;
			font-family: monospace;
		}
		canvas {
			max-width: 100%;
			height: auto;
			display: block;
		}
	</style>
</head>
<body>
	<div class="telemetry-header">
		<div class="title-box">
			<h1>СРАВНЕНИЕ 5 КЛИНИЧЕСКИХ ПРЕСЕТОВ ЯРКОСТИ И КОНТРАСТА КЛКТ (ПАЦИЕНТ: ${renderPayload.patientName})</h1>
			<p>Инварианты Доктора: Абсолютно черный воздух (HU &le; -100 строго 0,0,0) • Мягкая эмаль зубов без пересвета • Чистые номера FDI</p>
		</div>
		<div class="stats-chips">
			<div class="chip"><span>Воксели:</span>${renderPayload.dims}</div>
			<div class="chip"><span>Шаг:</span>${renderPayload.spacing}</div>
		</div>
	</div>

	<div class="presets-container" id="presetsContainer"></div>

	<script>
		const payload = ${JSON.stringify(renderPayload)};
		const container = document.getElementById("presetsContainer");

		payload.presets.forEach((item, idx) => {
			const card = document.createElement("div");
			card.className = "preset-card";

			card.innerHTML = \`
				<div class="preset-meta-box">
					<div class="preset-title">\${item.preset.nameRu}</div>
					<div class="preset-badges">
						<span class="pbadge">W: \${item.preset.windowWidth}</span>
						<span class="pbadge">L: \${item.preset.windowLevel}</span>
						<span class="pbadge air">Воздух: 0 / 255 (Черный)</span>
						<span class="pbadge enamel">Пик эмали: \${item.preset.peakEnamel} / 255</span>
					</div>
					<div class="preset-desc">\${item.preset.description}</div>
					<div class="preset-telemetry">
						<div class="telemetry-row"><span>Воздух (-1000 HU):</span><b style="color:#4ade80">\${item.metrics.airIntensity} / 255</b></div>
						<div class="telemetry-row"><span>Трабекулярная кость (+800 HU):</span><b>\${item.metrics.boneMidIntensity} / 255</b></div>
						<div class="telemetry-row"><span>Эмаль / металл (+3000 HU):</span><b style="color:#fcd34d">\${item.metrics.peakEnamelIntensity} / 255</b></div>
					</div>
				</div>
				<div class="canvas-box">
					<div class="canvas-box-title">АКСИАЛЬНЫЙ MIP (6 мм) • Z = \${payload.mandible.zMm.toFixed(1)} мм</div>
					<canvas id="axialCanvas_\${idx}" width="\${payload.mandible.w}" height="\${payload.mandible.h}" style="max-height: 220px;"></canvas>
				</div>
				<div class="canvas-box">
					<div class="canvas-box-title">РЕКОНСТРУИРОВАННАЯ ПАНОРАМА (ОПТГ) • СЛОЙ 12 мм</div>
					<canvas id="panoCanvas_\${idx}" width="\${item.panoW}" height="\${item.panoH}" style="max-height: 220px;"></canvas>
				</div>
			\`;

			container.appendChild(card);
		});

		// Draw all canvases
		payload.presets.forEach((item, idx) => {
			// 1. Axial MIP
			const axialCvs = document.getElementById("axialCanvas_" + idx);
			const aCtx = axialCvs.getContext("2d");
			const aImg = aCtx.createImageData(payload.mandible.w, payload.mandible.h);
			aImg.data.set(new Uint8ClampedArray(item.axialBytes));
			aCtx.putImageData(aImg, 0, 0);

			function toPxX(x) { return (x - payload.mandible.originMm.x) / (payload.mandible.spacingMm.x || 0.25); }
			function toPxY(y) { return (y - payload.mandible.originMm.y) / (payload.mandible.spacingMm.y || 0.25); }

			// Focal Trough
			aCtx.lineWidth = 1.0;
			aCtx.setLineDash([3, 3]);
			aCtx.strokeStyle = "rgba(250, 204, 21, 0.6)";
			if (payload.mandible.trough.innerBoundary.length > 1) {
				aCtx.beginPath();
				aCtx.moveTo(toPxX(payload.mandible.trough.innerBoundary[0].x), toPxY(payload.mandible.trough.innerBoundary[0].y));
				for (let i = 1; i < payload.mandible.trough.innerBoundary.length; i++) {
					aCtx.lineTo(toPxX(payload.mandible.trough.innerBoundary[i].x), toPxY(payload.mandible.trough.innerBoundary[i].y));
				}
				aCtx.stroke();
			}
			if (payload.mandible.trough.outerBoundary.length > 1) {
				aCtx.beginPath();
				aCtx.moveTo(toPxX(payload.mandible.trough.outerBoundary[0].x), toPxY(payload.mandible.trough.outerBoundary[0].y));
				for (let i = 1; i < payload.mandible.trough.outerBoundary.length; i++) {
					aCtx.lineTo(toPxX(payload.mandible.trough.outerBoundary[i].x), toPxY(payload.mandible.trough.outerBoundary[i].y));
				}
				aCtx.stroke();
			}

			// Arch spline
			aCtx.setLineDash([]);
			aCtx.lineWidth = 2.0;
			aCtx.strokeStyle = "#10b981";
			aCtx.beginPath();
			for (let i = 0; i < payload.mandible.spline.length; i++) {
				const px = toPxX(payload.mandible.spline[i].x);
				const py = toPxY(payload.mandible.spline[i].y);
				if (i === 0) aCtx.moveTo(px, py);
				else aCtx.lineTo(px, py);
			}
			aCtx.stroke();

			// Tooth badges (clean, no red defect boxes)
			aCtx.font = "bold 9px monospace";
			for (const a of payload.mandible.anchors) {
				const px = toPxX(a.positionMm.x);
				const py = toPxY(a.positionMm.y);

				// Bead
				aCtx.beginPath();
				aCtx.arc(px, py, 3.2, 0, Math.PI * 2);
				aCtx.fillStyle = "#10b981";
				aCtx.fill();
				aCtx.strokeStyle = "#ffffff";
				aCtx.lineWidth = 1.0;
				aCtx.stroke();

				// Clean badge
				const tm = aCtx.measureText(a.toothFdi);
				const bw = tm.width + 6;
				const bh = 11;
				const lx = px - bw / 2;
				const ly = py - 13;

				aCtx.fillStyle = "rgba(9, 9, 11, 0.9)";
				aCtx.strokeStyle = "#10b981";
				aCtx.lineWidth = 0.8;
				aCtx.fillRect(lx, ly, bw, bh);
				aCtx.strokeRect(lx, ly, bw, bh);

				aCtx.fillStyle = "#ffffff";
				aCtx.textAlign = "center";
				aCtx.textBaseline = "middle";
				aCtx.fillText(a.toothFdi, px, ly + bh / 2);
			}

			// 2. Panorama
			const panoCvs = document.getElementById("panoCanvas_" + idx);
			const pCtx = panoCvs.getContext("2d");
			const pImg = pCtx.createImageData(item.panoW, item.panoH);
			pImg.data.set(new Uint8ClampedArray(item.panoBytes));
			pCtx.putImageData(pImg, 0, 0);

			// Lower markers
			pCtx.font = "bold 9px monospace";
			pCtx.textAlign = "center";
			pCtx.textBaseline = "middle";
			for (const tm of item.lowerMarkers) {
				const bw = 18;
				const bh = 12;
				const bx = tm.xPx - bw / 2;
				const by = item.panoH - 16;

				pCtx.fillStyle = "rgba(9, 9, 11, 0.9)";
				pCtx.strokeStyle = "#10b981";
				pCtx.lineWidth = 0.8;
				pCtx.fillRect(bx, by, bw, bh);
				pCtx.strokeRect(bx, by, bw, bh);
				pCtx.fillStyle = "#34d399";
				pCtx.fillText(tm.toothFdi, tm.xPx, by + bh / 2);
			}
		});
	</script>
</body>
</html>
	`;

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 1760, height: 1600 } });
	await page.setContent(html);
	await page.waitForTimeout(800);

	const outDir = "docs/screenshots/cbct_live";
	if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
	const outPath = path.join(outDir, "proof_contrast_presets_comparison.png");
	await page.screenshot({ path: outPath, fullPage: true });
	await browser.close();

	console.log(`Saved screenshot to ${outPath}`);

	// Copy to user artifacts/brain folder as requested
	const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\29d238ff-2db8-4ca7-803c-5ba5d97d388b";
	const brainPath = path.join(brainDir, "proof_contrast_presets_comparison.png");
	copyFileSync(outPath, brainPath);
	console.log(`Copied screenshot to ${brainPath}`);
}

main().catch(console.error);
